"use client";

import { useRouter } from "next/navigation";
import { LuMessageSquareMore } from "react-icons/lu";

export default function ChatButton({
  sellerId,
  userId,
}: {
  sellerId: string;
  userId: string;
}) {
  const router = useRouter();
  const myId = userId;

  const handleChatPenjual = async () => {
    if (!myId) return alert("Silakan login terlebih dahulu");
    if (myId === sellerId) return alert("Ini produk Anda sendiri");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user1Id: myId,
          user2Id: sellerId,
        }),
      });

      const room = await res.json();
      if (room.id) {
        router.push(`/chat?roomId=${encodeURIComponent(room.id)}`);
      }
    } catch {
      alert("Gagal memulai chat");
    }
  };

  return (
    <button
      onClick={handleChatPenjual}
      // Tambahkan class Tailwind di bawah ini
      className="mt-4 ml-4 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors duration-200 cursor-pointer flex items-center gap-2"
    >
      <LuMessageSquareMore />
      Chat Penjual
    </button>
  );
}
