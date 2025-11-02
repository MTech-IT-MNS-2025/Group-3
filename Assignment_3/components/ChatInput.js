import { useState } from "react";

export default function ChatInput({ onSend }) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessage("");
  };

  return (
    <div className="flex w-full p-2">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Type a message..."
        className="flex-1 border border-gray-300 rounded-lg p-2 mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-sm"
      />
      <button
        type="button"
        onClick={handleSend}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Send
      </button>
    </div>
  );
}
