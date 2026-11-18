import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST / PATCH: Menyimpan atau memperbarui profil toko
export async function POST(req: Request) {
  try {
    const { userId, namaToko, deskripsi, alamat, noTelp, fotoToko } =
      await req.json();

    if (!userId || !namaToko || !alamat || !noTelp) {
      return NextResponse.json(
        { message: "Nama toko, alamat, dan nomor telepon wajib diisi." },
        { status: 400 },
      );
    }

    const store = await prisma.store.upsert({
      where: { userId },
      update: { namaToko, deskripsi, alamat, noTelp, fotoToko },
      create: { userId, namaToko, deskripsi, alamat, noTelp, fotoToko },
    });

    return NextResponse.json(
      { success: true, message: "Profil toko berhasil diperbarui.", store },
      { status: 200 },
    );
  } catch (error) {
    console.error("Store API Error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server saat menyimpan toko." },
      { status: 500 },
    );
  }
}

// GET: Mengambil data toko berdasarkan userId atau storeId
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { message: "User ID diperlukan." },
        { status: 400 },
      );
    }

    const store = await prisma.store.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            username: true,
            email: true,
            imgProfile: true,
          },
        },
      },
    });

    return NextResponse.json(store || {}, { status: 200 });
  } catch (error) {
    console.error("Get Store API Error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data toko." },
      { status: 500 },
    );
  }
}
