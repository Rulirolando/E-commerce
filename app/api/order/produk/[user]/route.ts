import { NextResponse } from "next/server";
import { auth } from "./../../../../auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ user: string }> },
) {
  try {
    const session = await auth();
    const { user } = await params;

    // Pastikan pengguna sudah login
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Kamu harus login terlebih dahulu." },
        { status: 401 },
      );
    }

    // Pengguna hanya boleh melihat pesanan miliknya sendiri
    if (session.user.id !== user) {
      return NextResponse.json(
        { error: "Kamu tidak memiliki akses ke data ini." },
        { status: 403 },
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        produk: {
          product: {
            ownerId: user,
          },
        },
      },
      include: {
        produk: {
          include: {
            images: true,
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Gagal mengambil pesanan produk:", error);

    return NextResponse.json(
      { error: "Gagal mengambil data pesanan." },
      { status: 500 },
    );
  }
}
