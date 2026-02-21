import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const allAddresses = await prisma.address.findMany({
      where: { userId: id },
      orderBy: { status: "desc" },
    });
    return NextResponse.json(allAddresses, { status: 200 });
  } catch (error) {
    console.error("Prisma Error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data dari database" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await prisma.address.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Berhasil dihapus" }, { status: 200 });
  } catch (error) {
    console.error("Prisma Error:", error);
    return NextResponse.json(
      { message: "Gagal menghapus data dari database" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nama, alamat, telepon, lokasi, status, userId } = body;
    const updatedAddress = await prisma.address.update({
      where: { id: Number(id), userId: userId },
      data: {
        nama: nama,
        alamat: alamat,
        telepon: String(telepon),
        lokasi: lokasi,
        status: status,
      },
    });
    return NextResponse.json(updatedAddress, { status: 200 });
  } catch (error) {
    console.error("Prisma Error:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui data di database" },
      { status: 500 },
    );
  }
}
