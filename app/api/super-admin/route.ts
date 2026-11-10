import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

async function checkSuperAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { message: "Silakan login terlebih dahulu." },
        { status: 401 },
      ),
    };
  }

  if (session.user.role !== "SUPER_ADMIN") {
    return {
      error: NextResponse.json(
        { message: "Fitur ini hanya untuk Super Admin." },
        { status: 403 },
      ),
    };
  }

  return { session };
}

// GET: mengambil daftar USER dan ADMIN
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

// PATCH: mengubah role USER <-> ADMIN
export async function PATCH(request: Request) {
  const access = await checkSuperAdmin();
  if (access.error) return access.error;

  let body: { userId?: unknown; role?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Format JSON tidak valid." },
      { status: 400 },
    );
  }

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

  try {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
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

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: `Role berhasil diubah menjadi ${role}.`,
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

  let body: { userId?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Format JSON tidak valid." },
      { status: 400 },
    );
  }

  const userId = body.userId;

  if (typeof userId !== "string" || !userId.trim()) {
    return NextResponse.json(
      { message: "ID pengguna wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    if (!target) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan atau sudah dihapus." },
        { status: 404 },
      );
    }

    // Super Admin tidak boleh dihapus melalui endpoint ini.
    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Akun SUPER_ADMIN tidak boleh dihapus." },
        { status: 403 },
      );
    }

    if (target.role !== "USER" && target.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Role akun tidak diizinkan untuk dihapus." },
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

    // P2003: penghapusan ditolak karena masih ada relasi data.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          message:
            "Akun belum dapat dihapus karena masih memiliki data terkait, seperti produk, pesanan, atau ulasan. Atur relasi atau kebijakan penghapusan di schema Prisma terlebih dahulu.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "Gagal menghapus akun pengguna." },
      { status: 500 },
    );
  }
}
