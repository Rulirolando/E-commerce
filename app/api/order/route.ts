import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/auth";
import { sendToRabbitMQ } from "@/lib/rabbitmq";
import midtransClient from "midtrans-client";
import type { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

function validText(value: unknown, max: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= max
  );
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const buyerId = session?.user?.id;

    if (!buyerId) {
      return NextResponse.json(
        { message: "Silakan login terlebih dahulu." },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { items, customerDetails } = body;

    if (!Array.isArray(items) || items.length < 1 || items.length > 30) {
      return NextResponse.json(
        { message: "Daftar produk tidak valid." },
        { status: 400 },
      );
    }

    if (
      !customerDetails ||
      !validText(customerDetails.namaPenerima, 100) ||
      !validText(customerDetails.telepon, 30) ||
      !validText(customerDetails.alamat, 1000)
    ) {
      return NextResponse.json(
        { message: "Informasi penerima tidak valid." },
        { status: 400 },
      );
    }

    const normalizedItems: {
      variantId: number;
      quantity: number;
      ukuran: string;
    }[] = [];

    for (const item of items) {
      if (
        !Number.isSafeInteger(item?.variantId) ||
        item.variantId <= 0 ||
        !Number.isSafeInteger(item?.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 100 ||
        !validText(item?.ukuran, 50)
      ) {
        return NextResponse.json(
          { message: "Data variasi atau jumlah tidak valid." },
          { status: 400 },
        );
      }

      normalizedItems.push({
        variantId: item.variantId,
        quantity: item.quantity,
        ukuran: item.ukuran.trim(),
      });
    }

    const variantIds = normalizedItems.map((item) => item.variantId);
    const uniqueVariantIds = [...new Set(variantIds)];

    const variants = await prisma.variation.findMany({
      where: { id: { in: uniqueVariantIds } },
      include: {
        product: {
          select: {
            id: true,
            nama: true,
            ownerId: true,
          },
        },
        sizes: {
          select: { size: true },
        },
        images: {
          select: { img: true },
          take: 1,
        },
      },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    for (const item of normalizedItems) {
      const variant = variantMap.get(item.variantId);

      if (!variant) {
        return NextResponse.json(
          { message: "Salah satu variasi produk tidak ditemukan." },
          { status: 404 },
        );
      }

      if (variant.product.ownerId === buyerId) {
        return NextResponse.json(
          { message: "Kamu tidak dapat membeli produk sendiri." },
          { status: 403 },
        );
      }

      if (!variant.sizes.some((size) => size.size === item.ukuran)) {
        return NextResponse.json(
          { message: `Ukuran tidak tersedia untuk ${variant.product.nama}.` },
          { status: 400 },
        );
      }
    }

    const counts = new Map<number, number>();

    for (const item of normalizedItems) {
      counts.set(
        item.variantId,
        (counts.get(item.variantId) ?? 0) + item.quantity,
      );
    }

    let totalHarga = 0;

    for (const [variantId, quantity] of counts) {
      const variant = variantMap.get(variantId)!;

      if (quantity > variant.stok) {
        return NextResponse.json(
          { message: `Stok ${variant.product.nama} tidak mencukupi.` },
          { status: 400 },
        );
      }

      totalHarga += variant.harga * quantity;
    }

    if (!Number.isSafeInteger(totalHarga) || totalHarga <= 0) {
      return NextResponse.json(
        { message: "Total pembayaran tidak valid." },
        { status: 400 },
      );
    }

    const transactionId = `RUL-${randomUUID()}`;

    const orderRows = normalizedItems.map((item) => {
      const variant = variantMap.get(item.variantId)!;

      return {
        nama: variant.product.nama,
        warna: variant.warna,
        ukuran: item.ukuran,
        harga: variant.harga,
        jumlah: item.quantity,
        totalHarga: variant.harga * item.quantity,
        gambar: variant.images[0]?.img ?? "",
        namaPenerima: customerDetails.namaPenerima.trim(),
        telepon: customerDetails.telepon.trim(),
        alamat: customerDetails.alamat.trim(),
        author: variant.product.ownerId,
        buyerId,
        produkId: variant.id,
        status: "Belum dibayar",
        transactionId,
      };
    });

    await prisma.order.createMany({ data: orderRows });

    let transaction;

    try {
      transaction = await snap.createTransaction({
        transaction_details: {
          order_id: transactionId,
          gross_amount: totalHarga,
        },
        custom_field1: buyerId,
        item_details: normalizedItems.map((item) => {
          const variant = variantMap.get(item.variantId)!;

          return {
            id: String(variant.id),
            price: variant.harga,
            quantity: item.quantity,
            name: variant.product.nama.slice(0, 50),
          };
        }),
        customer_details: {
          first_name: customerDetails.namaPenerima.trim(),
          phone: customerDetails.telepon.trim(),
          billing_address: {
            address: customerDetails.alamat.trim(),
          },
        },
      });
    } catch (paymentError) {
      await prisma.order.deleteMany({
        where: { transactionId, buyerId },
      });

      throw paymentError;
    }

    try {
      await sendToRabbitMQ("app_notification_queue_v2", {
        userId: buyerId,
        title: "Pesanan berhasil dibuat",
        message: `Pesanan ${transactionId} menunggu pembayaran.`,
        type: "PAYMENT",
      });
    } catch (queueError) {
      console.error("Gagal mengirim notifikasi order:", queueError);
    }

    return NextResponse.json(
      {
        token: transaction.token,
        transactionId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);

    return NextResponse.json(
      { message: "Gagal membuat pesanan atau transaksi pembayaran." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "Silakan login terlebih dahulu." },
        { status: 401 },
      );
    }

    const body = await req.json();

    const id = Number(body.id);
    const status = body.status;
    const estimasiTiba = body.estimasiTiba;

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json(
        { message: "ID pesanan tidak valid." },
        { status: 400 },
      );
    }

    if (!["Dikemas", "Dikirim", "Selesai"].includes(status)) {
      return NextResponse.json(
        {
          message:
            "Status pembayaran hanya boleh diubah melalui proses pembayaran tervalidasi.",
        },
        { status: 403 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        produk: {
          include: {
            product: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Pesanan tidak ditemukan." },
        { status: 404 },
      );
    }

    const pemilikProdukId = order.produk?.product.ownerId;

    if (status === "Dikemas") {
      if (!pemilikProdukId || pemilikProdukId !== userId) {
        return NextResponse.json(
          { message: "Hanya penjual produk ini yang dapat mengemas pesanan." },
          { status: 403 },
        );
      }

      // Validasi longgar (case-insensitive & trim)
      const currentStatusLower = order.status.trim().toLowerCase();
      const validPaidStatuses = ["sudah dibayar", "dibayar", "lunas"];

      if (!validPaidStatuses.includes(currentStatusLower)) {
        return NextResponse.json(
          {
            message: `Pesanan hanya dapat dikemas setelah pembayaran divalidasi. Status saat ini: ${order.status}`,
          },
          { status: 409 },
        );
      }
    }

    if (status === "Dikirim") {
      if (!pemilikProdukId || pemilikProdukId !== userId) {
        return NextResponse.json(
          { message: "Hanya penjual produk ini yang dapat mengirim pesanan." },
          { status: 403 },
        );
      }

      if (order.status.trim().toLowerCase() !== "dikemas") {
        return NextResponse.json(
          { message: "Pesanan harus dikemas terlebih dahulu sebelum dikirim." },
          { status: 409 },
        );
      }

      if (!validText(estimasiTiba, 100)) {
        return NextResponse.json(
          { message: "Estimasi tiba wajib diisi." },
          { status: 400 },
        );
      }
    }

    if (status === "Selesai") {
      if (order.buyerId !== userId) {
        return NextResponse.json(
          {
            message:
              "Hanya pembeli pesanan ini yang dapat mengonfirmasi selesai.",
          },
          { status: 403 },
        );
      }

      if (order.status.trim().toLowerCase() !== "dikirim") {
        return NextResponse.json(
          { message: "Pesanan harus berstatus Dikirim terlebih dahulu." },
          { status: 409 },
        );
      }

      if (!pemilikProdukId) {
        return NextResponse.json(
          { message: "Data penjual tidak ditemukan." },
          { status: 409 },
        );
      }
    }

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Update langsung menggunakan ID tanpa filter status string yang kaku
        const updated = await tx.order.updateMany({
          where: {
            id,
            ...(status === "Dikemas" || status === "Dikirim"
              ? {
                  produk: {
                    product: {
                      ownerId: userId,
                    },
                  },
                }
              : {
                  buyerId: userId,
                }),
          },
          data: {
            status,
            ...(status === "Dikirim"
              ? {
                  estimasiTiba: String(estimasiTiba).trim(),
                }
              : {}),
          },
        });

        if (updated.count !== 1) {
          throw new Error("STATUS_BERUBAH");
        }

        let payout = null;

        if (status === "Selesai") {
          if (!pemilikProdukId) {
            throw new Error("PENJUAL_TIDAK_DITEMUKAN");
          }

          const bankAccount = await tx.bankAccount.findUnique({
            where: {
              userId: pemilikProdukId,
            },
          });

          const amount = order.totalHarga;
          const fee = Math.round(amount * 0.02);
          const netAmount = amount - fee;

          if (
            !Number.isSafeInteger(amount) ||
            !Number.isSafeInteger(fee) ||
            !Number.isSafeInteger(netAmount) ||
            amount <= 0 ||
            netAmount <= 0
          ) {
            throw new Error("NOMINAL_PENCAIRAN_TIDAK_VALID");
          }

          payout = await tx.payout.upsert({
            where: {
              orderId: order.id,
            },
            create: {
              orderId: order.id,
              sellerId: pemilikProdukId,
              amount,
              fee,
              netAmount,
              referenceId: `RUL-PAYOUT-${order.id}`,
              status:
                bankAccount?.isVerified === true
                  ? "MENUNGGU_ADMIN"
                  : "MENUNGGU_REKENING",
              bankCode:
                bankAccount?.isVerified === true ? bankAccount.bankCode : null,
              bankName:
                bankAccount?.isVerified === true ? bankAccount.bankName : null,
              accountName:
                bankAccount?.isVerified === true
                  ? bankAccount.accountName
                  : null,
              accountNumberEnc:
                bankAccount?.isVerified === true
                  ? bankAccount.accountNumberEnc
                  : null,
            },
            update: {},
          });
        }

        const updatedOrder = await tx.order.findUnique({
          where: { id },
        });

        return {
          updatedOrder,
          payout,
        };
      },
    );

    try {
      await sendToRabbitMQ("app_notification_queue_v2", {
        userId: order.buyerId,
        orderId: order.id,
        title:
          status === "Dikemas"
            ? "Pesanan sedang dikemas"
            : status === "Dikirim"
              ? "Pesanan sedang dikirim"
              : "Pesanan telah selesai",
        message:
          status === "Dikemas"
            ? `Pesanan ${order.nama} sedang dikemas oleh penjual.`
            : status === "Dikirim"
              ? `Pesanan ${order.nama} telah dikirim.`
              : `Pesanan ${order.nama} telah dikonfirmasi selesai.`,
        type: status === "Selesai" ? "PAYMENT" : "SHIPPING",
      });
    } catch (queueError) {
      console.error("Gagal mengirim notifikasi status:", queueError);
    }

    return NextResponse.json({
      message:
        status === "Selesai"
          ? "Pesanan selesai. Pencatatan hak pencairan berhasil dibuat."
          : "Status pesanan berhasil diperbarui.",
      order: result.updatedOrder,
      payout: result.payout
        ? {
            id: result.payout.id,
            amount: result.payout.amount,
            fee: result.payout.fee,
            netAmount: result.payout.netAmount,
            status: result.payout.status,
            referenceId: result.payout.referenceId,
          }
        : null,
    });
  } catch (error) {
    console.error("UPDATE ORDER ERROR:", error);

    if (error instanceof Error && error.message === "STATUS_BERUBAH") {
      return NextResponse.json(
        { message: "Status pesanan berubah. Silakan muat ulang data." },
        { status: 409 },
      );
    }

    if (error instanceof Error && error.message === "PENJUAL_TIDAK_DITEMUKAN") {
      return NextResponse.json(
        { message: "Data penjual tidak ditemukan." },
        { status: 409 },
      );
    }

    if (
      error instanceof Error &&
      error.message === "NOMINAL_PENCAIRAN_TIDAK_VALID"
    ) {
      return NextResponse.json(
        { message: "Nominal pencairan tidak valid." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Gagal memperbarui pesanan." },
      { status: 500 },
    );
  }
}
