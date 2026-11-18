import { NextResponse } from "next/server";
import { getOrCreateRoom } from "@/lib/getOrCreateRoom";
import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";
import crypto from "crypto";

// Mengambil kunci enkripsi dan memastikan tipenya selalu string dengan fallback
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "12345678901234567890123456789012";

// Fungsi untuk Dekripsi pesan dari database agar bisa dibaca di chat
function decrypt(text: string) {
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY),
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch {
    // Jika gagal dekripsi (misal teks biasa/bukan terenkripsi), kembalikan teks asli
    return text;
  }
}

export async function POST(req: Request) {
  const { user1Id, user2Id } = await req.json();
  const room = await getOrCreateRoom(user1Id, user2Id);
  return NextResponse.json(room);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cacheKey = `chat_history:${userId}`;

  // 1. Coba ambil dari Redis Cache
  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      const parsedData =
        typeof cachedData === "string" ? JSON.parse(cachedData) : cachedData;
      return NextResponse.json(parsedData);
    }
  } catch (err) {
    console.warn("Gagal membaca dari Redis, beralih ke Database:", err);
  }

  // 2. Fetch data dari Prisma Database
  try {
    const rooms = await prisma.chatRoom.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: { select: { id: true, username: true, imgProfile: true } },
        user2: { select: { id: true, username: true, imgProfile: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const history = rooms.map((room) => {
      const otherUser = room.user1Id === userId ? room.user2 : room.user1;
      const rawLastMessage = room.messages[0]?.content || "Belum ada pesan";

      // Dekripsi pesan terakhir agar tampil normal di daftar chat
      const decryptedLastMessage = decrypt(rawLastMessage);

      return {
        roomId: room.id,
        otherUserId: otherUser.id,
        otherUser: otherUser.username,
        otherUserImg: otherUser.imgProfile,
        lastMessage: decryptedLastMessage,
        updatedAt: room.messages[0]?.createdAt || room.createdAt,
      };
    });

    // 3. Simpan ke Redis Cache jika Redis tersedia
    try {
      if (typeof redis.set === "function") {
        await redis.set(cacheKey, JSON.stringify(history), "EX", 600);
      }
    } catch (cacheErr) {
      console.warn("Gagal menyimpan cache ke Redis:", cacheErr);
    }

    return NextResponse.json(history);
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
