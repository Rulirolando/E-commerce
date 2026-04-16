"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { socket } from "../../lib/socket";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "../../app/components/navbar";
import { IoSend } from "react-icons/io5";

function ChatContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const currentUser = session;
  const userId = session?.user?.id;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const bottomRef = useRef(null);

  const searchParams = useSearchParams();
  let roomId = searchParams.get("roomId") || "";
  console.log("Current roomId:", roomId);

  async function fetchHistory() {
    if (!userId) return;
    try {
      const res = await fetch(`/api/chat?userId=${userId}`);
      const data = await res.json();
      setChatHistory(data);
      setShowUserList(true);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (!userId) return;

    if (!roomId) {
      const history = async () => {
        if (!userId) return;
        try {
          const res = await fetch(`/api/chat?userId=${userId}`);
          const data = await res.json();
          setChatHistory(data);
          setShowUserList(true);
        } catch (err) {
          console.error(err);
        }
      };
      history();
    } else {
      socket.emit("join-room", roomId);

      const loadMessages = async () => {
        const res = await fetch(`/api/messages?roomId=${roomId}`);
        const data = await res.json();
        setMessages(data);
      };

      loadMessages();
    }
  }, [roomId, userId]);

  useEffect(() => {
    socket.on("newMessage", (msg, serverOffset) => {
      if (msg.roomId === roomId) {
        setMessages((prev) => [...prev, msg]);
        if (serverOffset) {
          socket.auth.serverOffset = serverOffset;
        }
      }
    });
    return () => socket.off("newMessage");
  }, [roomId]);

  useEffect(() => {
    if (roomId && !showUserList && bottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showUserList, roomId]);

  const sendMessage = async () => {
    if (!input.trim() || !roomId) return;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, senderId: userId, content: input }),
    });
    if (res.ok) {
      const data = await res.json();
      setInput("");
      socket.emit("sendMessage", { room: roomId, message: data });
    }
  };

  return (
    <>
      <Navbar className="fixed z-50 " currentUser={currentUser} />
      <div className="pt-20 h-full bg-blue-400 dark:bg-blue-900 dark:text-white transition-colors">
        <div className="flex flex-col h-full max-w-2xl mx-auto  shadow-lg  ">
          {/* HEADER */}
          <div className="w-full  font-bold flex items-center gap-3 sticky top-20 z-20 bg-blue-500 dark:bg-blue-950 p-4 border-blue-100 border-b">
            <button
              onClick={() => {
                router.push("/chat");
                fetchHistory();
              }}
              className={`p-2   rounded-full transition-colors ${showUserList ? "hidden" : "bg-gray-550 dark:bg-blue-900 hover:bg-blue-600 hover:dark:bg-blue-950"}`}
            >
              ←
            </button>
            <span className="truncate">
              {showUserList ? "Semua Pesan" : `Chat Room: ${roomId}`}
            </span>
          </div>

          <div className="min-h-screen flex-1 relative bg-blue-600 dark:bg-blue-950 transition-colors ">
            {showUserList ? (
              <div className="absolute inset-0 bg-blue-200 dark:bg-blue-950 z-10  ">
                {chatHistory.length > 0 ? (
                  chatHistory.map((chat) => (
                    <div
                      key={chat.roomId}
                      onClick={() => {
                        router.push(
                          `/chat?roomId=${encodeURIComponent(chat.roomId)}`,
                        );
                        setShowUserList(false);
                      }}
                      className="flex items-center p-4 m-2 border-blue-100 rounded-2xl hover:bg-blue-100  hover:dark:bg-blue-900 cursor-pointer transition"
                    >
                      <div className="w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-lg mr-4 shadow-sm">
                        {chat.otherUser?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <p className="font-bold text-gray-900 dark:text-white truncate">
                            {chat.otherUser}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-white truncate">
                          {chat.lastMessage}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center mt-10 text-gray-400">
                    Belum ada percakapan.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 flex flex-col w-full">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex mb-4 w-full ${msg.senderId === userId ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`px-4 py-2 rounded-2xl max-w-[75%] shadow-sm wrap-break-word md:max-w-[48%] w-fit ${
                        msg.senderId === userId
                          ? "bg-indigo-500 text-white rounded-tr-none "
                          : "bg-indigo-500 text-white border rounded-tl-none"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <span className="text-[10px] opacity-70 block text-right mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}

                <div ref={bottomRef}></div>
              </div>
            )}
          </div>

          {!showUserList && (
            <div className="p-4 bg-blue-500 dark:bg-blue-950 border-t flex gap-2  transition-colors sticky bottom-0 w-full max-w-2xl mx-auto">
              <input
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition bg-blue-600 text-white dark:bg-blue-900"
                placeholder="Ketik pesan..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center transition shadow-md"
              >
                <IoSend />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-blue-400">
          Loading Chat...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
