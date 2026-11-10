import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { randomInt } from "node:crypto";

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
        { error: "Email dan password wajib diisi." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 },
      );
    }

    // 1. Periksa apakah akun sedang terkunci.
    if (user.loginLockedUntil) {
      const remainingMs = user.loginLockedUntil.getTime() - Date.now();

      if (remainingMs > 0) {
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        return NextResponse.json(
          {
            error: `Akun terkunci. Silakan tunggu ${remainingSeconds} detik.`,
            locked: true,
            remainingSeconds,
          },
          { status: 429 },
        );
      }

      // Masa penguncian telah habis.
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          loginLockedUntil: null,
        },
      });
    }

    // 2. Periksa password.
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
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

      // Percobaan ketiga: kunci akun selama 2 menit.
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
            error: "Password salah 3 kali. Akun dikunci selama 2 menit.",
            locked: true,
            remainingSeconds: 120,
          },
          { status: 429 },
        );
      }

      const remainingAttempts = MAX_ATTEMPTS - updatedUser.failedLoginAttempts;

      return NextResponse.json(
        {
          error: `Email atau password salah. Sisa percobaan: ${remainingAttempts} kali.`,
          remainingAttempts,
        },
        { status: 401 },
      );
    }

    // 3. Password benar: reset penghitung kesalahan.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        loginLockedUntil: null,
      },
    });

    // 4. Pastikan email sudah diverifikasi.
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Email kamu belum diverifikasi." },
        { status: 403 },
      );
    }

    // 5. Buat OTP.
    const otp = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await prisma.otp.upsert({
      where: { email },
      update: {
        code: otp,
        type: "LOGIN",
        expiresAt,
        attempts: 0,
        blocked: false,
      },
      create: {
        email,
        code: otp,
        type: "LOGIN",
        expiresAt,
        attempts: 0,
        blocked: false,
      },
    });

    // 6. Kirim OTP melalui email.
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    await transporter.sendMail({
      to: email,
      from: process.env.EMAIL_FROM,
      subject: "Kode OTP Login - Rulshop",
      html: `
        <h2>Verifikasi Login Rulshop</h2>
        <p>Kode OTP Anda adalah: <b>${otp}</b></p>
        <p>Kode berlaku selama 2 menit.</p>
        <p>Jika Anda tidak mencoba login, abaikan email ini.</p>
      `,
    });

    return NextResponse.json(
      {
        success: true,
        message: "OTP berhasil dikirim ke email kamu.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Login OTP Error:", error);

    return NextResponse.json(
      { error: "Gagal mengirimkan kode OTP." },
      { status: 500 },
    );
  }
}
