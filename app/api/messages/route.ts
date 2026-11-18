import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";
import { auth } from "../../auth";
import crypto from "crypto";

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "12345678901234567890123456789012";

// Fungsi untuk Enkripsi pesan sebelum disimpan ke database
function encrypt(text: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

// Fungsi untuk Dekripsi pesan dari database agar bisa dibaca di UI
function decrypt(text: string) {
  try {
    const textParts = text.split(":");
    if (textParts.length < 2) return text; // Jika bukan format terenkripsi, kembalikan apa adanya
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
    // Jika gagal dekripsi (misal teks lama sebelum dienkripsi), kembalikan teks asli
    return text;
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return NextResponse.json({ error: "roomId wajib diisi" }, { status: 400 });
  }

  const messages = await prisma.message.findMany({
    where: { roomId },
    orderBy: { createdAt: "asc" },
  });

  // Dekripsi isi pesan dengan aman
  const decryptedMessages = messages.map((msg) => ({
    ...msg,
    content: decrypt(msg.content || ""),
  }));

  return NextResponse.json(decryptedMessages);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { roomId, senderId, content } = await req.json();

  if (!roomId) {
    return NextResponse.json({ error: "roomId wajib diisi" }, { status: 400 });
  }

  if (!senderId) {
    return NextResponse.json(
      { error: "senderId wajib diisi" },
      { status: 400 },
    );
  }

  if (!content) {
    return NextResponse.json({ error: "content wajib diisi" }, { status: 400 });
  }

  // Enkripsi isi pesan sebelum disimpan ke database
  const encryptedContent = encrypt(content);

  const message = await prisma.message.create({
    data: {
      roomId: roomId,
      senderId: senderId,
      content: encryptedContent,
    },
  });

  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
  });
  if (room) {
    await redis.del(`chat_history:${room.user1Id}`);
    await redis.del(`chat_history:${room.user2Id}`);
  }

  // Mengembalikan response dengan konten asli (teks bersih) agar state frontend langsung memperbarui UI dengan mulus
  return NextResponse.json({
    ...message,
    content: content,
  });
}
