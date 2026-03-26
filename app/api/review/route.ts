import { prisma } from "@/lib/prisma"; // sesuaikan path prisma client anda
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, productId, orderId, rating, comment } = body;
    console.log("Data masuk ke API:", { userId, productId, orderId, rating });
    // Simpan review
    const newReview = await prisma.review.create({
      data: {
        userId,
        productId: Number(productId),
        orderId: Number(orderId),
        rating: Number(rating),
        comment,
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
