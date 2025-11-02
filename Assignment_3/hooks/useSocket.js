// hooks/useSocket.js
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function useSocket(username) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!username) return;

    // ✅ Connect to Socket.IO server
    const socket = io({
      path: "/api/socket_io", // ✅ must match server path
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to Socket.IO:", socket.id);
      setIsConnected(true);
      // ✅ Join private room
      socket.emit("join_room", { username });
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from Socket.IO");
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [username]);

  // ✅ Emit message
  const sendMessage = (data) => {
    if (!socketRef.current) return;
    socketRef.current.emit("send_message", data);
  };

  // ✅ Subscribe to incoming messages
  const onMessage = (callback) => {
    if (!socketRef.current) return;
    socketRef.current.on("receive_message", callback);
  };

  // ✅ Unsubscribe (cleanup)
  const offMessage = (callback) => {
    if (!socketRef.current) return;
    socketRef.current.off("receive_message", callback);
  };

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    onMessage,
    offMessage,
  };
}
