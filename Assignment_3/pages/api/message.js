// pages/api/messages.js
import db from "../../lib/db";
import Message from "../../models/Message";
import User from "../../models/Users";

export default async function handler(req, res) {
  await db; // ensure MongoDB connection
  const { method } = req;

  switch (method) {
    /**
     * ✅ 1. SEND MESSAGE
     * POST /api/messages
     * body: { senderUsername, receiverUsername, text }
     */
    // ✅ SEND MESSAGE (Save to DB)
    case "POST": {
    try {
        const { senderUsername, receiverUsername, text } = req.body;

        if (!senderUsername || !receiverUsername || !text) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Find sender and receiver in DB
        const sender = await User.findOne({ username: senderUsername });
        const receiver = await User.findOne({ username: receiverUsername });

        if (!sender || !receiver) {
            return res.status(404).json({ message: "User not found" });
        }

        // Create and save message in MongoDB
        const newMessage = new Message({
            sender: sender._id,
            receiver: receiver._id,
            text,
        });

        await newMessage.save(); // 🔥 This is the DB save operation

        return res.status(201).json({
            message: "Message saved successfully",
            data: newMessage,
        });
        } catch (error) {
            console.error("Error saving message:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }


    /**
     * ✅ 2. FETCH CHAT HISTORY BETWEEN TWO USERS
     * GET /api/messages?user1=Alice&user2=Bob
     */
    case "GET": {
        try {
            const { user1, user2, recent } = req.query;

            // ✅ Return recent chat partners if `recent` param is passed
            if (recent && user1) {
            const user = await User.findOne({ username: user1 });
            if (!user) return res.status(404).json({ message: "User not found" });

            const recentMessages = await Message.find({
                $or: [{ sender: user._id }, { receiver: user._id }],
            })
                .populate("sender", "username")
                .populate("receiver", "username")
                .sort({ updatedAt: -1 });

            // Extract unique chat partners
            const partners = new Map();
            for (const msg of recentMessages) {
                const partner =
                msg.sender.username === user1 ? msg.receiver : msg.sender;
                if (!partners.has(partner.username)) {
                    partners.set(partner.username, partner);
                }
            }

            return res.status(200).json([...partners.values()]);
            }

            // ✅ Otherwise, normal chat history between two users
            if (!user1 || !user2) {
                return res.status(400).json({ message: "Missing user parameters" });
            }

            const userA = await User.findOne({ username: user1 });
            const userB = await User.findOne({ username: user2 });

            if (!userA || !userB) {
                return res.status(404).json({ message: "User not found" });
            }

            const messages = await Message.find({
            $or: [
                { sender: userA._id, receiver: userB._id },
                { sender: userB._id, receiver: userA._id },
            ],
            })
            .populate("sender", "username")
            .populate("receiver", "username")
            .sort({ createdAt: 1 });

            return res.status(200).json(messages);
        } catch (error) {
            console.error("Error fetching chat history:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }


    default:
      res.setHeader("Allow", ["POST", "GET"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
