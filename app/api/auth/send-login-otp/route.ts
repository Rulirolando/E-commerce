import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { randomInt } from "node:crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user?.password) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 400 },
      );
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 400 },
      );
    }

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
        <p>OTP akan diblokir setelah 3 kali percobaan yang salah.</p>
        <p>Jika Anda tidak mencoba login, abaikan email ini.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login OTP Error:", error);

    return NextResponse.json(
      { error: "Gagal mengirimkan kode OTP" },
      { status: 500 },
    );
  }
}
