import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";
import { auth } from "../../auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { userId, productId } = body;
    if (!userId || !productId || session?.user?.id !== userId) {
      return NextResponse.json(
        { message: "Data tidak lengkap" },
        { status: 400 },
      );
    }

    const lovedExited = await prisma.love.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
    if (lovedExited) {
      await prisma.love.delete({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });
    } else {
      await prisma.love.create({
        data: {
          userId,
          productId,
          status: true,
        },
      });
    }

    const keys = await redis.keys("ecom:search:*");
    if (keys.length > 0) {
      await redis.del(...keys);
      // console.log(`Cache dibersihkan: ${keys.length} key dihapus`);
    }

    await redis.del(`ecom:fav:${userId}`);

    return NextResponse.json({
      message: "Love ditambahkan",
      loves: true,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memproses suka", error },
      { status: 500 },
    );
  }
}
