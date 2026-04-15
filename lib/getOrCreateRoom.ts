import { prisma } from "@/lib/prisma";

export async function getOrCreateRoom(user1Id: string, user2Id: string) {
  const [u1, u2] = [user1Id, user2Id].sort();

  let room = await prisma.chatRoom.findFirst({
    where: {
      user1Id: u1,
      user2Id: u2,
    },
  });

  if (!room) {
    room = await prisma.chatRoom.create({
      data: {
        id: `${u1}_${u2}`,
        user1Id: u1,
        user2Id: u2,
      },
    });
  }

  return room;
}
