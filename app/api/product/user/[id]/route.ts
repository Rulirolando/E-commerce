import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }, // Gunakan Promise
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findMany({
      where: { ownerId: id },
      include: {
        review: true,
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
    const processedProducts = product.map((product) => {
      const totalReviews = product.review.length;
      const sumRating = product.review.reduce(
        (acc, rev) => acc + rev.rating,
        0,
      );

      const avgRating = totalReviews > 0 ? sumRating / totalReviews : 0;

      return {
        ...product,
        avgRating: parseFloat(avgRating.toFixed(1)), // Contoh: 4.5
        totalReviews: totalReviews,
      };
    });

    return NextResponse.json(processedProducts, { status: 200 });
  } catch (err) {
    console.error("Prisma Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil produk" },
      { status: 500 },
    );
  }
}
