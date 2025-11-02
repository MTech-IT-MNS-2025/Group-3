export default function MessageBubble({ text, from }) {
  const isMe = from === "me";
  return (
    <div
      className={`p-2 my-1 max-w-xs rounded-lg break-word ${
        isMe ? "bg-blue-500 text-white self-start" : "bg-gray-300 text-black self-start wrap-break-word"
      }`}
    >
      {text}
    </div>
  );
}
