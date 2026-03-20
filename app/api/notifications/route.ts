import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID diperlukan" },
        { status: 400 },
      );
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json(
      { error: "Gagal mengambil data" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID diperlukan" },
        { status: 400 },
      );
    }

    await prisma.notification.updateMany({
      where: {
        userId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ message: "Notifikasi diperbarui" });
  } catch {
    return NextResponse.json(
      { error: "Gagal memperbarui data" },
      { status: 500 },
    );
  }
}
