"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ProductImage = {
  id?: number;
  img: string;
};

type ProductSize = {
  size: string;
  variationId?: number;
};

type ProductVariation = {
  id: number;
  harga?: number;
  stok?: number;
  images: ProductImage[];
  sizes: ProductSize[];
};

type ProductOwner = {
  id: string;
  username: string;
  email?: string;
};

type AdminProduct = {
  id: number;
  nama: string;
  kategori: string;
  deskripsi?: string | null;
  createdAt: string;
  moderationStatus: string;
  moderationNote?: string | null;
  owner: ProductOwner | null;
  variations: ProductVariation[];
  review: {
    id: number;
  }[];
};

type AdminOrder = {
  id: number;
  nama?: string | null;
  gambar?: string | null;
  jumlah: number;
  totalHarga: number;
  status: string;
  createdAt: string;
  transactionId?: string | null;
  buyer: {
    id: string;
    username: string;
    email?: string;
  } | null;
  produk: {
    id: number;
    images: ProductImage[];
    product: {
      id: number;
      nama: string;
      owner: ProductOwner | null;
    } | null;
  } | null;
};

type BankAccount = {
  id: number;
  userId: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  accountNumberLast4: string;
  isVerified: boolean;
  user: {
    username: string;
    email?: string;
  } | null;
};

type DashboardData = {
  stats: {
    totalUsers: number;
    totalProducts: number;
    activeProducts: number;
    hiddenProducts: number;
    removedProducts: number;
    totalOrders: number;
    paidOrders: number;
    totalRevenue: number;
    monthlyRevenue: number;
  };
  statusCounts: {
    status: string;
    count: number;
  }[];
  products: AdminProduct[];
  recentOrders: AdminOrder[];
  bankAccounts: BankAccount[];
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const statusLabel: Record<string, string> = {
  ACTIVE: "Aktif",
  HIDDEN: "Disembunyikan",
  REMOVED: "Diturunkan",
  "Belum dibayar": "Belum dibayar",
  Dibayar: "Dibayar",
  Dikemas: "Dikemas",
  Dikirim: "Dikirim",
  Selesai: "Selesai",
  Dibatalkan: "Dibatalkan",
};

export default function AccessAdminPage() {
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState<
    "overview" | "products" | "orders" | "banks"
  >("overview");
  const [busyProduct, setBusyProduct] = useState<number | null>(null);
  const [busyBank, setBusyBank] = useState<number | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin", {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        router.replace("/");
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengambil data admin.");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function verifyBank(bankAccountId: number) {
    if (
      !window.confirm("Yakin ingin memverifikasi rekening bank penjual ini?")
    ) {
      return;
    }

    try {
      setBusyBank(bankAccountId);
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verifyBankAccount",
          bankAccountId,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Gagal verifikasi.");

      window.alert(result.message);
      await loadDashboard();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Gagal verifikasi.");
    } finally {
      setBusyBank(null);
    }
  }

  async function moderateProduct(productId: number, status: string, note = "") {
    if (status !== "ACTIVE" && !note.trim()) {
      const reason = window.prompt("Masukkan alasan moderasi produk:");
      if (!reason?.trim()) {
        window.alert("Alasan moderasi wajib diisi.");
        return;
      }
      note = reason.trim();
    }

    const actionText =
      status === "ACTIVE"
        ? "mengaktifkan kembali"
        : status === "HIDDEN"
          ? "menyembunyikan"
          : "menurunkan";

    if (!window.confirm(`Yakin ingin ${actionText} produk ini?`)) {
      return;
    }

    try {
      setBusyProduct(productId);

      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "moderateProduct",
          productId,
          status,
          note,
        }),
      });

      if (response.status === 401 || response.status === 403) {
        router.replace("/");
        return;
      }
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || "Moderasi gagal.");

      window.alert(result.message);
      await loadDashboard();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Moderasi gagal.");
    } finally {
      setBusyProduct(null);
    }
  }

  function exportOrders() {
    window.location.href = "/api/admin?export=orders";
  }

  const products = (data?.products ?? []).filter((product) => {
    const keyword = search.toLowerCase();
    const matchesSearch =
      String(product.nama ?? "")
        .toLowerCase()
        .includes(keyword) ||
      String(product.kategori ?? "")
        .toLowerCase()
        .includes(keyword) ||
      String(product.owner?.username ?? "")
        .toLowerCase()
        .includes(keyword);

    const matchesStatus =
      productFilter === "ALL" || product.moderationStatus === productFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading || !data || error) {
    return null;
  }

  const { stats } = data;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-linear-to-r from-blue-700 to-indigo-700 px-5 py-8 text-white md:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-medium text-blue-100">
            PANEL PENGELOLAAN TOKO
          </p>
          <h1 className="mt-2 text-3xl font-bold">Dashboard Admin</h1>
          <p className="mt-2 text-sm text-blue-100">
            Pantau produk, penjual, pembeli, rekening, dan seluruh pesanan.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 md:px-8">
        <nav className="mb-7 flex flex-wrap gap-2">
          {[
            { id: "overview", label: "Ringkasan" },
            { id: "products", label: "Moderasi Produk" },
            { id: "orders", label: "Semua Pesanan" },
            { id: "banks", label: "Verifikasi Rekening Bank" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(
                  tab.id as "overview" | "products" | "orders" | "banks",
                )
              }
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={() => void loadDashboard()}
            className="ml-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 cursor-pointer"
          >
            Muat Ulang
          </button>
        </nav>

        {activeTab === "overview" && (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Total Pengguna",
                  value: stats.totalUsers,
                  icon: "👥",
                },
                {
                  label: "Total Produk",
                  value: stats.totalProducts,
                  icon: "📦",
                },
                {
                  label: "Total Semua Pesanan",
                  value: stats.totalOrders,
                  icon: "🧾",
                },
                {
                  label: "Pesanan Dibayar",
                  value: stats.paidOrders,
                  icon: "✅",
                },
              ].map((item) => (
                <article
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                  <p className="mt-4 text-3xl font-bold">
                    {item.value.toLocaleString("id-ID")}
                  </p>
                </article>
              ))}
            </section>

            <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold">
                  Pesanan Terbaru dari Semua Pengguna
                </h2>
                <button
                  onClick={() => setActiveTab("orders")}
                  className="text-sm font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Lihat semua pesanan →
                </button>
              </div>
              <OrdersTable orders={data.recentOrders.slice(0, 5)} />
            </section>
          </>
        )}

        {activeTab === "banks" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold mb-1">
              Daftar Rekening Bank Penjual
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              Setujui atau verifikasi rekening bank yang didaftarkan oleh
              penjual agar mereka bisa mencairkan saldo.
            </p>

            {!data.bankAccounts || data.bankAccounts.length === 0 ? (
              <p className="py-8 text-center text-slate-500 italic">
                Belum ada rekening bank yang didaftarkan penjual.
              </p>
            ) : (
              <div className="space-y-4">
                {data.bankAccounts.map((bank) => (
                  <div
                    key={bank.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50"
                  >
                    <div>
                      <p className="font-bold text-base text-slate-800">
                        {bank.bankName} ({bank.bankCode})
                      </p>
                      <p className="text-sm text-slate-600">
                        Atas Nama:{" "}
                        <span className="font-semibold">
                          {bank.accountName}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        No. Rekening: ****{bank.accountNumberLast4} · Penjual:{" "}
                        {bank.user?.username ?? "Tidak diketahui"} (
                        {bank.user?.email})
                      </p>
                      <p className="mt-2 text-xs font-medium">
                        Status:{" "}
                        <span
                          className={
                            bank.isVerified
                              ? "text-emerald-600 font-semibold"
                              : "text-amber-600 font-semibold"
                          }
                        >
                          {bank.isVerified
                            ? "Terverifikasi ✅"
                            : "Belum Diverifikasi ⚠️"}
                        </span>
                      </p>
                    </div>

                    {!bank.isVerified && (
                      <button
                        disabled={busyBank === bank.id}
                        onClick={() => verifyBank(bank.id)}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        {busyBank === bank.id
                          ? "Memproses..."
                          : "Verifikasi Sekarang"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "products" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama produk, kategori, atau penjual..."
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
              <select
                value={productFilter}
                onChange={(event) => setProductFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="HIDDEN">Disembunyikan</option>
                <option value="REMOVED">Diturunkan</option>
              </select>
            </div>

            <div className="mt-4 space-y-4">
              {products.map((product) => {
                const image = product.variations?.[0]?.images?.[0]?.img;
                const status = product.moderationStatus ?? "ACTIVE";

                return (
                  <article
                    key={product.id}
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 md:flex-row"
                  >
                    <div className="h-32 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 md:w-36">
                      {image ? (
                        <Image
                          src={image}
                          alt={product.nama}
                          className="h-full w-full object-cover"
                          width={300}
                          height={300}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                          Tidak ada foto
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-bold">{product.nama}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Kategori: {product.kategori || "-"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700"
                              : status === "HIDDEN"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {statusLabel[status] ?? status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm">
                        Penjual:{" "}
                        <span className="font-semibold">
                          {product.owner?.username ?? "Tidak diketahui"}
                        </span>
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {status !== "ACTIVE" && (
                          <button
                            disabled={busyProduct === product.id}
                            onClick={() =>
                              void moderateProduct(product.id, "ACTIVE")
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                          >
                            Aktifkan
                          </button>
                        )}
                        {status !== "HIDDEN" && (
                          <button
                            disabled={busyProduct === product.id}
                            onClick={() =>
                              void moderateProduct(product.id, "HIDDEN")
                            }
                            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
                          >
                            Sembunyikan
                          </button>
                        )}
                        {status !== "REMOVED" && (
                          <button
                            disabled={busyProduct === product.id}
                            onClick={() =>
                              void moderateProduct(product.id, "REMOVED")
                            }
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                          >
                            Turunkan Produk
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === "orders" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Seluruh Pesanan</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Total semua pesanan:{" "}
                  <strong>{stats.totalOrders.toLocaleString("id-ID")}</strong>
                </p>
              </div>
              <button
                onClick={exportOrders}
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                Ekspor Semua Pesanan (CSV)
              </button>
            </div>

            <div className="mt-5">
              <OrdersTable orders={data.recentOrders} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function OrdersTable({ orders }: { orders: AdminOrder[] }) {
  if (orders.length === 0) {
    return (
      <p className="py-8 text-center text-slate-500">Belum ada pesanan.</p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {orders.map((order) => {
        const product = order.produk?.product;
        const image = order.produk?.images?.[0]?.img || order.gambar;

        return (
          <article
            key={order.id}
            className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row"
          >
            <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-24">
              {image ? (
                <Image
                  src={image}
                  width={300}
                  height={300}
                  alt={product?.nama ?? order.nama ?? "Foto produk"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  Tidak ada foto
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold">
                    {product?.nama ?? order.nama ?? "Produk"}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Pesanan #{order.id}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {statusLabel[order.status] ?? order.status}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <p>
                  Pembeli:{" "}
                  <strong>{order.buyer?.username ?? "Tidak diketahui"}</strong>
                </p>
                <p>
                  Penjual:{" "}
                  <strong>
                    {product?.owner?.username ?? "Tidak diketahui"}
                  </strong>
                </p>
                <p>Jumlah: {order.jumlah}</p>
                <p className="font-semibold">
                  Total: {formatRupiah(Number(order.totalHarga ?? 0))}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
