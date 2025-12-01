import db from "../../lib/db";
import Session from "../../models/Session";

export default async function handler(req, res) {
  try {
    await db();
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    return res.status(500).json({ message: "Database connection failed" });
  }

  const { method } = req;

  if (method === "POST") {
    try {
      const payload = req.body;
      if (!payload?.sessionId || !payload?.participants || !payload?.enc) {
        return res.status(400).json({ message: "Missing fields" });
      }

      const update = {
        participants: payload.participants,
        enc: payload.enc,
        keyVersion: payload.keyVersion || 1,
      };

      const s = await Session.findOneAndUpdate(
        { sessionId: payload.sessionId },
        update,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.log(`[api/session] upsert session ${payload.sessionId}`);
      return res.status(201).json({ ok: true, session: s });
    } catch (err) {
      console.error("POST /api/session error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  if (method === "GET") {
    try {
      const { sessionId } = req.query;
      if (!sessionId) return res.status(400).json({ message: "sessionId required" });

      const s = await Session.findOne({ sessionId }).lean();
      if (!s) return res.status(404).json({ message: "Session not found" });

      return res.status(200).json(s);
    } catch (err) {
      console.error("GET /api/session error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${method} Not Allowed`);
}