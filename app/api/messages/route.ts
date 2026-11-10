import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";
import { auth } from "../../auth";

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

  return NextResponse.json(messages);
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

  const message = await prisma.message.create({
    data: {
      roomId: roomId,
      senderId: senderId,
      content: content,
    },
  });
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
  });
  if (room) {
    await redis.del(`chat_history:${room.user1Id}`);
    await redis.del(`chat_history:${room.user2Id}`);
    // console.log("Cache dihapus karena ada pesan baru");
  }

  return NextResponse.json(message);
}
