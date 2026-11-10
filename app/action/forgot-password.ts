"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { randomInt } from "node:crypto";

const OTP_DURATION = 2 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateOtp() {
  return randomInt(100000, 1000000).toString();
}

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}

// 1. Kirim OTP reset password
export async function sendResetOtp(email: string) {
  try {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return { error: "Email wajib diisi." };
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return { error: "Email tidak terdaftar!" };
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_DURATION);

    await prisma.otp.upsert({
      where: { email: normalizedEmail },
      update: {
        code: otp,
        type: "FORGOT",
        expiresAt,
        attempts: 0,
        blocked: false,
        username: user.username,
        password: user.password ?? "",
      },
      create: {
        email: normalizedEmail,
        username: user.username,
        password: user.password ?? "",
        code: otp,
        type: "FORGOT",
        expiresAt,
        attempts: 0,
        blocked: false,
      },
    });

    await createTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to: normalizedEmail,
      subject: "Kode OTP Reset Password - Rulshop",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
          <h2>Reset Password Rulshop</h2>
          <p>Halo <b>${escapeHtml(user.username)}</b>,</p>
          <p>Kode OTP reset password kamu:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#eff6ff;text-align:center">
            ${otp}
          </div>
          <p>Kode berlaku selama <b>2 menit</b>.</p>
          <p>OTP akan diblokir setelah 3 kali percobaan salah.</p>
          <p>Email akun: <b>${escapeHtml(normalizedEmail)}</b></p>
          <p>Jika kamu tidak meminta reset password, abaikan email ini.</p>
        </div>
      `,
    });

    return {
      success: true,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    console.error("Send reset OTP error:", error);
    return { error: "Gagal mengirim OTP. Silakan coba lagi." };
  }
}

// 2. Verifikasi OTP dan ubah password
export async function resetPasswordAction(
  email: string,
  code: string,
  newPass: string,
) {
  try {
    const normalizedEmail = normalizeEmail(email);
    const normalizedCode = code.trim();

    if (!normalizedEmail || !/^\d{6}$/.test(normalizedCode)) {
      return { error: "Masukkan email dan OTP 6 angka yang valid." };
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).{8,}$/;

    if (typeof newPass !== "string" || !passwordRegex.test(newPass)) {
      return {
        error:
          "Password minimal 8 karakter dan harus mengandung huruf kecil, huruf besar, angka, serta simbol.",
      };
    }

    const otpRecord = await prisma.otp.findUnique({
      where: { email: normalizedEmail },
    });

    if (!otpRecord || otpRecord.type !== "FORGOT") {
      return {
        error: "Sesi reset password tidak ditemukan. Silakan mulai kembali.",
        expired: true,
      };
    }

    if (otpRecord.blocked || otpRecord.attempts >= MAX_ATTEMPTS) {
      return {
        error: "OTP diblokir karena 3 kali salah. Silakan kirim OTP baru.",
        blocked: true,
      };
    }

    if (otpRecord.expiresAt <= new Date()) {
      return {
        error: "OTP sudah kedaluwarsa. Silakan kirim OTP baru.",
        expired: true,
      };
    }

    // OTP salah: tambah jumlah percobaan di server.
    if (otpRecord.code !== normalizedCode) {
      const nextAttempts = otpRecord.attempts + 1;
      const isBlocked = nextAttempts >= MAX_ATTEMPTS;

      // Pemeriksaan bersyarat mencegah percobaan lama
      // mengubah OTP yang baru saja diganti.
      const updated = await prisma.otp.updateMany({
        where: {
          id: otpRecord.id,
          email: normalizedEmail,
          type: "FORGOT",
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
          error: "OTP diblokir karena 3 kali salah. Silakan kirim OTP baru.",
          blocked: true,
        };
      }

      return {
        error: `OTP salah. Percobaan ${nextAttempts} dari ${MAX_ATTEMPTS}.`,
        attempts: nextAttempts,
      };
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);

    // Periksa ulang OTP dalam transaksi sebelum mengubah password.
    await prisma.$transaction(async (tx) => {
      const currentOtp = await tx.otp.findFirst({
        where: {
          id: otpRecord.id,
          email: normalizedEmail,
          code: normalizedCode,
          type: "FORGOT",
          blocked: false,
          attempts: { lt: MAX_ATTEMPTS },
          expiresAt: { gt: new Date() },
        },
      });

      if (!currentOtp) {
        throw new Error("OTP_INVALID_OR_EXPIRED");
      }

      await tx.user.update({
        where: { email: normalizedEmail },
        data: { password: hashedPassword },
      });

      await tx.otp.delete({
        where: { id: currentOtp.id },
      });
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "OTP_INVALID_OR_EXPIRED") {
      return {
        error: "OTP sudah tidak berlaku. Silakan kirim OTP baru.",
        expired: true,
      };
    }

    console.error("Reset password error:", error);
    return { error: "Gagal mengubah password. Silakan coba lagi." };
  }
}

// 3. Kirim ulang OTP reset password
export async function resendOtpAction(email: string) {
  try {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return { error: "Email wajib diisi." };
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return { error: "Email tidak terdaftar." };
    }

    const existingOtp = await prisma.otp.findUnique({
      where: { email: normalizedEmail },
    });

    // Jangan mengubah OTP yang sedang digunakan oleh alur lain.
    if (!existingOtp || existingOtp.type !== "FORGOT") {
      return {
        error: "Sesi reset password tidak ditemukan. Silakan mulai kembali.",
      };
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_DURATION);

    const updated = await prisma.otp.updateMany({
      where: {
        id: existingOtp.id,
        type: "FORGOT",
      },
      data: {
        code: otp,
        expiresAt,
        attempts: 0,
        blocked: false,
      },
    });

    if (updated.count === 0) {
      return {
        error: "Sesi OTP berubah. Silakan mulai kembali.",
      };
    }

    await createTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to: normalizedEmail,
      subject: "Kode OTP Reset Password Baru - Rulshop",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
          <h2>Reset Password Rulshop</h2>
          <p>Halo <b>${escapeHtml(user.username)}</b>,</p>
          <p>Kode OTP terbaru kamu:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#eff6ff;text-align:center">
            ${otp}
          </div>
          <p>Kode berlaku selama <b>2 menit</b>.</p>
          <p>OTP akan diblokir setelah 3 kali percobaan salah.</p>
          <p>Email akun: <b>${escapeHtml(normalizedEmail)}</b></p>
        </div>
      `,
    });

    return {
      success: true,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    console.error("Resend reset OTP error:", error);
    return { error: "Gagal mengirim ulang OTP. Silakan coba lagi." };
  }
}
