"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState, useTransition, useCallback } from "react";
import { MdAccessTime } from "react-icons/md";
import Navbar from "../../components/navbar";

interface Img {
  id: number;
  variationId: number;
  img: string;
}

interface Product {
  id: number;
  nama: string;
  deskripsi?: string;
  ownerId: string;
}

interface Variant {
  id: number;
  warna: string;
  harga: number;
  stok: number;
  images: Img[];
  product?: Product;
}

interface Order {
  id: number;
  nama: string;
  warna: string;
  ukuran: string;
  harga: number;
  jumlah: number;
  totalHarga: number;
  gambar: string;
  status: string;
  estimasiTiba?: string;
  namaPenerima: string;
  telepon: string;
  alamat: string;
  author: string;
  createdAt: string;
  produkId?: number;
  produk?: Variant;
}

interface PayoutItem {
  id: string;
  orderId: number;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  referenceId: string;
  order?: {
    id: number;
    nama: string;
  };
}

interface PayoutSummary {
  totalPenjualan: number;
  totalKomisi: number;
  totalBersih: number;
  menunggu: number;
  berhasil: number;
}

interface PayoutsResponse {
  payouts: PayoutItem[];
  summary: PayoutSummary;
}

interface BankAccount {
  id: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  accountNumberLast4: string;
  isVerified: boolean;
}

type MenuTarget =
  | "semuapesanan"
  | "belumdibayarpesanan"
  | "dibayarpesanan"
  | "dikemaspesanan"
  | "dikirimpesanan"
  | "selesaipesanan"
  | "pencairansaldo";

const PAID_STATUSES = [
  "Sudah dibayar",
  "Dibayar",
  "Dikemas",
  "Dikirim",
  "Selesai",
];

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function DetailPage() {
  const { data: session } = useSession();

  const [dataPesanan, setDataPesanan] = useState<Order[]>([]);
  const [payoutsData, setPayoutsData] = useState<PayoutsResponse>({
    payouts: [],
    summary: {
      totalPenjualan: 0,
      totalKomisi: 0,
      totalBersih: 0,
      menunggu: 0,
      berhasil: 0,
    },
  });

  // State Rekening Bank Penjual
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [bankForm, setBankForm] = useState({
    bankCode: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
  });
  const [loadingBank, setLoadingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  // State Loading Per Order saat Ubah Status & Pencairan Saldo
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [cahingPayoutId, setCairingPayoutId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [estimasiWaktu, setEstimasiWaktu] = useState<Record<number, string>>(
    {},
  );
  const [activePesananMenu, setActivePesananMenu] =
    useState<MenuTarget>("semuapesanan");

  const currentUser = session;

  const filterStatusMap: Record<MenuTarget, string | null> = {
    semuapesanan: null,
    belumdibayarpesanan: "Belum dibayar",
    dibayarpesanan: "Sudah dibayar",
    dikemaspesanan: "Dikemas",
    dikirimpesanan: "Dikirim",
    selesaipesanan: "Selesai",
    pencairansaldo: null,
  };

  const fetchOrdersAndPayouts = useCallback(async () => {
    const userId = session?.user?.id;

    if (!userId) {
      setDataPesanan([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadingBank(true);

    try {
      const [resOrder, resPayout, resBank] = await Promise.all([
        fetch(`/api/order/produk/${userId}`, { cache: "no-store" }),
        fetch(`/api/profile/payout`, { cache: "no-store" }),
        fetch(`/api/profile/bank-account`, { cache: "no-store" }),
      ]);

      if (resOrder.ok) {
        const result = await resOrder.json();
        if (Array.isArray(result)) setDataPesanan(result);
      }

      if (resPayout.ok) {
        const payoutResult = await resPayout.json();
        setPayoutsData(payoutResult);
      }

      if (resBank.ok) {
        const bankResult = await resBank.json();
        setBankAccount(bankResult.bankAccount || null);
        if (bankResult.bankAccount) {
          setBankForm({
            bankCode: bankResult.bankAccount.bankCode || "",
            bankName: bankResult.bankAccount.bankName || "",
            accountName: bankResult.bankAccount.accountName || "",
            accountNumber: "",
          });
        }
      }
    } catch (error) {
      console.error(
        "Gagal mengambil data pesanan, payout, atau rekening:",
        error,
      );
    } finally {
      setLoading(false);
      setLoadingBank(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    void fetchOrdersAndPayouts();
  }, [fetchOrdersAndPayouts]);

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !bankForm.bankCode ||
      !bankForm.bankName ||
      !bankForm.accountName ||
      !bankForm.accountNumber
    ) {
      alert("Semua data rekening wajib diisi.");
      return;
    }

    setSavingBank(true);
    try {
      const res = await fetch("/api/profile/bank-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menyimpan rekening.");

      alert(data.message || "Rekening berhasil disimpan.");
      setBankForm((prev) => ({ ...prev, accountNumber: "" }));
      await fetchOrdersAndPayouts();
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`Gagal: ${error.message}`);
      } else {
        alert("Terjadi kesalahan saat menyimpan rekening.");
      }
    } finally {
      setSavingBank(false);
    }
  };

  const totalOrders = dataPesanan.length;

  const paidOrders = dataPesanan.filter((order) =>
    PAID_STATUSES.includes(order.status),
  );

  const totalRevenue = paidOrders.reduce(
    (total, order) =>
      total + Number(order.totalHarga || order.harga * order.jumlah || 0),
    0,
  );

  const completedOrders = dataPesanan.filter(
    (order) => order.status === "Selesai",
  ).length;

  const handleStatusChange = async (id: number, statusBaru: string) => {
    const estimasi = estimasiWaktu[id];

    if (statusBaru === "Dikirim" && !estimasi) {
      alert("Harap masukkan estimasi tanggal tiba terlebih dahulu!");
      return;
    }

    setUpdatingOrderId(id);
    try {
      const res = await fetch("/api/order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: statusBaru,
          estimasiTiba: estimasi || null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Gagal memperbarui status pesanan.");
      }

      alert(`Status pesanan berhasil diperbarui ke '${statusBaru}'!`);
      await fetchOrdersAndPayouts();
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`Error: ${error.message}`);
      } else {
        alert("Terjadi kesalahan saat memperbarui status.");
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCairkanSaldo = async (payoutId: string) => {
    if (!bankAccount) {
      alert("Harap daftarkan rekening bank terlebih dahulu di bawah.");
      return;
    }

    const confirmCair = confirm(
      "Apakah Anda ingin mencairkan dana pesanan ini ke rekening Anda?",
    );
    if (!confirmCair) return;

    setCairingPayoutId(payoutId);
    try {
      const res = await fetch("/api/profile/payout/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mencairkan dana.");

      alert(data.message);
      await fetchOrdersAndPayouts();
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`Gagal: ${error.message}`);
      } else {
        alert("Gagal memproses pencairan dana.");
      }
    } finally {
      setCairingPayoutId(null);
    }
  };

  const filteredPesanan = dataPesanan.filter((order) => {
    const targetStatus = filterStatusMap[activePesananMenu];
    return targetStatus ? order.status === targetStatus : true;
  });

  const getNextStatus = (currentStatus: string): string | null => {
    switch (currentStatus) {
      case "Sudah dibayar":
      case "Dibayar":
        return "Dikemas";
      case "Dikemas":
        return "Dikirim";
      default:
        return null;
    }
  };

  const FilterButton = ({
    target,
    label,
  }: {
    target: MenuTarget;
    label: string;
  }) => (
    <button
      onClick={() => startTransition(() => setActivePesananMenu(target))}
      className={`cursor-pointer rounded-lg border p-2 px-3 text-sm transition-colors dark:border-slate-700 ${
        activePesananMenu === target
          ? "bg-blue-900 font-semibold text-white dark:bg-blue-700"
          : "bg-blue-950 text-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen w-full bg-blue-100 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Navbar className="fixed z-50" currentUser={currentUser} />

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-24 md:px-8">
        <header className="mb-7">
          <p className="text-sm font-semibold tracking-wide text-blue-700 dark:text-blue-400">
            RULSHOP
          </p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">
            Dashboard Penjualan & Saldo
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Pantau penghasilan, pesanan masuk, dan cairkan saldo penjualan Anda.
          </p>
        </header>

        {loading ? (
          <div className="py-16 text-center text-slate-500">
            Memuat statistik penjualan...
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total Pesanan",
                value: totalOrders.toLocaleString("id-ID"),
                description: "Semua pesanan masuk",
                icon: "🧾",
                color: "bg-blue-100 dark:bg-blue-950",
              },
              {
                label: "Total Penghasilan",
                value: formatRupiah(totalRevenue),
                description: "Pesanan yang sudah dibayar",
                icon: "💰",
                color: "bg-emerald-100 dark:bg-emerald-950",
              },
              {
                label: "Saldo Dapat Dicairkan",
                value: formatRupiah(payoutsData.summary.menunggu || 0),
                description: "Siap ditarik ke rekening",
                icon: "💸",
                color: "bg-indigo-100 dark:bg-indigo-950",
              },
              {
                label: "Pesanan Selesai",
                value: completedOrders.toLocaleString("id-ID"),
                description: "Transaksi berstatus selesai",
                icon: "✅",
                color: "bg-amber-100 dark:bg-amber-950",
              },
            ].map((item) => (
              <article
                key={item.label}
                className="min-w-0 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {item.label}
                  </p>
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl ${item.color}`}
                  >
                    {item.icon}
                  </div>
                </div>
                <p className="mt-4 text-xl font-bold md:text-2xl">
                  {item.value}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {item.description}
                </p>
              </article>
            ))}
          </section>
        )}

        {/* KELOLA PESANAN & PENCAIRAN */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold">Kelola Pesanan Toko Saya</h2>
          <p className="mb-6 mt-2 text-sm text-slate-600 dark:text-slate-400">
            Kelola pesanan masuk dan cairkan saldo penjualan Anda.
          </p>

          {/* MENU FILTER */}
          <div className="mb-6 flex flex-wrap gap-2">
            <FilterButton target="semuapesanan" label="Semua" />
            <FilterButton target="belumdibayarpesanan" label="Belum Dibayar" />
            <FilterButton target="dibayarpesanan" label="Sudah Dibayar" />
            <FilterButton target="dikemaspesanan" label="Dikemas" />
            <FilterButton target="dikirimpesanan" label="Dikirim" />
            <FilterButton target="selesaipesanan" label="Selesai" />
            <FilterButton target="pencairansaldo" label="💰 Pencairan Saldo" />

            <button
              onClick={() => void fetchOrdersAndPayouts()}
              className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              Muat Ulang
            </button>
          </div>

          {/* TAB PENCAIRAN SALDO & REKENING BANK */}
          {activePesananMenu === "pencairansaldo" ? (
            <div className="flex flex-col gap-6">
              {/* PENGATURAN REKENING BANK */}
              <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-lg font-bold">Rekening Bank Penjual</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Tambahkan atau perbarui rekening tujuan pencairan dana hasil
                  penjualan toko Anda.
                </p>

                {loadingBank ? (
                  <p className="text-sm text-slate-500">Memuat rekening...</p>
                ) : (
                  <>
                    {bankAccount && (
                      <div className="mb-4 rounded-lg bg-blue-50 dark:bg-slate-800 p-4 border border-blue-100 dark:border-slate-700">
                        <p className="font-semibold text-sm">
                          {bankAccount.bankName} ({bankAccount.bankCode})
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {bankAccount.accountName}
                        </p>
                        <p className="text-xs text-slate-500">
                          Nomor Rekening: ****{bankAccount.accountNumberLast4}
                        </p>
                        <p className="mt-2 text-xs font-medium">
                          Status:{" "}
                          <span
                            className={
                              bankAccount.isVerified
                                ? "text-emerald-600 font-semibold"
                                : "text-amber-600 font-semibold"
                            }
                          >
                            {bankAccount.isVerified
                              ? "Terverifikasi ✅"
                              : "Belum terverifikasi (Menunggu verifikasi admin)"}
                          </span>
                        </p>
                      </div>
                    )}

                    <form
                      onSubmit={handleSaveBankAccount}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                          Kode Bank (Contoh: BCA, BNI, JAGO)
                        </label>
                        <input
                          type="text"
                          value={bankForm.bankCode}
                          onChange={(e) =>
                            setBankForm({
                              ...bankForm,
                              bankCode: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="BCA"
                          className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                          Nama Bank
                        </label>
                        <input
                          type="text"
                          value={bankForm.bankName}
                          onChange={(e) =>
                            setBankForm({
                              ...bankForm,
                              bankName: e.target.value,
                            })
                          }
                          placeholder="Bank Central Asia"
                          className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                          Nama Pemilik Rekening
                        </label>
                        <input
                          type="text"
                          value={bankForm.accountName}
                          onChange={(e) =>
                            setBankForm({
                              ...bankForm,
                              accountName: e.target.value,
                            })
                          }
                          placeholder="Sesuai buku tabungan"
                          className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                          Nomor Rekening
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={bankForm.accountNumber}
                          onChange={(e) =>
                            setBankForm({
                              ...bankForm,
                              accountNumber: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          placeholder="Masukkan nomor rekening"
                          className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={savingBank}
                          className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400 cursor-pointer transition-colors"
                        >
                          {savingBank
                            ? "Menyimpan..."
                            : "Simpan / Perbarui Rekening"}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>

              {/* DAFTAR RIWAYAT PENCAIRAN */}
              <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-lg font-bold">Daftar Saldo & Pencairan</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Klik tombol &quot;Cairkan Saldo Sekarang&quot; untuk
                  mengirimkan dana hasil penjualan ke rekening Anda.
                </p>

                {payoutsData.payouts.length === 0 ? (
                  <p className="text-sm text-slate-500 italic py-6 text-center">
                    Belum ada riwayat pencairan saldo.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {payoutsData.payouts.map((item) => {
                      const isThisCairing = cahingPayoutId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800"
                        >
                          <div>
                            <p className="font-bold text-sm">
                              Pesanan #{item.orderId} -{" "}
                              {item.order?.nama || "Produk"}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Jumlah Bersih (Net):{" "}
                              <span className="font-semibold text-emerald-600">
                                {formatRupiah(item.netAmount)}
                              </span>{" "}
                              (Komisi platform 2%: {formatRupiah(item.fee)})
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Status:{" "}
                              <span className="font-medium uppercase">
                                {item.status}
                              </span>
                            </p>
                          </div>

                          {item.status === "MENUNGGU_ADMIN" ||
                          item.status === "MENUNGGU_REKENING" ? (
                            <button
                              onClick={() => handleCairkanSaldo(item.id)}
                              disabled={isThisCairing}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                            >
                              {isThisCairing
                                ? "Memproses..."
                                : "Cairkan Saldo Sekarang"}
                            </button>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full">
                              Berhasil Dicairkan ✅
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : /* DAFTAR PESANAN BIASA */
          loading || isPending ? (
            <div className="py-12 text-center text-slate-500">
              Memuat pesanan...
            </div>
          ) : filteredPesanan.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-slate-500 dark:border-slate-700">
              Tidak ada pesanan dalam kategori ini.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredPesanan.map((order) => {
                const imageUrl =
                  order.gambar ||
                  order.produk?.images?.[0]?.img ||
                  "/placeholder.png";

                const nextStatus = getNextStatus(order.status);
                const isThisUpdating = updatingOrderId === order.id;

                return (
                  <article
                    key={order.id}
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3 text-xs dark:border-slate-800">
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-200">
                          Penerima: {order.namaPenerima} ({order.telepon})
                        </p>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">
                          Alamat: {order.alamat}
                        </p>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">
                          Tanggal:{" "}
                          {new Date(order.createdAt).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                        {order.status}
                      </span>
                    </div>

                    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                          <Image
                            src={imageUrl}
                            alt={order.nama || "Gambar Produk"}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold">
                            {order.nama || "Produk"}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Warna: {order.warna || "-"} | Ukuran:{" "}
                            {order.ukuran || "-"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {order.jumlah} ×{" "}
                            {formatRupiah(Number(order.harga || 0))}
                          </p>
                        </div>
                      </div>

                      <div className="w-full border-t border-slate-200 pt-3 md:w-auto md:border-0 md:pt-0 md:text-right dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Total Pesanan
                        </p>
                        <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">
                          {formatRupiah(
                            Number(
                              order.totalHarga ||
                                order.harga * order.jumlah ||
                                0,
                            ),
                          )}
                        </p>
                      </div>
                    </div>

                    {order.status !== "Selesai" &&
                      nextStatus &&
                      order.status !== "Dibatalkan" && (
                        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                          {order.status === "Dikemas" && (
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                <MdAccessTime />
                                Estimasi Tiba:
                              </label>
                              <input
                                type="date"
                                min={new Date().toISOString().split("T")[0]}
                                className="rounded border border-slate-300 p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                                value={estimasiWaktu[order.id] || ""}
                                onChange={(event) =>
                                  setEstimasiWaktu((previous) => ({
                                    ...previous,
                                    [order.id]: event.target.value,
                                  }))
                                }
                              />
                            </div>
                          )}

                          <button
                            onClick={() =>
                              void handleStatusChange(order.id, nextStatus)
                            }
                            disabled={isThisUpdating}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-400 cursor-pointer"
                          >
                            {isThisUpdating
                              ? "Memproses..."
                              : `Ubah ke ${nextStatus}`}
                          </button>
                        </div>
                      )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-blue-200 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Rulshop · Dashboard Penjualan
        </footer>
      </main>
    </div>
  );
}
