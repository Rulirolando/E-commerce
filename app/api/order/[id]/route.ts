import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// dapatkan semua orderan saya
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const orders = await prisma.order.findMany({
    where: { buyerId: id },
    include: {
      review: true,
      produk: {
        include: {
          images: true,
          product: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}
