import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 3;
const LOCK_DURATION = 2 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { message: "Semua field wajib diisi." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { message: "Email atau password salah." },
        { status: 401 },
      );
    }

    // 1. Periksa apakah akun terkunci.
    if (user.loginLockedUntil) {
      const remainingMs = user.loginLockedUntil.getTime() - Date.now();

      if (remainingMs > 0) {
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        return NextResponse.json(
          {
            message: `Akun terkunci. Silakan tunggu ${remainingSeconds} detik.`,
            locked: true,
            remainingSeconds,
          },
          { status: 429 },
        );
      }

      // Masa penguncian telah berakhir.
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          loginLockedUntil: null,
        },
      });
    }

    // 2. Periksa password.
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: {
            increment: 1,
          },
        },
        select: {
          failedLoginAttempts: true,
        },
      });

      if (updatedUser.failedLoginAttempts >= MAX_ATTEMPTS) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: MAX_ATTEMPTS,
            loginLockedUntil: new Date(Date.now() + LOCK_DURATION),
          },
        });

        return NextResponse.json(
          {
            message: "Password salah 3 kali. Akun dikunci selama 2 menit.",
            locked: true,
            remainingSeconds: 120,
          },
          { status: 429 },
        );
      }

      const remainingAttempts = MAX_ATTEMPTS - updatedUser.failedLoginAttempts;

      return NextResponse.json(
        {
          message: `Email atau password salah. Sisa percobaan: ${remainingAttempts} kali.`,
          remainingAttempts,
        },
        { status: 401 },
      );
    }

    // 3. Password benar, reset penghitung.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        loginLockedUntil: null,
      },
    });

    return NextResponse.json(
      {
        message: "Login berhasil.",
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
      { message: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
