// lib/socket.js
import { Server } from "socket.io";

let io; // Singleton instance

export const initSocket = (server) => {
  if (io) {
    console.log("🔁 Socket.io server already running");
    return io;
  }

  console.log("🚀 Initializing new Socket.io server...");

  io = new Server(server, {
    path: "/api/socket_io", // ✅ consistent path
    cors: {
      origin: "*", // you can restrict to specific origin later
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 New client connected:", socket.id);

    // ✅ User joins their private room
    socket.on("join_room", ({ username }) => {
      if (username) {
        socket.join(username);
        console.log(`👤 ${username} joined their private room`);
      }
    });

    // ✅ Handle message sending
    socket.on("send_message", (msgData) => {
      const { sender, receiver, text } = msgData;
      console.log(`📩 ${sender} → ${receiver}: ${text}`);

      // Emit to receiver's room only
      io.to(receiver).emit("receive_message", msgData);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Client disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized yet!");
  return io;
};
