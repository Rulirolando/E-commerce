import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const variationId = Number(id);
    const { productId, nama, harga, stok, warna, sizes, image } =
      await req.json();

    if (!variationId || !productId) {
      return NextResponse.json(
        { error: "variationId / productId tidak valid" },
        { status: 400 },
      );
    }

    await prisma.product.update({
      where: { id: Number(productId) },
      data: { nama },
    });

    await prisma.variation.update({
      where: { id: variationId },
      data: {
        harga,
        stok,
        warna,
      },
    });

    await prisma.size.deleteMany({
      where: { variationId },
    });

    if (Array.isArray(sizes)) {
      await prisma.size.createMany({
        data: sizes.map((s) => ({
          variationId,
          size: s,
        })),
      });
    }

    if (image) {
      await prisma.img.deleteMany({
        where: { variationId },
      });

      await prisma.img.create({
        data: {
          variationId,
          img: image,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("EDIT PRODUCT ERROR:", err);
    return NextResponse.json({ error: "Gagal update produk" }, { status: 500 });
  }
}
