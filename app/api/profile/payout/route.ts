import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "Silakan login terlebih dahulu." },
        { status: 401 },
      );
    }

    const payouts = await prisma.payout.findMany({
      where: {
        sellerId: userId,
      },
      include: {
        order: {
          select: {
            id: true,
            nama: true,
            jumlah: true,
            totalHarga: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const summary = {
      totalPenjualan: payouts.reduce((total, item) => total + item.amount, 0),
      totalKomisi: payouts.reduce((total, item) => total + item.fee, 0),
      totalBersih: payouts.reduce((total, item) => total + item.netAmount, 0),
      menunggu: payouts
        .filter((item) =>
          ["MENUNGGU_ADMIN", "MENUNGGU_REKENING"].includes(item.status),
        )
        .reduce((total, item) => total + item.netAmount, 0),
      berhasil: payouts
        .filter((item) => item.status === "BERHASIL")
        .reduce((total, item) => total + item.netAmount, 0),
    };

    return NextResponse.json({
      payouts,
      summary,
    });
  } catch (error) {
    console.error("GET PAYOUT ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengambil riwayat pencairan." },
      { status: 500 },
    );
  }
}
