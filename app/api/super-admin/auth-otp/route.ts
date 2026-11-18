import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

// Konfigurasi Nodemailer (pastikan variabel environment sudah diset di .env Anda)
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
    // TAHAP 1: REQUEST OTP (Kirim ke Gmail)
    // ==========================================
    if (action === "request_otp") {
      if (!email) {
        return NextResponse.json(
          { message: "Email wajib diisi." },
          { status: 400 },
        );
      }

      const cleanEmail = email.trim().toLowerCase();

      // Cari user dan pastikan rolenya SUPER_ADMIN
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!user || user.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { message: "Kredensial salah atau bukan Super Admin." },
          { status: 403 },
        );
      }

      // Cek apakah sudah ada data OTP sebelumnya untuk mencegah spam / batasan 2 menit
      const existingOtp = await prisma.otp.findUnique({
        where: { email: cleanEmail },
      });

      const now = new Date();

      if (existingOtp) {
        // Cek apakah akun terblokir karena salah 3 kali
        if (existingOtp.blocked) {
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
            // Jika sudah lewat 2 menit, reset blokir dan percobaan
            await prisma.otp.update({
              where: { email: cleanEmail },
              data: { blocked: false, attempts: 0 },
            });
          }
        }
      }

      // Generate 6 digit kode OTP acak
      const generatedOtp = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Berlaku 5 menit

      // Simpan atau perbarui data ke tabel Otp sesuai skema Anda
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

      // Kirim email menggunakan Nodemailer
      try {
        await transporter.sendMail({
          from: `"Rulshop Security" <${process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER}>`,
          to: cleanEmail,
          subject: "Kode OTP Login Super Admin - Rulshop",
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #4f46e5;">Verifikasi Login Super Admin</h2>
              <p>Halo, <b>${user.username || "Super Admin"}</b>,</p>
              <p>Berikut adalah kode OTP Anda untuk masuk ke Dashboard Super Admin Rulshop:</p>
              <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
                ${generatedOtp}
              </div>
              <p>Kode ini berlaku selama <b>5 menit</b>. Jangan berikan kode ini kepada siapa pun.</p>
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

      // Cek apakah akun terblokir
      if (record.blocked) {
        return NextResponse.json(
          {
            message:
              "Terlalu banyak salah memasukkan OTP. Silakan tunggu 2 menit.",
          },
          { status: 429 },
        );
      }

      // Cek masa kedaluwarsa
      if (record.expiresAt < new Date()) {
        return NextResponse.json(
          { message: "Kode OTP sudah kedaluwarsa." },
          { status: 400 },
        );
      }

      // Jika kode salah
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

      // Jika benar, hapus record OTP agar tidak bisa dipakai ulang
      await prisma.otp.delete({ where: { email: cleanEmail } }).catch(() => {});

      return NextResponse.json({ success: true, message: "OTP valid." });
    }

    return NextResponse.json(
      { message: "Aksi tidak dikenal." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Super Admin OTP API Error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
