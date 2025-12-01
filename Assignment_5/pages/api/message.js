import db from "../../lib/db";
import Message from "../../models/Message";
import User from "../../models/Users";
import { getIO, getSocketIdByUsername, getPresenceSnapshot } from "../../lib/socket";

export default async function handler(req, res) {
  await db();
  const { method } = req;

  switch (method) {
    case "POST": {
      try {
        // Expect encrypted message payload (hybrid: session + encrypted message)
        const {
          senderUsername,
          receiverUsername,
          sessionId,
          messageIndex,
          keyVersion,
          iv,
          ciphertext,
          text,
        } = req.body;

        if (!senderUsername || !receiverUsername || (!ciphertext && !text)) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        const [sender, receiver] = await Promise.all([
          User.findOne({ username: senderUsername }),
          User.findOne({ username: receiverUsername }),
        ]);

        if (!sender || !receiver) {
          return res.status(404).json({ message: "User not found" });
        }

        const newMessage = await Message.create({
          sender: sender._id,
          receiver: receiver._id,
          text: text?.trim() || "",
          sessionId: sessionId || null,
          messageIndex: messageIndex || Date.now(),
          keyVersion: keyVersion || 1,
          iv: iv || null,
          ciphertext: ciphertext || null,
          seen: false,
        });

        const populated = await Message.findById(newMessage._id)
          .populate("sender", "username")
          .populate("receiver", "username")
          .lean();

        try {
          const io = getIO();
          const receiverSid = getSocketIdByUsername(receiverUsername);

          const payload = {
            id: populated._id.toString(),
            sender: populated.sender.username,
            receiver: populated.receiver.username,
            sessionId: populated.sessionId,
            messageIndex: populated.messageIndex,
            keyVersion: populated.keyVersion,
            iv: populated.iv,
            ciphertext: populated.ciphertext,
            text: populated.text,
            createdAt: populated.createdAt,
            seen: populated.seen,
          };

          if (receiverSid) {
            io.to(receiverSid).emit("message:new", payload);
          }
        } catch (err) {
          console.warn("⚠️ Socket.IO emit skipped:", err.message);
        }

        return res.status(201).json({
          message: "Message stored",
          data: populated,
        });
      } catch (error) {
        console.error("Error saving message:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }

    case "GET": {
      try {
        const { user1, user2, recent } = req.query;

        if (recent && user1) {
          const user = await User.findOne({ username: user1 });
          if (!user) return res.status(404).json({ message: "User not found" });

          const recentMessages = await Message.find({
            $or: [{ sender: user._id }, { receiver: user._id }],
          })
            .populate("sender", "username")
            .populate("receiver", "username")
            .sort({ updatedAt: -1 })
            .lean();

          const partners = new Map();
          for (const msg of recentMessages) {
            const partner = msg.sender.username === user1 ? msg.receiver : msg.sender;
            if (!partners.has(partner.username)) {
              partners.set(partner.username, partner);
            }
          }

          const unseenCounts = await Message.aggregate([
            { $match: { receiver: user._id, seen: false } },
            { $group: { _id: "$sender", count: { $sum: 1 } } },
          ]);

          const countMap = new Map(unseenCounts.map((c) => [String(c._id), c.count]));

          const presence = getPresenceSnapshot();

          const partnerList = await Promise.all(
            Array.from(partners.entries()).map(async ([uname, partner]) => {
              const partnerUser = await User.findOne({ username: uname }).lean();
              return {
                username: uname,
                unseen: countMap.get(String(partnerUser?._id)) || 0,
                online: !!presence[uname],
                socketId: presence[uname] || null,
              };
            })
          );
          return res.status(200).json(partnerList);
        }

        if (!user1 || !user2) {
          return res.status(400).json({ message: "Missing user parameters" });
        }

        const [userA, userB] = await Promise.all([
          User.findOne({ username: user1 }),
          User.findOne({ username: user2 }),
        ]);

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
          .sort({ createdAt: 1 })
          .lean();

        const unseenUpdate = await Message.updateMany(
          { sender: userB._id, receiver: userA._id, seen: false },
          { $set: { seen: true } }
        );

        if (unseenUpdate.modifiedCount > 0) {
          try {
            const io = getIO();
            const senderSid = getSocketIdByUsername(user2);
            if (senderSid) {
              io.to(senderSid).emit("messages:seen", {
                from: user1,
                by: user1,
              });
            }
          } catch (err) {
            console.warn("⚠️ Socket.IO emit skipped:", err.message);
          }
        }

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
