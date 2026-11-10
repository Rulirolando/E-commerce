import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json(
      { error: "Email tidak ditemukan" },
      { status: 400 },
    );
  }

  // Cek rate limit (1 menit)
  const lastOtp = await prisma.otp.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  if (lastOtp && Date.now() - lastOtp.createdAt.getTime() < 120 * 1000) {
    return NextResponse.json(
      { error: "Tunggu 2 menit sebelum minta OTP lagi" },
      { status: 429 },
    );
  }

  // Hapus OTP lama
  await prisma.otp.deleteMany({ where: { email } });

  // Generate OTP baru
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.otp.create({
    data: {
      email,
      code: otp,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    },
  });

  // Kirim email OTP
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
    subject: "Kode OTP Login",
    html: `<h2>Kode OTP Login</h2><p>Kode OTP kamu adalah: <b>${otp}</b></p><p>Berlaku 2 menit.</p>`,
  });

  return NextResponse.json({ success: true });
}
