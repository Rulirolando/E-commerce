import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const user = userId;

    if (!user) {
      return NextResponse.json(
        { message: "userId tidak valid" },
        { status: 400 },
      );
    }

    const redisKey = `ecom:fav:${userId}`;
    const cachedData = await redis.get(redisKey);

    if (cachedData) {
      // console.log("Redis Hit: Mengambil data favorit dari cache");
      return NextResponse.json(JSON.parse(cachedData));
    }

    const favorites = await prisma.love.findMany({
      where: { userId: user },
      include: {
        product: {
          include: {
            review: true,
            variations: {
              include: {
                images: true,
              },
            },
          },
        },
      },
    });

    const processedFavorites = favorites.map((fav) => {
      const product = fav.product;
      const reviews = product.review || [];
      const totalReviews = reviews.length;

      const sumRating = reviews.reduce((acc, rev) => acc + rev.rating, 0);

      const avgRating = totalReviews > 0 ? sumRating / totalReviews : 0;

      return {
        ...fav,
        product: {
          ...product,
          avgRating: parseFloat(avgRating.toFixed(1)),
          totalReviews: totalReviews,
        },
      };
    });

    await redis.set(redisKey, JSON.stringify(processedFavorites), "EX", 3600);

    return NextResponse.json(processedFavorites);
  } catch (error) {
    console.error("GET FAVORITE ERROR:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
