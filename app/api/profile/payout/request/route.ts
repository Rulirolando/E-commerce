// app/api/profile/payout/request/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "Silakan login terlebih dahulu." },
        { status: 401 },
      );
    }

    // Ambil rekening bank penjual
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { userId },
    });

    if (!bankAccount || !bankAccount.isVerified) {
      return NextResponse.json(
        {
          message:
            "Harap daftarkan dan verifikasi rekening bank terlebih dahulu di profil Anda.",
        },
        { status: 400 },
      );
    }

    const body = await req.json();
    // Payout ID di skema Prisma bertipe String (UUID), jadi ambil sebagai string
    const payoutId = String(body.payoutId || "").trim();

    if (!payoutId) {
      return NextResponse.json(
        { message: "ID pencairan tidak valid." },
        { status: 400 },
      );
    }

    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout || payout.sellerId !== userId) {
      return NextResponse.json(
        { message: "Data pencairan tidak ditemukan atau bukan milik Anda." },
        { status: 404 },
      );
    }

    if (
      payout.status !== "MENUNGGU_ADMIN" &&
      payout.status !== "MENUNGGU_REKENING"
    ) {
      return NextResponse.json(
        { message: "Pencairan ini sudah diproses atau sudah berhasil." },
        { status: 400 },
      );
    }

    // Update status payout menjadi BERHASIL (Simulasi pencairan mandiri oleh penjual)
    const updatedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: "BERHASIL",
        bankCode: bankAccount.bankCode,
        bankName: bankAccount.bankName,
        accountName: bankAccount.accountName,
        accountNumberEnc: bankAccount.accountNumberEnc,
      },
    });

    return NextResponse.json({
      message: "Pencairan dana berhasil diproses ke rekening Anda.",
      payout: updatedPayout,
    });
  } catch (error) {
    console.error("REQUEST PAYOUT ERROR:", error);
    return NextResponse.json(
      { message: "Gagal memproses pencairan dana." },
      { status: 500 },
    );
  }
}
