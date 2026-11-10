import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

const PAID_STATUSES = ["Dibayar", "Dikemas", "Dikirim", "Selesai"];

async function checkAdmin() {
  const session = await auth();

  if (!session?.user?.email) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Akses ditolak." },
        { status: 401 },
      ),
    };
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Akses ditolak." },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const };
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    const access = await checkAdmin();

    if (!access.ok) return access.response;

    const exportType = request.nextUrl.searchParams.get("export");

    if (exportType === "orders") {
      const orders = await prisma.order.findMany({
        include: {
          buyer: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          produk: {
            include: {
              product: {
                include: {
                  owner: {
                    select: {
                      id: true,
                      username: true,
                    },
                  },
                },
              },
              images: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const header = [
        "ID Pesanan",
        "Tanggal",
        "Pembeli",
        "Email Pembeli",
        "Penjual",
        "Nama Produk",
        "Jumlah",
        "Total Harga",
        "Status",
        "ID Transaksi",
      ];

      const rows = orders.map((order) => [
        order.id,
        order.createdAt.toISOString(),
        order.buyer?.username ?? "",
        order.buyer?.email ?? "",
        order.produk?.product?.owner?.username ?? "",
        order.produk?.product?.nama ?? order.nama,
        order.jumlah,
        order.totalHarga,
        order.status,
        order.transactionId ?? "",
      ]);

      const csv = [header, ...rows]
        .map((row) => row.map(csvEscape).join(","))
        .join("\r\n");

      return new Response("\uFEFF" + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="laporan-pesanan.csv"',
        },
      });
    }

    const [
      totalUsers,
      totalProducts,
      activeProducts,
      hiddenProducts,
      removedProducts,
      totalOrders,
      paidOrders,
      products,
      recentOrders,
      allOrders,
      bankAccounts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.product.count({ where: { moderationStatus: "ACTIVE" } }),
      prisma.product.count({ where: { moderationStatus: "HIDDEN" } }),
      prisma.product.count({ where: { moderationStatus: "REMOVED" } }),
      prisma.order.count(),
      prisma.order.count({
        where: { status: { in: PAID_STATUSES } },
      }),
      prisma.product.findMany({
        include: {
          owner: {
            select: { id: true, username: true, email: true },
          },
          variations: {
            include: { images: true, sizes: true },
          },
          review: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.order.findMany({
        include: {
          buyer: {
            select: { id: true, username: true, email: true },
          },
          produk: {
            include: {
              product: {
                include: {
                  owner: {
                    select: { id: true, username: true, email: true },
                  },
                },
              },
              images: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.order.findMany({
        where: { status: { in: PAID_STATUSES } },
        select: { totalHarga: true, createdAt: true },
      }),
      prisma.bankAccount.findMany({
        include: {
          user: {
            select: { username: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalRevenue = allOrders.reduce(
      (sum, order) => sum + Number(order.totalHarga ?? 0),
      0,
    );

    const now = new Date();
    const monthlyRevenue = allOrders
      .filter((order) => {
        const date = new Date(order.createdAt);
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, order) => sum + Number(order.totalHarga ?? 0), 0);

    const statusCounts = await prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalProducts,
        activeProducts,
        hiddenProducts,
        removedProducts,
        totalOrders,
        paidOrders,
        totalRevenue,
        monthlyRevenue,
      },
      statusCounts: statusCounts.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
      products,
      recentOrders,
      bankAccounts,
    });
  } catch (error) {
    console.error("Admin GET error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data dashboard admin." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await checkAdmin();
    if (!access.ok) return access.response;

    const body = await request.json();
    const { action, productId, status, note, bankAccountId } = body;

    if (action === "verifyBankAccount") {
      if (!bankAccountId) {
        return NextResponse.json(
          { message: "ID Rekening bank tidak valid." },
          { status: 400 },
        );
      }

      const updatedBank = await prisma.bankAccount.update({
        where: { id: Number(bankAccountId) },
        data: { isVerified: true },
      });

      return NextResponse.json({
        message: "Rekening bank berhasil diverifikasi.",
        bankAccount: updatedBank,
      });
    }

    if (action !== "moderateProduct") {
      return NextResponse.json(
        { message: "Aksi tidak dikenal." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(Number(productId))) {
      return NextResponse.json(
        { message: "ID produk tidak valid." },
        { status: 400 },
      );
    }

    const allowedStatuses = ["ACTIVE", "HIDDEN", "REMOVED"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { message: "Status moderasi tidak valid." },
        { status: 400 },
      );
    }

    if (
      (status === "HIDDEN" || status === "REMOVED") &&
      !String(note ?? "").trim()
    ) {
      return NextResponse.json(
        { message: "Alasan moderasi wajib diisi." },
        { status: 400 },
      );
    }

    const product = await prisma.product.update({
      where: { id: Number(productId) },
      data: {
        moderationStatus: status,
        moderationNote: String(note ?? "").trim() || null,
        moderatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Moderasi produk berhasil diperbarui.",
      product,
    });
  } catch (error) {
    console.error("Admin PATCH error:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui moderasi." },
      { status: 500 },
    );
  }
}
