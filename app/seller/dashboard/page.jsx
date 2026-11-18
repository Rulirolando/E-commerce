"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/navbar";
import kategoriList from "../../../public/assets/kategoriProduk";
import DragDropUploader from "../../components/DragDropUploader";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CardProduk from "../../components/CardProduk";
import EditProdukModal from "../../components/EditProduk";
import { MdAccessTime } from "react-icons/md";

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function SellerDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();

  // Tab aktif di dalam dashboard: "identitas" | "tambah-produk" | "produk-saya" | "pesanan-masuk"
  const [activeTab, setActiveTab] = useState("identitas");

  // State untuk Profil / Identitas Toko
  const [namaToko, setNamaToko] = useState("");
  const [deskripsiToko, setDeskripsiToko] = useState("");
  const [noTelp, setNoTelp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [fotoToko, setFotoToko] = useState("");
  const [msg, setMsg] = useState("");

  // State untuk Tambah Produk
  const [form, setForm] = useState({
    nama: "",
    kategori: "",
    deskripsi: "",
    lokasi: "",
    comment: "",
  });

  const [variasi, setVariasi] = useState({
    warna: "",
    harga: "",
    stok: "",
    ukuran: "",
    gambar: "",
  });

  const [variasiList, setVariasiList] = useState([]);
  const [myProduks, setMyProduks] = useState([]);
  const [isEdit, setIsEdit] = useState(false);
  const [onEdit, setOnEdit] = useState({});

  // State untuk Kelola Pesanan & Payouts (Saldo)
  const [dataPesanan, setDataPesanan] = useState([]);
  const [payoutsData, setPayoutsData] = useState({
    payouts: [],
    summary: {
      totalPenjualan: 0,
      totalKomisi: 0,
      totalBersih: 0,
      menunggu: 0,
      berhasil: 0,
    },
  });
  const [bankAccount, setBankAccount] = useState(null);
  const [bankForm, setBankForm] = useState({
    bankCode: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
  });
  const [loadingBank, setLoadingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [cahingPayoutId, setCairingPayoutId] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [estimasiWaktu, setEstimasiWaktu] = useState({});
  const [activePesananMenu, setActivePesananMenu] = useState("semuapesanan");

  const filterStatusMap = {
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
    if (!userId) return;

    setLoadingOrder(true);
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
      console.error("Gagal memuat data pesanan/payout:", error);
    } finally {
      setLoadingOrder(false);
      setLoadingBank(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (
      status === "unauthenticated" ||
      (!session?.user && status !== "loading")
    ) {
      router.push("/seller/login");
    } else if (session?.user) {
      if (session.user.role === "USER") {
        router.push("/seller/login");
        return;
      }

      // Ambil data toko dari database
      fetch(`/api/seller/store?userId=${session.user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.namaToko) {
            setNamaToko(data.namaToko);
            setDeskripsiToko(data.deskripsi || "");
            setNoTelp(data.noTelp || "");
            setAlamat(data.alamat || "");
            setFotoToko(data.fotoToko || "");
          } else {
            setNamaToko(session.user.name || "");
          }
        })
        .catch((err) => console.error("Gagal memuat data toko:", err));

      // Ambil produk milik penjual ini
      fetch(`/api/product/user/${session.user.id}`)
        .then((res) => res.json())
        .then((data) => setMyProduks(data))
        .catch(() => setMyProduks([]));

      // Ambil data pesanan & payout
      void fetchOrdersAndPayouts();
    }
  }, [status, session, router, fetchOrdersAndPayouts]);

  // Fungsi simpan profil toko
  async function handleSaveProfile(e) {
    e.preventDefault();
    setMsg("");
    try {
      const res = await fetch("/api/seller/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          namaToko,
          deskripsi: deskripsiToko,
          noTelp,
          alamat,
          fotoToko,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Gagal menyimpan profil toko.");
      setMsg("Profil toko berhasil diperbarui!");
    } catch (err) {
      setMsg(err.message);
    }
  }

  // Mutasi tambah produk
  const postProduct = async (newProduk) => {
    const res = await fetch("/api/product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduk),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Gagal menyimpan produk");
    }
    return res.json();
  };

  const mutation = useMutation({
    mutationFn: postProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      alert("Produk berhasil disimpan dan ditayangkan!");
      setForm({
        nama: "",
        kategori: "",
        deskripsi: "",
        lokasi: "",
        comment: "",
      });
      setVariasiList([]);
      fetch(`/api/product/user/${session.user.id}`)
        .then((res) => res.json())
        .then((data) => setMyProduks(data));
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const tambahVariasi = () => {
    if (
      !variasi.warna ||
      !variasi.harga ||
      !variasi.stok ||
      !variasi.ukuran ||
      !variasi.gambar
    ) {
      return alert("Isi semua data variasi dengan lengkap!");
    }

    const newVar = {
      warna: variasi.warna,
      harga: parseInt(variasi.harga, 10),
      stok: parseInt(variasi.stok, 10),
      ukuran: variasi.ukuran.split(",").map((u) => u.trim()),
      gambar: [variasi.gambar],
    };

    setVariasiList((prev) => [...prev, newVar]);
    setVariasi({ warna: "", harga: "", stok: "", ukuran: "", gambar: "" });
  };

  const hapusVariasi = (id) => {
    setVariasiList((prev) => prev.filter((_, i) => i !== id));
  };

  const simpanProduk = async () => {
    if (!session?.user?.id) return alert("Anda harus login terlebih dahulu.");
    if (
      !form.nama ||
      !form.kategori ||
      !form.lokasi ||
      variasiList.length === 0
    ) {
      return alert(
        "Lengkapi nama, kategori, lokasi, dan minimal 1 variasi produk!",
      );
    }

    mutation.mutate({
      nama: form.nama,
      kategori: form.kategori,
      deskripsi: form.deskripsi,
      lokasi: form.lokasi,
      comment: form.comment,
      ownerId: session.user.id,
      variasiList,
    });
  };

  async function handleHapusProduk(variationId) {
    if (!confirm("Yakin ingin menghapus variasi produk ini?")) return;
    try {
      const res = await fetch(`/api/product/${variationId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Produk berhasil dihapus!");
        const updated = await fetch(
          `/api/product/user/${session.user.id}`,
        ).then((r) => r.json());
        setMyProduks(updated);
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menghapus produk");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan koneksi");
    }
  }

  // Handler untuk Ubah Status Pesanan
  const handleStatusChange = async (id, statusBaru) => {
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
      if (!res.ok)
        throw new Error(result.message || "Gagal memperbarui status pesanan.");

      alert(`Status pesanan berhasil diperbarui ke '${statusBaru}'!`);
      await fetchOrdersAndPayouts();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handler Simpan Rekening Bank
  const handleSaveBankAccount = async (e) => {
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
    } catch (error) {
      alert(`Gagal: ${error.message}`);
    } finally {
      setSavingBank(false);
    }
  };

  // Handler Pencairan Saldo
  const handleCairkanSaldo = async (payoutId) => {
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
    } catch (error) {
      alert(`Gagal: ${error.message}`);
    } finally {
      setCairingPayoutId(null);
    }
  };

  const filteredPesanan = dataPesanan.filter((order) => {
    const targetStatus = filterStatusMap[activePesananMenu];
    return targetStatus ? order.status === targetStatus : true;
  });

  const getNextStatus = (currentStatus) => {
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

  if (status === "loading" || !session?.user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Memuat Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-12">
      <Navbar className="fixed z-50" currentUser={session} />

      <main className="max-w-5xl mx-auto px-4 pt-28 space-y-6">
        {/* Banner Header Dashboard */}
        <div className="bg-linear-to-r from-indigo-900 to-slate-900 p-6 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Penjual</h1>
            <p className="text-sm text-slate-300">
              Kelola toko, produk, pesanan, dan saldo Anda dengan mudah.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("identitas")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition ${
                activeTab === "identitas"
                  ? "bg-white text-indigo-900 shadow"
                  : "bg-slate-800 text-white hover:bg-slate-700"
              }`}
            >
              Profil Toko
            </button>
            <button
              onClick={() => setActiveTab("produk-saya")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition ${
                activeTab === "produk-saya"
                  ? "bg-white text-indigo-900 shadow"
                  : "bg-slate-800 text-white hover:bg-slate-700"
              }`}
            >
              Produk Saya
            </button>
            <button
              onClick={() => setActiveTab("tambah-produk")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition ${
                activeTab === "tambah-produk"
                  ? "bg-white text-indigo-900 shadow"
                  : "bg-slate-800 text-white hover:bg-slate-700"
              }`}
            >
              + Tambah Produk
            </button>
            <button
              onClick={() => setActiveTab("pesanan-masuk")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition ${
                activeTab === "pesanan-masuk"
                  ? "bg-white text-indigo-900 shadow"
                  : "bg-slate-800 text-white hover:bg-slate-700"
              }`}
            >
              📦 Pesanan & Saldo
            </button>
            <button
              onClick={() => router.push(`/toko/${session?.user?.id}`)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
            >
              Lihat Toko Publik ↗
            </button>
          </div>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-xl text-center text-sm">
            {msg}
          </div>
        )}

        {/* ================= TAB 1: PROFIL & IDENTITAS TOKO ================= */}
        {activeTab === "identitas" && (
          <form
            onSubmit={handleSaveProfile}
            className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-sm"
          >
            <h2 className="text-lg font-bold">Pengaturan Profil Toko</h2>
            <p className="text-xs text-slate-400">
              Informasi ini akan ditampilkan kepada pembeli pada halaman publik
              toko Anda.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Logo / Foto Toko
              </label>
              <DragDropUploader
                onUpload={(file) => {
                  const reader = new FileReader();
                  reader.onloadend = () => setFotoToko(reader.result);
                  reader.readAsDataURL(file);
                }}
              />
              {fotoToko && (
                <Image
                  src={fotoToko}
                  alt="Preview Toko"
                  width={90}
                  height={90}
                  className="w-20 h-20 object-cover rounded-full mt-2 border border-slate-700"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Nama Toko
              </label>
              <input
                type="text"
                required
                value={namaToko}
                onChange={(e) => setNamaToko(e.target.value)}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Deskripsi Toko
              </label>
              <textarea
                rows={3}
                value={deskripsiToko}
                onChange={(e) => setDeskripsiToko(e.target.value)}
                placeholder="Tuliskan deskripsi singkat mengenai toko Anda..."
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="text"
                required
                value={noTelp}
                onChange={(e) => setNoTelp(e.target.value)}
                placeholder="08123456789"
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Alamat Toko
              </label>
              <textarea
                required
                rows={2}
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Jl. Contoh No. 123, Kota"
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl font-semibold transition cursor-pointer shadow"
            >
              Simpan Perubahan Toko
            </button>
          </form>
        )}

        {/* ================= TAB 2: PRODUK SAYA ================= */}
        {activeTab === "produk-saya" && (
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold">Daftar Produk Toko Anda</h2>
            {isEdit && (
              <EditProdukModal
                produk={onEdit}
                onClose={() => setIsEdit(false)}
              />
            )}
            <div className="flex flex-wrap gap-4">
              {myProduks?.length > 0 ? (
                myProduks.map((item) =>
                  item.variations?.map((p) => (
                    <CardProduk
                      key={p.id}
                      nama={item.nama}
                      harga={p.harga}
                      stok={p.stok}
                      avgRating={item.avgRating}
                      totalReviews={item.totalReviews}
                      onClick={() => router.push(`/produk/${p.productId}`)}
                      gambar={p.images[0]?.img}
                      terjual={p.terjual}
                      edit={true}
                      onEdit={() => {
                        setOnEdit({
                          variationId: p.id,
                          productId: item.id,
                          postId: item.id,
                          nama: item.nama,
                          ...p,
                        });
                        setIsEdit(true);
                      }}
                      onHapus={() => handleHapusProduk(p.id)}
                      loveProduk={true}
                    />
                  )),
                )
              ) : (
                <div className="w-full text-center py-10 text-slate-400">
                  <p>Belum ada produk yang dijual.</p>
                  <button
                    onClick={() => setActiveTab("tambah-produk")}
                    className="mt-3 px-4 py-2 bg-indigo-600 rounded-xl text-sm font-semibold text-white"
                  >
                    + Tambah Produk Sekarang
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: TAMBAH PRODUK ================= */}
        {activeTab === "tambah-produk" && (
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-sm">
            <h2 className="text-xl font-bold">Tambah Produk Baru</h2>

            <div className="space-y-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700">
              <input
                placeholder="Nama produk"
                className="p-3 w-full border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:border-indigo-500"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />

              <div>
                <label className="font-semibold text-sm text-slate-300">
                  Pilih Kategori Produk
                </label>
                <select
                  className="w-full p-3 mt-1 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:border-indigo-500"
                  value={form.kategori}
                  onChange={(e) =>
                    setForm({ ...form, kategori: e.target.value })
                  }
                >
                  <option value="">-- Pilih Kategori --</option>
                  {Object.keys(kategoriList).map((kategori) => (
                    <option key={kategori} value={kategori}>
                      {kategori}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                placeholder="Deskripsi produk"
                rows={3}
                className="p-3 w-full border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:border-indigo-500"
                value={form.deskripsi}
                onChange={(e) =>
                  setForm({ ...form, deskripsi: e.target.value })
                }
              />

              <input
                placeholder="Lokasi pengiriman (Contoh: Palu)"
                className="p-3 w-full border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:border-indigo-500"
                value={form.lokasi}
                onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
              />
            </div>

            <h3 className="text-lg font-bold">Variasi Produk</h3>

            <div className="space-y-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Warna / Tipe"
                  className="p-3 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none"
                  value={variasi.warna}
                  onChange={(e) =>
                    setVariasi({ ...variasi, warna: e.target.value })
                  }
                />
                <input
                  placeholder="Harga (Rp)"
                  type="number"
                  className="p-3 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none"
                  value={variasi.harga}
                  onChange={(e) =>
                    setVariasi({ ...variasi, harga: e.target.value })
                  }
                />
                <input
                  placeholder="Stok"
                  type="number"
                  className="p-3 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none"
                  value={variasi.stok}
                  onChange={(e) =>
                    setVariasi({ ...variasi, stok: e.target.value })
                  }
                />
                <input
                  placeholder="Ukuran (pisahkan koma: S,M,L)"
                  className="p-3 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none"
                  value={variasi.ukuran}
                  onChange={(e) =>
                    setVariasi({ ...variasi, ukuran: e.target.value })
                  }
                />
              </div>

              <DragDropUploader
                onUpload={(file) => {
                  const reader = new FileReader();
                  reader.onloadend = () =>
                    setVariasi((prev) => ({ ...prev, gambar: reader.result }));
                  reader.readAsDataURL(file);
                }}
              />

              {variasi.gambar && (
                <Image
                  src={variasi.gambar}
                  alt="Preview"
                  width={100}
                  height={100}
                  className="w-24 h-24 object-cover rounded-lg border border-slate-700"
                />
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={tambahVariasi}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer shadow"
                >
                  + Tambah Variasi
                </button>
              </div>
            </div>

            {variasiList.length > 0 && (
              <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40">
                <h4 className="font-bold text-sm mb-2 text-indigo-300">
                  Variasi Ditambahkan ({variasiList.length}):
                </h4>
                <ul className="space-y-2">
                  {variasiList.map((v, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between text-sm bg-slate-900 p-3 rounded-xl border border-slate-800"
                    >
                      <span>
                        <b>{v.warna}</b> — Rp {v.harga.toLocaleString("id-ID")}{" "}
                        — Stok: {v.stok}
                      </span>
                      <button
                        type="button"
                        onClick={() => hapusVariasi(index)}
                        className="text-red-400 hover:text-red-300 font-semibold text-xs cursor-pointer"
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={simpanProduk}
              disabled={mutation.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-semibold shadow-md cursor-pointer transition"
            >
              {mutation.isPending
                ? "Menyimpan Produk..."
                : "Simpan & Tayangkan Produk"}
            </button>
          </div>
        )}

        {/* ================= TAB 4: KELOLA PESANAN & PENCAIRAN SALDO ================= */}
        {activeTab === "pesanan-masuk" && (
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-sm">
            <div>
              <h2 className="text-xl font-bold">Kelola Pesanan Toko Saya</h2>
              <p className="text-xs text-slate-400 mt-1">
                Kelola pesanan masuk dan cairkan saldo penjualan Anda.
              </p>
            </div>

            {/* SUB-MENU FILTER PESANAN */}
            <div className="flex flex-wrap gap-2">
              {[
                { target: "semuapesanan", label: "Semua" },
                { target: "belumdibayarpesanan", label: "Belum Dibayar" },
                { target: "dibayarpesanan", label: "Sudah Dibayar" },
                { target: "dikemaspesanan", label: "Dikemas" },
                { target: "dikirimpesanan", label: "Dikirim" },
                { target: "selesaipesanan", label: "Selesai" },
                { target: "pencairansaldo", label: "💰 Pencairan Saldo" },
              ].map((item) => (
                <button
                  key={item.target}
                  onClick={() =>
                    startTransition(() => setActivePesananMenu(item.target))
                  }
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    activePesananMenu === item.target
                      ? "bg-indigo-600 border-indigo-500 text-white shadow"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <button
                onClick={() => void fetchOrdersAndPayouts()}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Muat Ulang
              </button>
            </div>

            {/* KONTEN TAB PENCAIRAN SALDO */}
            {activePesananMenu === "pencairansaldo" ? (
              <div className="flex flex-col gap-6">
                {/* FORM REKENING BANK */}
                <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-5">
                  <h3 className="text-base font-bold">Rekening Bank Penjual</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Tambahkan atau perbarui rekening tujuan pencairan dana hasil
                    penjualan toko Anda.
                  </p>

                  {loadingBank ? (
                    <p className="text-sm text-slate-500">Memuat rekening...</p>
                  ) : (
                    <>
                      {bankAccount && (
                        <div className="mb-4 rounded-xl bg-slate-900 p-4 border border-slate-700">
                          <p className="font-semibold text-sm">
                            {bankAccount.bankName} ({bankAccount.bankCode})
                          </p>
                          <p className="text-sm text-slate-300">
                            {bankAccount.accountName}
                          </p>
                          <p className="text-xs text-slate-400">
                            Nomor Rekening: ****{bankAccount.accountNumberLast4}
                          </p>
                          <p className="mt-2 text-xs font-medium">
                            Status:{" "}
                            <span
                              className={
                                bankAccount.isVerified
                                  ? "text-emerald-400 font-semibold"
                                  : "text-amber-400 font-semibold"
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
                          <label className="block text-xs font-semibold mb-1 text-slate-400">
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
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-slate-400">
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
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-slate-400">
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
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-slate-400">
                            Nomor Rekening
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={bankForm.accountNumber}
                            onChange={(e) =>
                              setBankForm({
                                ...bankForm,
                                accountNumber: e.target.value.replace(
                                  /\D/g,
                                  "",
                                ),
                              })
                            }
                            placeholder="Masukkan nomor rekening"
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                          <button
                            type="submit"
                            disabled={savingBank}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-semibold text-white disabled:bg-slate-700 cursor-pointer transition-colors shadow"
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
                <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-5">
                  <h3 className="text-base font-bold">
                    Daftar Saldo & Pencairan
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
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
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900"
                          >
                            <div>
                              <p className="font-bold text-sm">
                                Pesanan #{item.orderId} -{" "}
                                {item.order?.nama || "Produk"}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                Jumlah Bersih (Net):{" "}
                                <span className="font-semibold text-emerald-400">
                                  {formatRupiah(item.netAmount)}
                                </span>{" "}
                                (Komisi platform 2%: {formatRupiah(item.fee)})
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Status:{" "}
                                <span className="font-medium uppercase text-slate-300">
                                  {item.status}
                                </span>
                              </p>
                            </div>

                            {item.status === "MENUNGGU_ADMIN" ||
                            item.status === "MENUNGGU_REKENING" ? (
                              <button
                                onClick={() => handleCairkanSaldo(item.id)}
                                disabled={isThisCairing}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shadow"
                              >
                                {isThisCairing
                                  ? "Memproses..."
                                  : "Cairkan Saldo Sekarang"}
                              </button>
                            ) : (
                              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold px-3 py-1 rounded-full">
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
            ) : loadingOrder || isPending ? (
              <div className="py-12 text-center text-slate-500">
                Memuat pesanan...
              </div>
            ) : filteredPesanan.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 py-12 text-center text-slate-400">
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
                      className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-800/40 p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3 text-xs">
                        <div>
                          <p className="font-semibold text-slate-200">
                            Penerima: {order.namaPenerima} ({order.telepon})
                          </p>
                          <p className="mt-1 text-slate-400">
                            Alamat: {order.alamat}
                          </p>
                          <p className="mt-1 text-slate-500">
                            Tanggal:{" "}
                            {new Date(order.createdAt).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <span className="rounded-full bg-indigo-950 border border-indigo-800 px-3 py-1 font-medium text-indigo-300">
                          {order.status}
                        </span>
                      </div>

                      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                            <Image
                              src={imageUrl}
                              alt={order.nama || "Gambar Produk"}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm">
                              {order.nama || "Produk"}
                            </h3>
                            <p className="mt-1 text-xs text-slate-400">
                              Warna: {order.warna || "-"} | Ukuran:{" "}
                              {order.ukuran || "-"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {order.jumlah} ×{" "}
                              {formatRupiah(Number(order.harga || 0))}
                            </p>
                          </div>
                        </div>

                        <div className="w-full border-t border-slate-800 pt-3 md:w-auto md:border-0 md:pt-0 md:text-right">
                          <p className="text-xs text-slate-400">
                            Total Pesanan
                          </p>
                          <p className="mt-1 text-lg font-bold text-indigo-400">
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
                          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-800 pt-3">
                            {order.status === "Dikemas" && (
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="flex items-center gap-1 text-xs font-semibold text-slate-300">
                                  <MdAccessTime />
                                  Estimasi Tiba:
                                </label>
                                <input
                                  type="date"
                                  min={new Date().toISOString().split("T")[0]}
                                  className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-white"
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
                              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:bg-slate-700 cursor-pointer shadow"
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
          </div>
        )}
      </main>
    </div>
  );
}
