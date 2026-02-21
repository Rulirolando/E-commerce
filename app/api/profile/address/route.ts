import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const data = body.newaddress;

    if (!data || !data.userId) {
      return NextResponse.json(
        { message: "Data tidak lengkap" },
        { status: 400 },
      );
    }

    if (data.status === true) {
      await prisma.address.updateMany({
        where: { userId: data.userId },
        data: { status: false },
      });
    }

    await prisma.address.create({
      data: {
        userId: data.userId,
        nama: data.nama,
        alamat: data.alamat,
        telepon: String(data.telepon),
        lokasi: data.lokasi,
        status: data.status || false,
      },
    });

    const allAddresses = await prisma.address.findMany({
      where: { userId: data.userId },
      orderBy: { status: "desc" },
    });

    return NextResponse.json(allAddresses, { status: 201 });
  } catch (error) {
    console.error("Prisma Error:", error);
    return NextResponse.json(
      { message: "Gagal menyimpan ke database" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, userId } = await request.json();

    if (!id || !userId) {
      return NextResponse.json(
        { error: "Missing ID or UserID" },
        { status: 400 },
      );
    }

    const updatedAddress = await prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId: userId },
        data: { status: false },
      });

      const updated = await tx.address.update({
        where: {
          id: id,
          userId: userId,
        },
        data: { status: true },
      });

      return updated;
    });

    return NextResponse.json({
      message: "Status updated successfully",
      data: updatedAddress,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
