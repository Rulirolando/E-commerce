import { NextResponse } from "next/server";
import { getOrCreateRoom } from "@/lib/getOrCreateRoom";
import { prisma } from "@/lib/prisma";

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
      return {
        roomId: room.id,
        otherUser: otherUser.username,
        otherUserImg: otherUser.imgProfile,
        lastMessage: room.messages[0]?.content || "Belum ada pesan",
        updatedAt: room.messages[0]?.createdAt || room.createdAt,
      };
    });

    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
