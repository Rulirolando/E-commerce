import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendToRabbitMQ } from "@/lib/rabbitmq";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (
      typeof body.order_id !== "string" ||
      typeof body.status_code !== "string" ||
      typeof body.gross_amount !== "string" ||
      typeof body.signature_key !== "string" ||
      typeof body.transaction_status !== "string"
    ) {
      return NextResponse.json(
        { message: "Format webhook tidak valid." },
        { status: 400 },
      );
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      console.error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");
      return NextResponse.json(
        { message: "Konfigurasi pembayaran bermasalah." },
        { status: 500 },
      );
    }

    const signatureInput =
      body.order_id + body.status_code + body.gross_amount + serverKey;

    const expectedSignature = crypto
      .createHash("sha512")
      .update(signatureInput)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(body.signature_key, "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return NextResponse.json(
        { message: "Tanda tangan pembayaran tidak valid." },
        { status: 403 },
      );
    }

    const orderId = body.order_id;
    const transactionStatus = body.transaction_status;

    let newStatus: string;

    if (
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && body.fraud_status === "accept")
    ) {
      newStatus = "Sudah dibayar";
    } else if (["deny", "cancel", "expire"].includes(transactionStatus)) {
      newStatus = "Gagal";
    } else if (transactionStatus === "pending") {
      newStatus = "Belum dibayar";
    } else {
      // Status lain tidak boleh digunakan untuk mengubah data pesanan.
      return NextResponse.json({ message: "Webhook diterima." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { transactionId: orderId },
      });

      if (orders.length === 0) {
        return { found: false, alreadyPaid: false, buyerId: null };
      }

      const expectedAmount = orders.reduce(
        (sum, order) => sum + order.totalHarga,
        0,
      );

      if (Number(body.gross_amount) !== expectedAmount) {
        throw new Error("NOMINAL_PEMBAYARAN_TIDAK_COCOK");
      }

      if (orders.every((order) => order.status === "Sudah dibayar")) {
        return {
          found: true,
          alreadyPaid: true,
          buyerId: orders[0].buyerId,
        };
      }

      if (newStatus === "Sudah dibayar") {
        for (const order of orders) {
          if (!order.produkId) continue;

          const updatedStock = await tx.variation.updateMany({
            where: {
              id: order.produkId,
              stok: { gte: order.jumlah },
            },
            data: {
              stok: { decrement: order.jumlah },
              terjual: { increment: order.jumlah },
            },
          });

          if (updatedStock.count !== 1) {
            throw new Error("STOK_TIDAK_MENCUKUPI");
          }
        }
      }

      await tx.order.updateMany({
        where: {
          transactionId: orderId,
          status: { not: "Sudah dibayar" },
        },
        data: { status: newStatus },
      });

      return {
        found: true,
        alreadyPaid: false,
        buyerId: orders[0].buyerId,
      };
    });

    if (!result.found) {
      return NextResponse.json(
        { message: "Pesanan tidak ditemukan." },
        { status: 404 },
      );
    }

    if (newStatus === "Sudah dibayar" && !result.alreadyPaid) {
      await sendToRabbitMQ("app_notification_queue_v2", {
        userId: result.buyerId!,
        title: "Pembayaran berhasil",
        message: `Pembayaran untuk pesanan ${orderId} berhasil diverifikasi.`,
        type: "PAYMENT",
      });
    }

    return NextResponse.json({ message: "Webhook diterima." });
  } catch (error) {
    console.error("MIDTRANS WEBHOOK ERROR:", error);

    if (
      error instanceof Error &&
      error.message === "NOMINAL_PEMBAYARAN_TIDAK_COCOK"
    ) {
      return NextResponse.json(
        { message: "Nominal pembayaran tidak cocok." },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "STOK_TIDAK_MENCUKUPI") {
      return NextResponse.json(
        { message: "Stok tidak mencukupi untuk menyelesaikan pesanan." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "Gagal memproses webhook." },
      { status: 500 },
    );
  }
}
