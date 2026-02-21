import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Prisma Create
    const newOrder = await prisma.order.create({
      data: {
        nama: body.nama,
        warna: body.warna,
        ukuran: body.ukuran,
        harga: body.harga,
        totalHarga: body.totalHarga,
        gambar: body.gambar,
        namaPenerima: body.namaPenerima,
        telepon: body.telepon,
        alamat: body.alamat,
        jumlah: body.jumlah,
        buyerId: body.buyerId,
        // Gunakan connect jika ingin relasi lebih kuat, atau produkId langsung
        produkId: body.produkId || null,
      },
    });

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error: unknown) {
    // LIHAT LOG INI DI TERMINAL VS CODE ANDA!
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("PRISMA ERROR:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
