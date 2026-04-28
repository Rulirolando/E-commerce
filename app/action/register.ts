"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signIn } from "../auth";
import nodemailer from "nodemailer";
import { redirect } from "next/navigation";
import { registerSchema } from "@/lib/zod";
import { ZodError } from "zod";

export interface RegisterState {
  error?: string;
  success?: boolean;
}

export async function registerUser(
  prevState: RegisterState | null,
  formData: FormData,
): Promise<RegisterState | undefined> {
  let userEmail = "";
  try {
    const data = Object.fromEntries(formData.entries());
    const validated = registerSchema.parse(data);
    userEmail = validated.email;

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return { error: "Email sudah digunakan" };
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: validated.username },
    });

    if (existingUsername) {
      return { error: "Username sudah digunakan" };
    }

    const hashedPassword = await bcrypt.hash(validated.password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.otp.upsert({
      where: { email: validated.email },
      update: {
        username: validated.username,
        password: hashedPassword,
        code: otp,
        expiresAt: new Date(Date.now() + 1 * 60 * 1000),
      },
      create: {
        username: validated.username,
        password: hashedPassword,
        email: validated.email,
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
      to: validated.email,
      from: process.env.EMAIL_FROM,
      subject: "Kode Verifikasi Rulshop",
      html: `<h2>Verifikasi Akun</h2><p>Kode OTP Anda adalah: <b>${otp}</b></p>`,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0].message };
    }

    // Penting untuk Auth.js agar redirect tetap jalan
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    return { error: "Terjadi kesalahan saat mendaftar" };
  }

  redirect(`/auth/verify?email=${encodeURIComponent(userEmail)}`);
}

export async function googleSignIn() {
  await signIn("google", { redirectTo: "/" });
}

export async function verifyOtpAction(email: string, code: string) {
  try {
    const otpRecord = await prisma.otp.findFirst({
      where: { email, code, expiresAt: { gt: new Date() } },
    });

    if (!otpRecord) return { error: "Kode salah atau kedaluwarsa!" };

    await prisma.$transaction([
      prisma.user.create({
        data: {
          username: otpRecord.username,
          email: otpRecord.email,
          password: otpRecord.password,
          emailVerified: new Date(),
        },
      }),
      prisma.otp.delete({ where: { email } }),
    ]);

    return { success: true };
  } catch {
    return { error: "Terjadi kesalahan sistem" };
  }
}

export async function resendOtpAction(email: string) {
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return { error: "Email sudah terverifikasi." };

    const pendingUser = await prisma.otp.findUnique({ where: { email } });
    if (!pendingUser) return { error: "Silakan daftar ulang dari awal." };

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
    return { error: "Gagal mengirim ulang OTP" };
  }
}
