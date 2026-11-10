import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const redisKey = `ecom:search:v2:${q.toLowerCase()}`;

    // Ambil data dari Redis jika tersedia (waktu cache dipangkas agar data tidak stale/kedaluwarsa terlalu lama)
    const cachedData = await redis.get(redisKey);

    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData), {
        status: 200,
      });
    }

    const products = await prisma.product.findMany({
      where: {
        moderationStatus: "ACTIVE",
        ...(q
          ? {
              OR: [
                {
                  nama: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  kategori: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  deskripsi: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        variations: {
          include: {
            images: {
              select: {
                img: true,
              },
            },
            sizes: {
              select: {
                size: true,
              },
            },
          },
        },
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

    // Simpan cache selama 60 detik saja agar perubahan stok langsung sinkron dengan database
    await redis.set(redisKey, JSON.stringify(products), "EX", 60);

    return NextResponse.json(products, {
      status: 200,
    });
  } catch (error) {
    console.error("Gagal mengambil produk:", error);

    return NextResponse.json(
      {
        message: "Gagal mengambil data produk",
      },
      {
        status: 500,
      },
    );
  }
}
