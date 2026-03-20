import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }, // Gunakan Promise
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        owner: { select: { username: true, id: true } },
        variations: { include: { images: true, sizes: true } },
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const variationId = Number(id);

    const result = await prisma.$transaction(async (tx) => {
      const variation = await tx.variation.findUnique({
        where: { id: variationId },
        select: { productId: true },
      });

      if (!variation) throw new Error("Variasi tidak ditemukan");

      await tx.cartItem.deleteMany({ where: { cartId: variationId } });

      await tx.variation.delete({
        where: { id: variationId },
      });

      const remainingVariations = await tx.variation.count({
        where: { productId: variation.productId },
      });

      if (remainingVariations === 0) {
        await tx.love.deleteMany({ where: { productId: variation.productId } });

        await tx.product.delete({
          where: { id: variation.productId },
        });
        return { message: "Variasi dan Produk dihapus karena variasi habis" };
      }

      return { message: "Variasi berhasil dihapus" };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("DELETE ERROR:", error);
    return NextResponse.json({ message: error }, { status: 500 });
  }
}
