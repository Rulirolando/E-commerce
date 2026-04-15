import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Semua field wajib diisi" },
        { status: 400 },
      );
    }
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return NextResponse.json(
        { message: "Email atau password salah" },
        { status: 401 },
      );
    }
    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      return NextResponse.json(
        { message: "Email atau password salah" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      {
        message: "Login berhasil",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server" },
      { status: 500 },
    );
  }
}
