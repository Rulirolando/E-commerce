import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "../../auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session?.user?.id;
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId || userId !== user) {
      return NextResponse.json(
        { error: "User ID diperlukan" },
        { status: 400 },
      );
    }

    const sekarang = new Date();
    const duaHariLalu = new Date(sekarang);
    duaHariLalu.setDate(sekarang.getDate() - 2);

    // 1. CEK: Apakah ada pesanan yang HARUSNYA SUDAH TIBA?
    const ordersHarusTiba = await prisma.order.findMany({
      where: {
        buyerId: userId,
        status: "Dikirim",
        estimasiTiba: { not: null, lte: sekarang.toISOString() },
      },
    });

    for (const order of ordersHarusTiba) {
      const notifExist = await prisma.notification.findFirst({
        where: { orderId: order.id, title: { contains: "Tiba" } },
      });

      if (!notifExist) {
        await prisma.notification.create({
          data: {
            userId: userId,
            orderId: order.id,
            title: "🔔 Pesanan Sudah Tiba?",
            message: `Menurut estimasi, paket ${order.nama} sudah sampai. Silakan konfirmasi jika sudah diterima.`,
          },
        });
      }
    }

    // 2. CEK: Apakah sudah LEWAT 2 HARI dari estimasi? (Auto-Selesai)
    const expiredOrders = await prisma.order.findMany({
      where: {
        buyerId: userId,
        status: "Dikirim",
        estimasiTiba: { not: null, lte: duaHariLalu.toISOString() },
      },
    });

    for (const order of expiredOrders) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "Selesai" },
      });
    }

    // Ambil semua notifikasi milik user
    const notifications = await prisma.notification.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
    });

    // Ambil detail order secara manual berdasarkan orderId yang ada pada notifikasi
    const orderIds = notifications
      .map((n) => n.orderId)
      .filter((id): id is number => id !== null);

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: {
        id: true,
        nama: true,
        warna: true,
        ukuran: true,
        jumlah: true,
        harga: true,
        totalHarga: true,
        status: true,
      },
    });

    const orderMap = new Map(orders.map((o) => [o.id, o]));

    // Gabungkan data notifikasi dengan informasi order-nya
    const notificationsWithOrder = notifications.map((n) => ({
      ...n,
      order: n.orderId ? orderMap.get(n.orderId) || null : null,
    }));

    return NextResponse.json(notificationsWithOrder);
  } catch (error) {
    console.error("NOTIFICATION GET ERROR:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session?.user?.id;
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId || userId !== user) {
      return NextResponse.json(
        { error: "User ID diperlukan" },
        { status: 400 },
      );
    }

    await prisma.notification.updateMany({
      where: {
        userId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ message: "Notifikasi diperbarui" });
  } catch {
    return NextResponse.json(
      { error: "Gagal memperbarui data" },
      { status: 500 },
    );
  }
}
