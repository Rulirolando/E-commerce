import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const signature = crypto
      .createHash("sha512")
      .update(
        `${body.order_id}${body.status_code}${body.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`,
      )
      .digest("hex");

    if (signature !== body.signature_key) {
      return NextResponse.json(
        { message: "Invalid signature" },
        { status: 403 },
      );
    }

    const transactionStatus = body.transaction_status;
    const orderId = body.order_id;

    let newStatus = "Belum dibayar";

    if (transactionStatus === "capture" || transactionStatus === "settlement") {
      newStatus = "Sudah dibayar";
    } else if (
      transactionStatus === "deny" ||
      transactionStatus === "cancel" ||
      transactionStatus === "expire"
    ) {
      newStatus = "Gagal";
    } else if (transactionStatus === "pending") {
      newStatus = "Menunggu Pembayaran";
    }

    await prisma.$transaction(async (tx) => {
      // Ambil data order SAAT INI untuk mengecek status lama
      const existingOrders = await tx.order.findMany({
        where: { transactionId: orderId },
      });

      if (existingOrders.length === 0) return;

      // CEK: Jika status lama belum "Sudah dibayar" DAN status baru adalah "Sudah dibayar"
      // Ini mencegah stok berkurang berkali-kali jika Midtrans kirim webhook ulang
      const isFirstTimePaid =
        existingOrders[0].status !== "Sudah dibayar" &&
        newStatus === "Sudah dibayar";

      if (isFirstTimePaid) {
        for (const order of existingOrders) {
          if (order.produkId) {
            // UPDATE STOK DI TABEL VARIATION
            await tx.variation.update({
              where: { id: order.produkId },
              data: {
                stok: { decrement: order.jumlah },
                terjual: { increment: order.jumlah },
              },
            });
          }
        }
        // 2. BUAT NOTIFIKASI (Hanya saat pertama kali bayar berhasil)
        await tx.notification.create({
          data: {
            userId: existingOrders[0].buyerId,
            title: "Pembayaran Berhasil!",
            message: `Pembayaran pesanan ${orderId} telah kami terima. Barang akan segera diproses.`,
          },
        });
      }

      // Update status semua order dengan transactionId tersebut
      await tx.order.updateMany({
        where: { transactionId: orderId },
        data: { status: newStatus },
      });
    });

    return NextResponse.json({ message: "Webhook received" });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
