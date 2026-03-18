import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    await prisma.$transaction(async (tx) => {
      // 1. Update Tabel Product
      await tx.product.update({
        where: { id: Number(productId) },
        data: { nama },
      });

      // 2. Update Tabel Variation
      await tx.variation.update({
        where: { id: variationId },
        data: {
          harga: Number(harga),
          stok: Number(stok),
          warna,
        },
      });

      // 3. Update Sizes (Hapus lama, buat baru)
      await tx.size.deleteMany({ where: { variationId } });
      if (Array.isArray(sizes) && sizes.length > 0) {
        await tx.size.createMany({
          data: sizes.map((s) => ({
            variationId,
            size: s,
          })),
        });
      }

      // 4. Update Image (Jika ada upload baru)
      if (image) {
        await tx.img.deleteMany({ where: { variationId } });
        await tx.img.create({
          data: { variationId, img: image },
        });
      }
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("EDIT PRODUCT ERROR:", err);
    return NextResponse.json({ error: "Gagal update produk" }, { status: 500 });
  }
}
