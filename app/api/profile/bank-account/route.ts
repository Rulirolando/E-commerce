import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/auth";
import { encryptAccountNumber } from "@/lib/bank-account-crypto";

export const runtime = "nodejs";

// ==========================================
// GET: Mengambil rekening milik user login
// ==========================================
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

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { userId },
      select: {
        id: true,
        bankCode: true,
        bankName: true,
        accountName: true,
        accountNumberLast4: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      bankAccount,
    });
  } catch (error) {
    console.error("GET BANK ACCOUNT ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengambil data rekening bank." },
      { status: 500 },
    );
  }
}

// ==========================================
// POST: Menyimpan atau memperbarui rekening
// ==========================================
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

    const body = await req.json();

    const bankCode =
      typeof body.bankCode === "string" ? body.bankCode.trim() : "";

    const bankName =
      typeof body.bankName === "string" ? body.bankName.trim() : "";

    const accountName =
      typeof body.accountName === "string" ? body.accountName.trim() : "";

    const accountNumber =
      typeof body.accountNumber === "string"
        ? body.accountNumber.replace(/[\s-]/g, "")
        : "";

    // Validasi data rekening
    if (
      !bankCode ||
      bankCode.length > 30 ||
      !bankName ||
      bankName.length > 100 ||
      !accountName ||
      accountName.length > 100 ||
      !/^[0-9]{5,30}$/.test(accountNumber)
    ) {
      return NextResponse.json(
        { message: "Data rekening bank tidak valid." },
        { status: 400 },
      );
    }

    // Enkripsi nomor rekening sebelum disimpan.
    const accountNumberEnc = encryptAccountNumber(accountNumber);

    // Simpan atau perbarui rekening milik user login.
    const bankAccount = await prisma.bankAccount.upsert({
      where: {
        userId,
      },

      create: {
        userId,
        bankCode,
        bankName,
        accountName,
        accountNumberEnc,
        accountNumberLast4: accountNumber.slice(-4),
        isVerified: false,
      },

      update: {
        bankCode,
        bankName,
        accountName,
        accountNumberEnc,
        accountNumberLast4: accountNumber.slice(-4),

        // Rekening harus diverifikasi kembali
        // jika data rekening disimpan atau diubah.
        isVerified: false,
      },

      select: {
        id: true,
        bankCode: true,
        bankName: true,
        accountName: true,
        accountNumberLast4: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Rekening berhasil disimpan dan menunggu proses verifikasi.",
        bankAccount,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("SAVE BANK ACCOUNT ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menyimpan rekening bank." },
      { status: 500 },
    );
  }
}
