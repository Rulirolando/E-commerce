import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
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

  return NextResponse.json(message);
}
