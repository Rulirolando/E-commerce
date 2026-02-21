import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
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
  const { id } = await params;

  try {
    const idNumber = Number(id);

    await prisma.img.deleteMany({
      where: { variationId: idNumber },
    });
    await prisma.size.deleteMany({
      where: { variationId: idNumber },
    });
    await prisma.cartItem.deleteMany({
      where: { variantId: idNumber },
    });
    await prisma.order.deleteMany({
      where: { produkId: idNumber },
    });

    const deleted = await prisma.variation.delete({
      where: {
        id: Number(id),
      },
    });

    if (deleted) {
      return NextResponse.json(
        { message: "Produk berhasil dihapus" },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus produk" },
      { status: 500 },
    );
  }
}
