import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function POST(req: Request) {
  try {
    const { action, email, adminCode, otp } = await req.json();

    // ==========================================
    // TAHAP 1: VALIDASI EMAIL & ADMIN CODE -> KIRIM OTP
    // ==========================================
    if (action === "request_otp") {
      if (!email || !adminCode) {
        return NextResponse.json(
          { message: "Email dan kode akses admin wajib diisi." },
          { status: 400 },
        );
      }

      const cleanEmail = email.trim().toLowerCase();

      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!user || user.role !== "ADMIN") {
        return NextResponse.json(
          { message: "Akun tidak terdaftar sebagai Admin." },
          { status: 403 },
        );
      }

      // Verifikasi Kode Akses dari Super Admin (adminCode)
      if (user.adminCode !== adminCode.trim()) {
        return NextResponse.json(
          { message: "Kode akses dari Super Admin salah." },
          { status: 401 },
        );
      }

      // Cek apakah akun diblokir sementara (salah 3 kali)
      const existingOtp = await prisma.otp.findUnique({
        where: { email: cleanEmail },
      });

      const now = new Date();

      if (existingOtp && existingOtp.blocked) {
        const blockDuration = 2 * 60 * 1000; // 2 Menit
        const timeElapsed =
          now.getTime() - new Date(existingOtp.createdAt).getTime();

        if (timeElapsed < blockDuration) {
          const remainingSeconds = Math.ceil(
            (blockDuration - timeElapsed) / 1000,
          );
          return NextResponse.json(
            {
              message: `Terlalu banyak percobaan salah. Silakan tunggu ${Math.ceil(
                remainingSeconds / 60,
              )} menit lagi.`,
            },
            { status: 429 },
          );
        } else {
          await prisma.otp.update({
            where: { email: cleanEmail },
            data: { blocked: false, attempts: 0 },
          });
        }
      }

      // Pastikan user memiliki password dummy di DB agar lolos kriteria auth.ts (jika auth.ts masih mengecek password)
      const dummyPasswordHash = await bcrypt.hash("ADMIN_BYPASS_PASS", 10);
      if (!user.password) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            password: dummyPasswordHash,
            emailVerified: user.emailVerified || new Date(),
          },
        });
      }

      // Generate 6 digit OTP
      const generatedOtp = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Berlaku 5 menit

      await prisma.otp.upsert({
        where: { email: cleanEmail },
        update: {
          code: generatedOtp,
          expiresAt,
          attempts: 0,
          blocked: false,
          type: "LOGIN",
          createdAt: now,
        },
        create: {
          email: cleanEmail,
          username: user.username || "",
          password: "",
          code: generatedOtp,
          type: "LOGIN",
          expiresAt,
        },
      });

      // Kirim email via Nodemailer
      try {
        await transporter.sendMail({
          from: `"Rulshop Security" <${process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER}>`,
          to: cleanEmail,
          subject: "Kode OTP Login Admin - Rulshop",
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #2563eb;">Verifikasi Login Admin</h2>
              <p>Halo, <b>${user.username || "Admin"}</b>,</p>
              <p>Berikut adalah kode OTP Anda untuk masuk ke Dashboard Admin Rulshop:</p>
              <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
                ${generatedOtp}
              </div>
              <p>Kode ini berlaku selama <b>5 menit</b>. Jangan berikan kepada siapa pun.</p>
            </div>
          `,
        });
      } catch (mailError) {
        console.error("Gagal mengirim email Nodemailer:", mailError);
        return NextResponse.json(
          {
            message: "Gagal mengirim email OTP. Periksa konfigurasi SMTP Anda.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Kode OTP berhasil dikirim ke Gmail Anda.",
      });
    }

    // ==========================================
    // TAHAP 2: VERIFIKASI OTP
    // ==========================================
    if (action === "verify_otp") {
      if (!email || !otp) {
        return NextResponse.json(
          { message: "Email dan kode OTP wajib diisi." },
          { status: 400 },
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const record = await prisma.otp.findUnique({
        where: { email: cleanEmail },
      });

      if (!record) {
        return NextResponse.json(
          { message: "Data OTP tidak ditemukan. Silakan minta kode baru." },
          { status: 400 },
        );
      }

      if (record.blocked) {
        return NextResponse.json(
          {
            message:
              "Terlalu banyak salah memasukkan OTP. Silakan tunggu 2 menit.",
          },
          { status: 429 },
        );
      }

      if (record.expiresAt < new Date()) {
        return NextResponse.json(
          { message: "Kode OTP sudah kedaluwarsa." },
          { status: 400 },
        );
      }

      if (record.code !== otp.trim()) {
        const newAttempts = record.attempts + 1;
        const isBlocked = newAttempts >= 3;

        await prisma.otp.update({
          where: { email: cleanEmail },
          data: {
            attempts: newAttempts,
            blocked: isBlocked,
          },
        });

        if (isBlocked) {
          return NextResponse.json(
            {
              message:
                "Kode OTP salah 3 kali. Akses diblokir sementara selama 2 menit.",
            },
            { status: 429 },
          );
        }

        return NextResponse.json(
          { message: `Kode OTP salah. Sisa percobaan: ${3 - newAttempts}` },
          { status: 400 },
        );
      }

      return NextResponse.json({ success: true, message: "OTP valid." });
    }

    return NextResponse.json(
      { message: "Aksi tidak dikenal." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Admin OTP API Error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
