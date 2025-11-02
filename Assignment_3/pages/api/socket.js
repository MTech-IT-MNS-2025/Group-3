// pages/api/socket.js
import { initSocket } from "../../lib/socket";

export const config = {
  api: {
    bodyParser: false, // ⛔ Required for Socket.IO
  },
};

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log("🌐 Initializing Socket.io API route...");
    const io = initSocket(res.socket.server);
    res.socket.server.io = io;
  } else {
    console.log("♻️ Socket.io API route already initialized.");
  }

  res.end();
}
