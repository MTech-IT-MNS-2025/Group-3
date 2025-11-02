// pages/chat.js
import { useState, useEffect, useRef } from "react";
import { FaEllipsisV } from "react-icons/fa";
import UserList from "../components/UserList";
import MessageBubble from "../components/MessageBubble";
import ChatInput from "../components/ChatInput";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import useSocket from "../hooks/useSocket";

export default function Chat() {
  const [username, setUsername] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const router = useRouter();
  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const dropdownRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // socket hook
  const { sendMessage, onMessage, offMessage, isConnected } = useSocket(username);

  // load logged-in user
  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) setUsername(stored);
    else {
      toast.error("Please Login");
      router.replace("/");
    }
  }, []);

  // fetch all users for search
  useEffect(() => {
    let intervalId;
    const fetchAll = async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setAllUsers(data || []);
        }
      } catch (err) {
        console.error("fetchAllUsers error:", err);
      }
    };
    fetchAll();

    // refresh every 10 seconds
    intervalId = setInterval(fetchAll, 5000);

    // cleanup on unmount
    return () => clearInterval(intervalId);
}, []);

  // fetch recent users (those with chat history)
  const fetchRecentUsers = async () => {
    if (!username) return;
    try {
      const url = `/api/message?user1=${encodeURIComponent(username)}&recent=true`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecentUsers(data || []);
      }
    } catch (err) {
      console.error("fetchRecentUsers error:", err);
    }
  };

  useEffect(() => {
    fetchRecentUsers();
  }, [username]);

  // unified function to reorder a partner to the top of recentUsers
  const movePartnerToTop = (partnerUsername) => {
    setRecentUsers((prev) => {
      // partner may be an object with username or string
      const uname = partnerUsername?.username || partnerUsername;
      if (!uname) return prev;
      const existing = prev.find((u) => u.username === uname);
      const filtered = prev.filter((u) => u.username !== uname);
      if (existing) return [existing, ...filtered];
      // If not present, insert at top as minimal object
      return [{ username: uname }, ...prev];
    });
  };

  // scroll helper: try scrollIntoView for messagesEndRef (more reliable)
  const scrollToBottom = (smooth = true) => {
    // Prefer scrollIntoView on the sentinel because it is robust after React render
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
      return;
    }
    // fallback to container scroll
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  // fetch chat history between logged-in user and partner
  const fetchChatHistory = async (partner) => {
    if (!username || !partner) return;
    setLoadingMessages(true);
    setMessages([]); // clear while loading
    try {
      const url = `/api/message?user1=${encodeURIComponent(username)}&user2=${encodeURIComponent(
        partner.username
      )}`;
      const res = await fetch(url);
      if (!res.ok) {
        setMessages([]);
        return;
      }
      const data = await res.json();
      setMessages(data || []);
      // after render
      setTimeout(() => scrollToBottom(false), 50);
    } catch (err) {
      console.error("fetchChatHistory error:", err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // when user selects someone
  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    await fetchChatHistory(user);
    // start polling for the currently selected chat
    startPolling(user);
  };

  // stop polling
  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // start polling for new messages in the current chat (fallback)
  const startPolling = (user) => {
    stopPolling();
    if (!user) return;
    // poll every 5 seconds (adjustable)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const url = `/api/message?user1=${encodeURIComponent(username)}&user2=${encodeURIComponent(
          user.username
        )}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        // If data length increased or differs, replace messages
        // (we do a simple replace to keep things deterministic)
        setMessages((prev) => {
          // quick equality by length + last text comparison
          const prevLast = prev[prev.length - 1]?.text;
          const newLast = data[data.length - 1]?.text;
          if (data.length !== prev.length || prevLast !== newLast) {
            // Maintain scroll position if user is at bottom? For simplicity we scroll to bottom
            setTimeout(() => scrollToBottom(true), 50);
            return data || [];
          }
          return prev;
        });
      } catch (err) {
        console.error("Polling fetch error:", err);
      }
    }, 5000);
  };

  // send message (DB + socket)
  const handleSend = async (text) => {
    if (!selectedUser || !text || !text.trim()) return;

    const trimmed = text.trim();

    // optimistic UI shape: mimic populated message with sender/receiver objects
    const optimisticMsg = {
      sender: { username },
      receiver: { username: selectedUser.username },
      text: trimmed,
      // createdAt will be absent until DB returns
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true);

    // move partner to top immediately
    movePartnerToTop(selectedUser.username);

    // save to DB
    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderUsername: username,
          receiverUsername: selectedUser.username,
          text: trimmed,
        }),
      });

      if (!res.ok) {
        console.error("POST /api/message failed", res.status);
        // optionally revert optimistic UI or mark failed
        return;
      }

      // Emit via socket for instant delivery
      sendMessage({
        sender: username,
        receiver: selectedUser.username,
        text: trimmed,
      });

      // Refresh recent users from backend to get canonical ordering (non-blocking)
      fetchRecentUsers();
    } catch (err) {
      console.error("handleSend error:", err);
    }
  };

  // handle incoming socket messages
  useEffect(() => {
    if (!username) return;

    const handleIncoming = (msgData) => {
      // msgData shape: { sender, receiver, text }
      // Only add messages that involve the logged-in user
      if (msgData.receiver === username || msgData.sender === username) {
        // If the incoming message belongs to current open chat, append it
        if (selectedUser && msgData.sender === selectedUser.username) {
          setMessages((prev) => [
            ...prev,
            { sender: { username: msgData.sender }, receiver: { username: msgData.receiver }, text: msgData.text },
          ]);
          // auto-scroll
          setTimeout(() => scrollToBottom(true), 50);
        }

        // Move partner to top of recent list (incoming or outgoing)
        const partner = msgData.sender === username ? msgData.receiver : msgData.sender;
        movePartnerToTop(partner);

        // refresh recent users metadata (non-blocking)
        fetchRecentUsers();
      }
    };

    onMessage(handleIncoming);
    return () => offMessage(handleIncoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, selectedUser]);

  // when selectedUser changes, restart polling
  useEffect(() => {
    stopPolling();
    if (selectedUser) startPolling(selectedUser);
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

  // close dropdown on outside click
  useEffect(() => {
    const clickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  // always keep chat scrolled when messages change (safe fallback)
  useEffect(() => {
    // tiny delay to let React render messages
    const t = setTimeout(() => scrollToBottom(true), 40);
    return () => clearTimeout(t);
  }, [messages]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* LEFT PANEL */}
      <UserList
        users={recentUsers}
        allUsers={allUsers}
        onSelectUser={handleSelectUser}
        username={username}
      />

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col bg-gray-100 h-full overflow-hidden">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="flex-none flex justify-between items-center px-4 py-4 border-b border-gray-300 bg-gray-300">
              <h2 className="font-bold text-xl text-gray-700">
                {selectedUser.username}{" "}
                {!isConnected && <span className="text-sm text-red-500">(offline)</span>}
              </h2>

              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setShowDropdown((s) => !s)}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <FaEllipsisV />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow-lg z-20">
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setMessages([]);
                        setShowDropdown(false);
                        stopPolling();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
                    >
                      Close Chat
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* MESSAGES AREA */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 flex flex-col space-y-2"
              >
                {loadingMessages ? (
                  <div className="text-center text-gray-500 mt-10">Loading chat...</div>
                ) : messages.length > 0 ? (
                  messages.map((msg, i) => (
                    <MessageBubble
                      key={i}
                      text={msg.text}
                      from={msg.sender?.username === username ? "me" : msg.sender?.username}
                    />
                  ))
                ) : (
                  <div className="text-center text-gray-500 mt-10">
                    No previous messages with {selectedUser.username}. Start chatting!
                  </div>
                )}

                {/* sentinel for scrollIntoView */}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT */}
              <div className="flex-none px-4 py-2 border-t border-gray-300 bg-gray-100">
                <ChatInput onSend={handleSend} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-lg">
            Select a user to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
