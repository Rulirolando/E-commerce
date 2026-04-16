import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cartItemId = Number(id);

    await prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return NextResponse.json(
      { message: "Item berhasil dihapus" },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { message: "Gagal menghapus item" },
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
    const cartItemId = Number(id);
    const { jumlah } = await req.json();

    if (jumlah <= 0) {
      return NextResponse.json(
        { message: "Jumlah tidak valid" },
        { status: 400 },
      );
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { variant: true },
    });

    if (!item) {
      return NextResponse.json(
        { message: "Item tidak ditemukan" },
        { status: 404 },
      );
    }

    if (jumlah > item.variant.stok) {
      return NextResponse.json(
        { message: "Jumlah melebihi stok" },
        { status: 400 },
      );
    }

    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { jumlah },
    });

    return NextResponse.json({ message: "Jumlah diperbarui" });
  } catch {
    return NextResponse.json(
      { message: "Gagal update jumlah" },
      { status: 500 },
    );
  }
}
