import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/app/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "Silakan login terlebih dahulu." },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { productId, orderId, rating, comment } = body;

    if (!productId || !orderId || !rating) {
      return NextResponse.json(
        { message: "Data ulasan tidak lengkap." },
        { status: 400 },
      );
    }

    // Cek apakah pesanan ini sudah pernah diulas sebelumnya menggunakan findFirst
    const existingReview = await prisma.review.findFirst({
      where: { orderId: Number(orderId) },
    });

    if (existingReview) {
      return NextResponse.json(
        { message: "Pesanan ini sudah pernah diulas." },
        { status: 400 },
      );
    }

    // Simpan review baru
    const newReview = await prisma.review.create({
      data: {
        userId,
        productId: Number(productId),
        orderId: Number(orderId),
        rating: Number(rating),
        comment: comment || "",
      },
    });

    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    console.error("DEBUG REVIEW ERROR:", error);
    return NextResponse.json(
      { message: "Gagal mengirim ulasan" },
      { status: 500 },
    );
  }
}
