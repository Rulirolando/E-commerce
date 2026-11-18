import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

// Konfigurasi Nodemailer untuk mengirim email ke Admin baru
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_SERVER_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

async function checkSuperAdmin() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return {
      error: NextResponse.json(
        { message: "Akses ditolak. Khusus Super Admin." },
        { status: 403 },
      ),
    };
  }

  return { session };
}

// GET: Mengambil daftar USER dan ADMIN beserta adminCode-nya
export async function GET() {
  const access = await checkSuperAdmin();
  if (access.error) return access.error;

  try {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ["USER", "ADMIN"] },
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        adminCode: true,
      },
      orderBy: { username: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data pengguna." },
      { status: 500 },
    );
  }
}

// PATCH: Mengubah role USER <-> ADMIN dan mengirim email kode akses
export async function PATCH(request: Request) {
  const access = await checkSuperAdmin();
  if (access.error) return access.error;

  try {
    const body = await request.json();
    const { userId, role } = body;

    if (
      typeof userId !== "string" ||
      !userId.trim() ||
      (role !== "USER" && role !== "ADMIN")
    ) {
      return NextResponse.json(
        { message: "ID pengguna atau role tidak valid." },
        { status: 400 },
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        adminCode: true,
        email: true,
        username: true,
      },
    });

    if (!target) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan." },
        { status: 404 },
      );
    }

    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Role Super Admin tidak dapat diubah." },
        { status: 403 },
      );
    }

    // Jika dijadikan ADMIN: Gunakan kode yang sudah ada atau buat baru jika belum punya
    let generatedCode = target.adminCode;
    if (role === "ADMIN") {
      if (!generatedCode) {
        generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      }
    } else {
      generatedCode = null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role,
        adminCode: generatedCode,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        adminCode: true,
      },
    });

    // Jika role diubah menjadi ADMIN, kirimkan email berisi kode akses ke Gmail user tersebut
    if (role === "ADMIN" && generatedCode) {
      try {
        await transporter.sendMail({
          from: `"Rulshop Security" <${process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER}>`,
          to: target.email,
          subject: "Hak Akses Admin Rulshop & Kode Akses",
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #2563eb;">Selamat! Anda Diangkat Menjadi Admin</h2>
              <p>Halo, <b>${target.username || "Pengguna"}</b>,</p>
              <p>Super Admin telah memberikan hak akses <b>ADMIN</b> kepada akun Anda di Rulshop.</p>
              <p>Berikut adalah <b>Kode Akses Admin</b> Anda untuk melakukan login:</p>
              <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
                ${generatedCode}
              </div>
              <p>Gunakan kode ini bersama email dan password Anda pada halaman login Admin.</p>
            </div>
          `,
        });
      } catch (mailError) {
        console.error("Gagal mengirim email kode akses admin:", mailError);
        // Role tetap terupdate di database, namun kita beri informasi jika email gagal terkirim
        return NextResponse.json({
          message: `Role diubah menjadi ADMIN, namun gagal mengirim email ke ${target.email}. Kode akses: ${generatedCode}`,
          user: updatedUser,
        });
      }
    }

    return NextResponse.json({
      message:
        role === "ADMIN"
          ? `Role diubah menjadi ADMIN. Kode akses telah dikirim ke Gmail: ${target.email}`
          : "Role berhasil dikembalikan menjadi USER.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update user role error:", error);
    return NextResponse.json(
      { message: "Gagal mengubah role pengguna." },
      { status: 500 },
    );
  }
}

// DELETE: menghapus akun USER atau ADMIN
export async function DELETE(request: Request) {
  const access = await checkSuperAdmin();
  if (access.error) return access.error;

  try {
    const body = await request.json();
    const userId = body.userId;

    if (typeof userId !== "string" || !userId.trim()) {
      return NextResponse.json(
        { message: "ID pengguna wajib diisi." },
        { status: 400 },
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, role: true },
    });

    if (!target) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan atau sudah dihapus." },
        { status: 404 },
      );
    }

    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Akun SUPER_ADMIN tidak boleh dihapus." },
        { status: 403 },
      );
    }

    await prisma.user.delete({
      where: { id: target.id },
    });

    return NextResponse.json({
      success: true,
      message: `Akun ${target.username || target.email} berhasil dihapus.`,
      deletedUserId: target.id,
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { message: "Gagal menghapus akun pengguna." },
      { status: 500 },
    );
  }
}
