import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nama, kategori, deskripsi, lokasi, comment, ownerId, variasiList } =
      body;
    if (!nama || !kategori || !lokasi || !ownerId || !variasiList.length) {
      return NextResponse.json(
        { message: "Data produk tidak lengkap" },
        { status: 400 },
      );
    }
    const product = await prisma.product.create({
      data: {
        nama,
        kategori,
        deskripsi,
        lokasi,
        comment,
        ownerId,
        variations: {
          create: variasiList.map(
            (v: {
              warna: string;
              harga: number;
              stok: number;
              terjual: number;
              ukuran: string[];
              gambar: string[];
            }) => ({
              warna: v.warna,
              harga: v.harga,
              stok: v.stok,
              sizes: {
                create: v.ukuran.map((s: string) => ({ size: s })),
              },
              images: {
                create: v.gambar.map((i: string) => ({ img: i })),
              },
              terjual: v.terjual,
            }),
          ),
        },
      },
    });
    return NextResponse.json(
      {
        message: "Produk berhasil ditambahkan",
        product,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menambahkan produk", error },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        variations: {
          include: {
            images: true,
            sizes: true,
          },
        },
        review: true,
        loves: {
          select: {
            userId: true,
            status: true,
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    const processedProducts = products.map((product) => {
      const totalReviews = product.review.length;
      const sumRating = product.review.reduce(
        (acc, rev) => acc + rev.rating,
        0,
      );
      const totalSemuaStokVariasi = product.variations.reduce(
        (acc, curr) => acc + curr.stok,
        0,
      );
      const avgRating = totalReviews > 0 ? sumRating / totalReviews : 0;

      return {
        ...product,
        avgRating: parseFloat(avgRating.toFixed(1)), // Contoh: 4.5
        totalReviews: totalReviews,
        totalSemuaStokVariasi: totalSemuaStokVariasi,
      };
    });

    return NextResponse.json(processedProducts, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
