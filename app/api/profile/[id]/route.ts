import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: "Username kosong" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: id },
      select: {
        id: true,
        username: true,
        email: true,
        nama: true,
        noTelp: true,
        tanggalLahir: true,
        jenisKelamin: true,
        imgProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error("PROFILE API ERROR:", err);
    return NextResponse.json(
      { message: "Gagal mengambil data user" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { nama, email, telepon, tanggalLahir, gender, foto } =
      await req.json();
    const { id } = await params;
    const emailExists = await prisma.user.findFirst({
      where: { email: email, NOT: { username: id } },
    });

    if (emailExists) {
      return NextResponse.json(
        { message: "Email sudah digunakan oleh user lain" },
        { status: 400 },
      );
    }

    if (!id) {
      return NextResponse.json({ message: "Username kosong" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { username: id },
      data: {
        nama: nama,
        email: email,
        imgProfile: foto,
        noTelp: telepon,
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
        jenisKelamin: gender,
      },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (err) {
    console.error("UPDATE PROFILE PATCH API ERROR:", err);
    return NextResponse.json(
      { message: "Gagal mengupdate data user" },
      { status: 500 },
    );
  }
}
