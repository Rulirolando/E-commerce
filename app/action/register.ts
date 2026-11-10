"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signIn } from "../auth";
import nodemailer from "nodemailer";
import { redirect } from "next/navigation";
import { registerSchema } from "@/lib/zod";
import { ZodError } from "zod";
import { randomInt } from "crypto";

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

    // ======================================
    // VALIDASI PASSWORD
    // ======================================

    const password = typeof data.password === "string" ? data.password : "";

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return {
        error:
          "Password minimal 8 karakter dan harus mengandung huruf kecil, huruf besar, angka, serta simbol.",
      };
    }

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
        type: "REGISTER",
        attempts: 0,
        blocked: false,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      },
      create: {
        username: validated.username,
        password: hashedPassword,
        email: validated.email,
        code: otp,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
        type: "REGISTER",
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

export async function verifyLoginOtpAction(email: string, code: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    if (!normalizedEmail || !/^\d{6}$/.test(normalizedCode)) {
      return { error: "Masukkan OTP yang terdiri dari 6 angka." };
    }

    const otpRecord = await prisma.otp.findUnique({
      where: { email: normalizedEmail },
    });

    if (!otpRecord || otpRecord.type !== "LOGIN") {
      return {
        error: "OTP login tidak ditemukan. Silakan login kembali.",
        expired: true,
      };
    }

    if (otpRecord.blocked || otpRecord.attempts >= 3) {
      return {
        error:
          "OTP diblokir karena 3 kali salah. Silakan login kembali untuk mendapatkan OTP baru.",
        blocked: true,
      };
    }

    if (otpRecord.expiresAt <= new Date()) {
      return {
        error:
          "OTP sudah kedaluwarsa. Silakan login kembali untuk mendapatkan OTP baru.",
        expired: true,
      };
    }

    if (otpRecord.code !== normalizedCode) {
      const nextAttempts = otpRecord.attempts + 1;
      const isBlocked = nextAttempts >= 3;

      // Hanya menambah percobaan jika OTP belum berubah,
      // belum diblokir, dan masih berlaku.
      const updated = await prisma.otp.updateMany({
        where: {
          id: otpRecord.id,
          type: "LOGIN",
          code: otpRecord.code,
          attempts: otpRecord.attempts,
          blocked: false,
          expiresAt: { gt: new Date() },
        },
        data: {
          attempts: { increment: 1 },
          ...(isBlocked
            ? {
                blocked: true,
                expiresAt: new Date(),
              }
            : {}),
        },
      });

      if (updated.count === 0) {
        return {
          error:
            "OTP sudah berubah atau tidak berlaku. Silakan periksa kembali.",
        };
      }

      if (isBlocked) {
        return {
          error:
            "OTP diblokir karena 3 kali salah. Silakan login kembali untuk mendapatkan OTP baru.",
          blocked: true,
        };
      }

      return {
        error: `OTP salah. Percobaan ${nextAttempts} dari 3.`,
        attempts: nextAttempts,
      };
    }

    // Pastikan OTP masih sama dan belum diblokir saat dihapus.
    const deleted = await prisma.otp.deleteMany({
      where: {
        id: otpRecord.id,
        type: "LOGIN",
        code: normalizedCode,
        blocked: false,
        attempts: { lt: 3 },
        expiresAt: { gt: new Date() },
      },
    });

    if (deleted.count === 0) {
      return {
        error: "OTP sudah tidak berlaku. Silakan login kembali.",
        expired: true,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Verify Login OTP Error:", error);
    return {
      error: "Gagal memverifikasi OTP. Silakan coba lagi.",
    };
  }
}

export async function resendLoginOtpAction(email: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return { error: "Email tidak ditemukan." };
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user?.password) {
      return {
        error: "Silakan login kembali menggunakan email dan password.",
      };
    }

    const otp = randomInt(100000, 1000000).toString();

    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await prisma.otp.upsert({
      where: { email: normalizedEmail },
      update: {
        code: otp,
        type: "LOGIN",
        expiresAt,
        attempts: 0,
        blocked: false,
      },
      create: {
        email: normalizedEmail,
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
      to: normalizedEmail,
      from: process.env.EMAIL_FROM,
      subject: "Kode OTP Login Baru - Rulshop",
      html: `
        <h2>Verifikasi Login Rulshop</h2>
        <p>Halo ${user.username},</p>
        <p>Kode OTP login baru Anda: <b>${otp}</b></p>
        <p>Kode berlaku selama 2 menit dan diblokir setelah 3 kali percobaan salah.</p>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Resend Login OTP Error:", error);
    return { error: "Gagal mengirim ulang OTP login." };
  }
}

export async function verifyOtpAction(email: string, code: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    if (!normalizedEmail || !/^\d{6}$/.test(normalizedCode)) {
      return { error: "Masukkan kode OTP 6 angka yang valid." };
    }

    const otpRecord = await prisma.otp.findFirst({
      where: {
        email: normalizedEmail,
        code: normalizedCode,
        type: "REGISTER",
        blocked: false,
        attempts: { lt: 3 },
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otpRecord) {
      return {
        error: "Kode OTP salah atau sudah kedaluwarsa. Gunakan kode terbaru.",
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // Jika akun sudah ada, tandai email sebagai terverifikasi.
      await prisma.user.update({
        where: { email: normalizedEmail },
        data: {
          emailVerified: new Date(),
        },
      });
    } else {
      // Akun pendaftaran belum dibuat sebelum OTP berhasil.
      if (!otpRecord.username || !otpRecord.password) {
        return {
          error: "Data pendaftaran tidak ditemukan. Silakan daftar kembali.",
        };
      }

      const existingUsername = await prisma.user.findUnique({
        where: { username: otpRecord.username },
      });

      if (existingUsername) {
        return {
          error: "Username sudah digunakan. Silakan daftar kembali.",
        };
      }

      await prisma.user.create({
        data: {
          username: otpRecord.username,
          email: normalizedEmail,
          password: otpRecord.password,
          emailVerified: new Date(),
        },
      });
    }

    // Hapus OTP setelah verifikasi berhasil.
    await prisma.otp.delete({
      where: { id: otpRecord.id },
    });

    return { success: true };
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return { error: "Gagal memverifikasi OTP. Silakan coba lagi." };
  }
}

export async function resendOtpAction(email: string) {
  try {
    if (!email) return { error: "Email tidak ditemukan" };

    // Generate kode OTP 6 angka baru
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Simpan / Perbarui OTP ke database (berlaku 2 menit)
    await prisma.otp.upsert({
      where: { email },
      update: {
        code: newOtp,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 menit
      },
      create: {
        email,
        code: newOtp,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 menit
      },
    });

    // Kirim ulang via Nodemailer
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
      subject: "Kode OTP Login Baru - Rulshop",
      html: `<h2>Verifikasi Login Rulshop</h2><p>Kode OTP baru Anda: <b>${newOtp}</b></p><p>Kode ini berlaku selama 2 menit.</p>`,
    });

    return { success: true };
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return { error: "Gagal mengirim ulang kode OTP" };
  }
}
