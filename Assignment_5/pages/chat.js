// pages/chat.js
import { useState, useEffect, useRef } from "react";
import { FaEllipsisV } from "react-icons/fa";
import UserList from "../components/UserList";
import MessageBubble from "../components/MessageBubble";
import ChatInput from "../components/ChatInput";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import useSocket from "../hooks/useSocket";
import useSessionManager from "../hooks/useSessionManager";
import useCrypto from "../hooks/useCrypto";

export default function Chat() {
  const [username, setUsername] = useState("");
  const [derivedKey, setDerivedKey] = useState(""); // hex string used to encrypt local SK
  const [allUsers, setAllUsers] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const router = useRouter();
  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const dropdownRef = useRef(null);

  // -------------------------
  // Crypto: IMPORTANT
  // Call hook at top-level (React rules). Provide username and derivedKey once available.
  // derivedKey must be the same hex used at registration to encrypt the private key locally.
  // -------------------------
  const {
    isReady: cryptoReady,
    generateIdentity,
    loadIdentity,
    createSession,
    decryptSession,
  } = useCrypto(username || "", derivedKey || "");

  // Session manager uses the same useCrypto internals (createSession/decryptSession)
  const {
    createAndUploadSession,
    ensureMasterKey,
    encryptMessagePayload,
    decryptMessagePayload,
    startRotation,
    stopRotation,
  } = useSessionManager({ username });

  const {
    socket,
    onMessageNew,
    onUsersChanged,
    onPresenceChange,
    onTypingStart,
    onTypingStop,
    onMessagesSeen,
    onConnected,
  } = useSocket(username);

  // 🧠 Load logged-in user and derive deterministic key (SHA-256 hex of username)
  useEffect(() => {
    const init = async () => {
      const stored = sessionStorage.getItem("username");
      if (!stored) {
        toast.error("Please login first");
        router.replace("/");
        return;
      }
      setUsername(stored);

      // derive deterministic key from username (must match registration)
      try {
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(stored);
        const hashBuffer = await crypto.subtle.digest("SHA-256", encodedData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        setDerivedKey(hashHex);
      } catch (err) {
        console.error("Failed to derive local key:", err);
      }
    };

    init();
  }, [router]);

  // Once derivedKey and wasm are ready, load local secret key into WASM (so decapsulation works)
  useEffect(() => {
    if (!username || !derivedKey) return;
    if (!cryptoReady) return;

    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadIdentity(derivedKey); // uses the derivedKey passed to the hook
        if (loaded) {
          console.log("[chat] loadIdentity succeeded — secret key loaded into WASM");
        } else {
          console.warn("[chat] loadIdentity returned false — secret key missing or wrong local key");
        }
      } catch (err) {
        console.error("[chat] loadIdentity error:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username, derivedKey, cryptoReady, loadIdentity]);

  const scrollToBottom = (smooth = true) =>
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });

  const movePartnerToTop = (partnerUsername) => {
    setRecentUsers((prev) => {
      const uname = partnerUsername?.username || partnerUsername;
      if (!uname) return prev;
      const existing =
        prev.find((u) => u.username === uname) || { username: uname };
      const filtered = prev.filter((u) => u.username !== uname);
      return [existing, ...filtered];
    });
  };

  // 🧩 Fetch all users
  const fetchAllUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setAllUsers(await res.json());
    } catch (err) {
      console.error("fetchAllUsers error:", err);
    }
  };

  // 🧩 Fetch recent chat users
  const fetchRecentUsers = async () => {
    if (!username) return;
    try {
      const res = await fetch(
        `/api/message?user1=${encodeURIComponent(username)}&recent=true`
      );
      if (res.ok) setRecentUsers(await res.json());
    } catch (err) {
      console.error("fetchRecentUsers error:", err);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (username) fetchRecentUsers();
  }, [username]);

  // 🟢 SOCKET LISTENERS
  useEffect(() => {
    if (!socket || !username) return;

    onUsersChanged(fetchAllUsers);

    onConnected(() => {
      fetchAllUsers();
      fetchRecentUsers();
    });

    onPresenceChange(({ username: u, socketId, status }) => {
      setAllUsers((prev) =>
        prev.map((x) =>
          x.username === u
            ? { ...x, online: status === "online", socketId }
            : x
        )
      );
      setRecentUsers((prev) =>
        prev.map((x) =>
          x.username === u
            ? { ...x, online: status === "online", socketId }
            : x
        )
      );
      setSelectedUser((prev) =>
        prev && prev.username === u
          ? { ...prev, online: status === "online", socketId }
          : prev
      );
    });

    onMessageNew(async (msg) => {
      if (msg.sender !== username && msg.receiver !== username) return;

      const partner = msg.sender === username ? msg.receiver : msg.sender;
      movePartnerToTop(partner);

      if (msg.ciphertext && msg.sessionId) {
        const plain = await decryptMessagePayload(msg).catch((e) => {
          console.warn("decrypt on arrival failed:", e);
          return null;
        });

        if (selectedUser && partner === selectedUser.username) {
          setMessages((prev) => [
            ...prev,
            {
              sender: { username: msg.sender },
              receiver: { username: msg.receiver },
              text: plain || "🔒 Encrypted message",
              createdAt: msg.createdAt || new Date().toISOString(),
              seen: true,
            },
          ]);

          socket?.emit("messages:seen", {
            from: msg.sender,
            by: username,
          });

          fetch("/api/messages/mark-seen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user1: username,
              user2: msg.sender,
            }),
          }).catch(console.error);

          setTimeout(() => scrollToBottom(true), 30);
        } else {
          setRecentUsers((prev) =>
            prev.map((u) =>
              u.username === partner ? { ...u, unseen: (u.unseen || 0) + 1 } : u
            )
          );
        }
      } else {
        if (selectedUser && partner === selectedUser.username) {
          setMessages((prev) => [
            ...prev,
            {
              sender: { username: msg.sender },
              receiver: { username: msg.receiver },
              text: msg.text || "",
              createdAt: msg.createdAt || new Date().toISOString(),
              seen: true,
            },
          ]);
        }
      }
    });

    let typingTimeout;
    onTypingStart(({ from }) => {
      if (from !== username) {
        setTypingUser(from);
        clearTimeout(typingTimeout);
      }
    });
    onTypingStop(({ from }) => {
      if (from !== username) {
        typingTimeout = setTimeout(() => setTypingUser(null), 500);
      }
    });

    onMessagesSeen(({ from }) => {
      if (from === selectedUser?.username) {
        setMessages((prev) => prev.map((m) => ({ ...m, seen: true })));
      }
    });

    return () => clearTimeout(typingTimeout);
  }, [socket, username, selectedUser, decryptMessagePayload]);

  // 🗨️ Fetch chat history
  const fetchChatHistory = async (partner) => {
    if (!username || !partner) return;
    setLoadingMessages(true);
    setMessages([]);
    try {
      const res = await fetch(
        `/api/message?user1=${encodeURIComponent(
          username
        )}&user2=${encodeURIComponent(partner.username)}`
      );
      const data = res.ok ? await res.json() : [];
      const decrypted = await Promise.all(
        data.map(async (msg) => {
          if (msg.ciphertext && msg.sessionId) {
            try {
              const plain = await decryptMessagePayload(msg);
              return {
                sender: { username: msg.sender.username },
                receiver: { username: msg.receiver.username },
                text: plain || "🔒 Encrypted message",
                createdAt: msg.createdAt,
                seen: msg.seen,
              };
            } catch (err) {
              console.warn("decrypt history failed", err);
              return {
                sender: { username: msg.sender.username },
                receiver: { username: msg.receiver.username },
                text: "🔒 Encrypted message",
                createdAt: msg.createdAt,
                seen: msg.seen,
              };
            }
          } else {
            return {
              sender: { username: msg.sender.username },
              receiver: { username: msg.receiver.username },
              text: msg.text || "",
              createdAt: msg.createdAt,
              seen: msg.seen,
            };
          }
        })
      );

      setMessages(decrypted || []);

      await fetch("/api/messages/mark-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user1: username,
          user2: partner.username,
        }),
      });

      setTimeout(() => scrollToBottom(false), 40);
    } catch (err) {
      console.error("fetchChatHistory error:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // When selecting a chat user
  const handleSelectUser = async (user) => {
    if (!user) return;
    setSelectedUser(user);
    setTypingUser(null);

    setRecentUsers((prev) =>
      prev.map((u) => (u.username === user.username ? { ...u, unseen: 0 } : u))
    );

    try {
      await fetch("/api/messages/mark-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user1: username,
          user2: user.username,
        }),
      });

      socket?.emit("messages:seen", {
        from: user.username,
        by: username,
      });
    } catch (err) {
      console.error("mark-seen failed:", err);
    }

    // Ensure a session exists for this pair; if not, create it
    const sessionId = `${username}:${user.username}`;
    try {
      const mk = await ensureMasterKey(sessionId).catch(() => null);
      if (!mk) {
        await createAndUploadSession({ sessionId, participants: [username, user.username], keyVersion: 1 });
        startRotation(sessionId, [username, user.username], 300000);
      }
    } catch (e) {
      console.warn("session init error:", e);
    }

    await fetchChatHistory(user);
  };

  // 📨 Send Message
  const handleSend = async (text) => {
    if (!selectedUser || !text?.trim()) return;
    const trimmed = text.trim();

    setMessages((prev) => [
      ...prev,
      {
        sender: { username },
        receiver: { username: selectedUser.username },
        text: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);
    movePartnerToTop(selectedUser.username);
    scrollToBottom(true);

    try {
      const sessionId = `${username}:${selectedUser.username}`;
      const messageIndex = Date.now();
      const payload = await encryptMessagePayload({
        sessionId,
        keyVersion: 1,
        messageIndex,
        plaintext: trimmed,
        participants: [username, selectedUser.username], // important for auto-creation if missing
      });

      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderUsername: username,
          receiverUsername: selectedUser.username,
          sessionId: payload.sessionId,
          messageIndex: payload.messageIndex,
          keyVersion: payload.keyVersion,
          iv: payload.iv,
          ciphertext: payload.ciphertext,
        }),
      });
      if (!res.ok) console.error("POST /api/message failed:", res.status);
    } catch (err) {
      console.error("handleSend error:", err);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => scrollToBottom(true), 40);
    return () => clearTimeout(t);
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <UserList
        users={recentUsers}
        allUsers={allUsers}
        username={username}
        activeUser={selectedUser}
        typingUser={typingUser}
        onSelectUser={handleSelectUser}
      />

      <div className="flex-1 flex flex-col bg-gray-100 h-full overflow-hidden">
        {selectedUser ? (
          <>
            <div className="flex-none flex justify-between items-center px-4 py-4 border-b border-gray-300 bg-gray-300">
              <h2 className="font-bold text-xl text-gray-700 flex items-center gap-2">
                {selectedUser.username}
                {selectedUser.online && (
                  <span className="text-green-500 text-sm">●</span>
                )}
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
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
                    >
                      Close Chat
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 flex flex-col space-y-2"
              >
                {loadingMessages ? (
                  <div className="text-center text-gray-500 mt-10">
                    Loading chat...
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg, i) => (
                    <MessageBubble
                      key={i}
                      text={msg.text}
                      from={
                        msg.sender?.username === username ? "me" : msg.sender?.username
                      }
                      createdAt={msg.createdAt}
                      seen={msg.seen}
                    />
                  ))
                ) : (
                  <div className="text-center text-gray-500 mt-10">
                    No messages yet. Start chatting!
                  </div>
                )}

                {typingUser === selectedUser?.username && (
                  <div className="text-gray-400 text-sm italic ml-2">
                    {selectedUser.username} is typing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex-none px-4 py-2 border-t bg-white border-gray-300">
                <ChatInput
                  onSend={handleSend}
                  onTypingStart={() =>
                    socket?.emit("typing:start", {
                      to: selectedUser.username,
                      from: username,
                    })
                  }
                  onTypingStop={() =>
                    socket?.emit("typing:stop", {
                      to: selectedUser.username,
                      from: username,
                    })
                  }
                />
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
