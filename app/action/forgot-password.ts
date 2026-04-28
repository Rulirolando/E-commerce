"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

// 1. Kirim Kode OTP ke Email
export async function sendResetOtp(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "Email tidak terdaftar!" };

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.otp.upsert({
    where: { email },
    update: {
      code: otp,
      expiresAt: new Date(Date.now() + 1 * 60 * 1000),
      type: "FORGOT",
    },
    create: {
      email,
      username: user.username,
      password: user.password ?? undefined,
      code: otp,
      type: "FORGOT",
      expiresAt: new Date(Date.now() + 1 * 60 * 1000),
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
    subject: "Reset Password Rulshop",
    html: `<p>Kode OTP reset password Anda adalah: <b>${otp}</b></p>`,
  });

  return { success: true };
}

// 2. Reset Password
export async function resetPasswordAction(
  email: string,
  code: string,
  newPass: string,
) {
  const otpRecord = await prisma.otp.findFirst({
    where: { email, code, type: "FORGOT", expiresAt: { gt: new Date() } },
  });

  if (!otpRecord) return { error: "Kode salah atau kedaluwarsa!" };

  const hashedPassword = await bcrypt.hash(newPass, 10);
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  await prisma.otp.deleteMany({ where: { email } });
  return { success: true };
}

export async function resendOtpAction(email: string) {
  try {
    const otpRecord = await prisma.otp.findUnique({ where: { email } });
    if (!otpRecord) return { error: "Silakan daftar ulang dari awal." };

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.otp.update({
      where: { email },
      data: {
        code: otp,
        expiresAt: new Date(Date.now() + 1 * 60 * 1000),
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
      subject: "Kode Verifikasi Baru - Rulshop",
      html: `<h2>Verifikasi Akun</h2><p>Kode OTP baru Anda adalah: <b>${otp}</b></p>`,
    });
    return { success: true };
  } catch {
    return { error: "Terjadi kesalahan sistem" };
  }
}
