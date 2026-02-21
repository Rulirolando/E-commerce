import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }, // Gunakan Promise
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findMany({
      where: { ownerId: id },
      include: {
        owner: { select: { username: true, id: true } },
        variations: {
          include: {
            images: true,
            sizes: { select: { size: true, variationId: true } },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(product, { status: 200 });
  } catch (err) {
    console.error("Prisma Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil produk" },
      { status: 500 },
    );
  }
}
