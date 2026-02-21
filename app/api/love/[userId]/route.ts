import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

    const favorites = await prisma.love.findMany({
      where: { userId: user },
      include: {
        product: {
          include: {
            variations: {
              include: {
                images: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(favorites);
  } catch (error) {
    console.error("GET FAVORITE ERROR:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
