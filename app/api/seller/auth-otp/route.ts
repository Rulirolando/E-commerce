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
    const { action, email, otp } = await req.json();

    // ==========================================
    // TAHAP 1: VALIDASI & REQUEST OTP
    // ==========================================
    if (action === "request_otp") {
      if (!email) {
        return NextResponse.json(
          { message: "Email wajib diisi." },
          { status: 400 },
        );
      }

      const cleanEmail = email.trim().toLowerCase();

      const existingEmail = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!existingEmail) {
        return NextResponse.json(
          { message: "Email tidak terdaftar." },
          { status: 400 },
        );
      }

      const generatedOtp = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();

      // Masa berlaku 2 menit
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

      // Simpan atau reset status percobaan ke 0
      await prisma.otp.upsert({
        where: { email: cleanEmail },
        update: {
          code: generatedOtp,
          expiresAt,
          attempts: 0,
          blocked: false,
          type: "LOGIN",
        },
        create: {
          email: cleanEmail,
          username: existingEmail.username || cleanEmail.split("@")[0],
          password: "",
          code: generatedOtp,
          type: "LOGIN",
          expiresAt,
          attempts: 0,
          blocked: false,
        },
      });

      await transporter.sendMail({
        from: `"Rulshop Seller Center" <${process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER}>`,
        to: cleanEmail,
        subject: "Kode OTP Verifikasi Penjual - Rulshop",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4f46e5;">Verifikasi Akun Penjual</h2>
            <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
              ${generatedOtp}
            </div>
            <p>Kode ini berlaku selama <b>2 menit</b>.</p>
          </div>
        `,
      });

      return NextResponse.json({
        success: true,
        message: "Validasi berhasil. Kode OTP dikirim ke Gmail.",
      });
    }

    // ==========================================
    // TAHAP 2: VERIFIKASI OTP & CEK BATAS PERCOBAAN
    // ==========================================
    if (action === "verify_otp") {
      if (!email || !otp) {
        return NextResponse.json(
          { message: "Email dan OTP wajib diisi." },
          { status: 400 },
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const record = await prisma.otp.findUnique({
        where: { email: cleanEmail },
      });

      if (!record) {
        return NextResponse.json(
          { message: "Silakan minta kode OTP terlebih dahulu." },
          { status: 400 },
        );
      }

      // Cek apakah sudah diblokir karena salah 3 kali
      if (record.blocked || record.attempts >= 3) {
        return NextResponse.json(
          {
            message:
              "Anda sudah salah memasukkan OTP 3 kali. Akun terkunci sementara, silakan minta ulang OTP.",
          },
          { status: 400 },
        );
      }

      // Cek kedaluwarsa waktu (2 menit)
      if (record.expiresAt < new Date()) {
        return NextResponse.json(
          {
            message:
              "Kode OTP sudah kedaluwarsa (lebih dari 2 menit). Silakan kirim ulang.",
          },
          { status: 400 },
        );
      }

      // Jika OTP Salah
      if (record.code !== otp.trim()) {
        const newAttempts = record.attempts + 1;
        const isBlocked = newAttempts >= 3;

        await prisma.otp.update({
          where: { id: record.id },
          data: {
            attempts: newAttempts,
            blocked: isBlocked,
          },
        });

        const sisaKesempatan = 3 - newAttempts;
        if (isBlocked) {
          return NextResponse.json(
            {
              message:
                "Salah 3 kali! Akses diblokir, silakan minta ulang kode OTP.",
            },
            { status: 400 },
          );
        }

        return NextResponse.json(
          {
            message: `Kode OTP salah. Sisa kesempatan: ${sisaKesempatan} kali lagi.`,
          },
          { status: 400 },
        );
      }

      // Jika OTP Benar, hapus data OTP
      await prisma.otp.delete({ where: { id: record.id } }).catch(() => {});

      let user = await prisma.user.findUnique({ where: { email: cleanEmail } });
      const dummyPasswordHash = await bcrypt.hash("SELLER_OTP_BYPASS", 10);

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: cleanEmail,
            username: record.username,
            nama: record.username,
            password: dummyPasswordHash,
            emailVerified: new Date(),
            role: "SELLER",
          },
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            password: user.password || dummyPasswordHash,
            emailVerified: user.emailVerified || new Date(),
            role: user.role === "USER" ? "SELLER" : user.role,
          },
        });
      }

      await prisma.store.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          namaToko: record.username || user.username,
          noTelp: "",
          alamat: "",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Verifikasi berhasil.",
        userId: user.id,
      });
    }

    return NextResponse.json(
      { message: "Aksi tidak dikenal." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Seller Auth API Error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
