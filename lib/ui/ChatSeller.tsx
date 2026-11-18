"use client";
import { useRouter } from "next/navigation";

interface ProductInfo {
  productId: string | number;
  nama: string;
  harga: number;
  warna: string;
  ukuran: string;
  gambar: string;
}

interface ChatSellerProps {
  sellerId: string;
  userId?: string;
  productInfo?: ProductInfo;
}

export default function ChatSeller({
  sellerId,
  userId,
  productInfo,
}: ChatSellerProps) {
  const router = useRouter();

  const handleChat = async () => {
    if (!userId) {
      alert("Silakan login terlebih dahulu.");
      return;
    }
    if (userId === sellerId) {
      alert("Anda tidak bisa chat dengan diri sendiri.");
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user1Id: userId, user2Id: sellerId }),
      });
      const room = await res.json();
      if (room && room.id) {
        // Jika membawa info produk, kirimkan pesan otomatis ke chat
        if (productInfo && productInfo.warna && productInfo.ukuran) {
          const messageContent = `[PRODUK_CARD]${JSON.stringify(productInfo)}`;
          await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomId: room.id,
              senderId: userId,
              content: messageContent,
            }),
          });
        }
        router.push(`/chat?roomId=${room.id}`);
      }
    } catch (err) {
      console.error("Gagal membuka chat:", err);
    }
  };

  return (
    <button
      onClick={handleChat}
      className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors duration-200 cursor-pointer shadow"
    >
      Chat Penjual
    </button>
  );
}
