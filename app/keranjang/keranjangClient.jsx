"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Navbar from "../components/navbar";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function KeranjangPage() {
  const [selectProduk, setSelectProduk] = useState([]);
  const { data: session, status } = useSession();
  const currentUser = session;
  const queryClient = useQueryClient();

  // Memuat Script Midtrans Snap secara dinamis agar window.snap selalu tersedia
  useEffect(() => {
    const midtransUrl = "https://app.sandbox.midtrans.com/snap/snap.js";
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";

    if (document.querySelector(`script[src="${midtransUrl}"]`)) return;

    const script = document.createElement("script");
    script.src = midtransUrl;
    script.setAttribute("data-client-key", clientKey);
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const { data: keranjang = { items: [] } } = useQuery({
    queryKey: ["cart", currentUser?.user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/keranjang?userId=${currentUser.user.id}`);
      const data = await res.json();
      return data;
    },
    enabled: !!currentUser?.user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await fetch(`/api/keranjang/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cart", currentUser?.user?.id],
      });
      setSelectProduk([]);
    },
  });

  // Mutasi untuk menangani Checkout sekaligus loading state
  const checkoutMutation = useMutation({
    mutationFn: async (orderPayload) => {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Gagal membuat pesanan");
      }
      return data;
    },
    onSuccess: (data) => {
      if (window.snap && data.token) {
        window.snap.pay(data.token, {
          onSuccess: function () {
            alert("Pembayaran Berhasil!");
            window.location.href = `/profile/${currentUser.user.id}`;
          },
          onPending: function () {
            alert("Harap selesaikan pembayaran.");
            window.location.href = `/profile/${currentUser.user.id}`;
          },
          onError: function () {
            alert("Pembayaran Gagal!");
          },
          onClose: function () {
            alert("Anda menutup popup tanpa menyelesaikan pembayaran.");
          },
        });
      } else {
        alert(
          "Token pembayaran Midtrans tidak ditemukan atau Snap belum siap.",
        );
      }
      setSelectProduk([]);
      queryClient.invalidateQueries({
        queryKey: ["cart", currentUser?.user?.id],
      });
    },
    onError: (error) => {
      console.error("Checkout Error:", error);
      alert(error.message || "Terjadi kesalahan saat memproses pesanan.");
    },
  });

  const isSelected = (item) =>
    selectProduk.some(
      (p) =>
        p.id === item.id &&
        p.ukuran === item.ukuran &&
        p.variantId === item.variantId,
    );

  const handleSelect = (item, checked) => {
    if (checked) {
      setSelectProduk((prev) => [...prev, item]);
    } else {
      setSelectProduk((prev) =>
        prev.filter(
          (p) =>
            !(
              p.id === item.id &&
              p.ukuran === item.ukuran &&
              p.variantId === item.variantId
            ),
        ),
      );
    }
  };

  const handleSelectAll = (checked) => {
    setSelectProduk(checked ? keranjang.items : []);
  };

  const handleHapus = async (id) => {
    if (!confirm("Yakin hapus item ini?")) return;
    deleteMutation.mutate(id);
  };

  const handleCheckout = async () => {
    if (selectProduk.length === 0)
      return alert("Pilih produk terlebih dahulu!");

    const alamatUtama =
      addressList.find((addr) => addr.status === true) || addressList[0];
    if (!alamatUtama)
      return alert("Atur alamat pengiriman terlebih dahulu di halaman profil!");

    const confirmation = confirm(
      `Konfirmasi Pengiriman:\nKirim ke: ${alamatUtama.alamat}\nPenerima: ${currentUser.user.name || alamatUtama.nama}\nTelepon: ${alamatUtama.telepon}\n\nLanjutkan pembayaran?`,
    );
    if (!confirmation) return;

    const itemsForDb = selectProduk.map((item) => ({
      variantId: item.variant.id,
      name: item.variant.product.nama,
      warna: item.variant.warna,
      ukuran: item.ukuran,
      price: item.variant.harga,
      quantity: item.jumlah,
      gambar: item.variant.images[0]?.img || "",
      author: item.variant.product.ownerId,
    }));

    checkoutMutation.mutate({
      items: itemsForDb,
      totalHarga: totalHarga,
      buyerId: currentUser.user.id,
      customerDetails: {
        namaPenerima: currentUser.user.name || alamatUtama.nama || "Pelanggan",
        telepon: String(alamatUtama.telepon),
        alamat: String(alamatUtama.alamat),
      },
    });
  };

  const { data: addressList = [] } = useQuery({
    queryKey: ["addresses", currentUser?.user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/profile/address/${currentUser.user.id}`);
      if (!res.ok) throw new Error("Gagal ambil alamat");
      return res.json();
    },
    enabled: !!currentUser?.user?.id,
  });

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
        <Navbar currentUser={currentUser} />
        <div className="p-6">
          <h1 className="text-2xl font-bold dark:text-white">🛒 Keranjang</h1>
          <p className="dark:text-gray-400">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  const totalHarga = selectProduk.reduce(
    (total, item) => total + item.variant.harga * item.jumlah,
    0,
  );

  return (
    <>
      <div className="w-full bg-blue-100 dark:bg-slate-950 transition-colors duration-300 min-h-screen">
        <Navbar currentUser={currentUser} />
        <div className="pt-24 px-10 max-w-4xl mx-auto pb-10">
          <h1 className="text-2xl font-bold mb-4 dark:text-white">
            🛒 Keranjang Belanja
          </h1>

          {!keranjang || keranjang.items?.length === 0 ? (
            <p className="dark:text-gray-400">Keranjang kosong</p>
          ) : (
            <>
              {keranjang?.items?.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-7 gap-4 border p-4 mb-3 rounded-lg items-center dark:border-slate-700 dark:bg-slate-900 dark:text-white transition-colors"
                >
                  <div className="col-span-2 flex gap-3 items-center">
                    <input
                      type="checkbox"
                      checked={isSelected(item)}
                      onChange={(e) => handleSelect(item, e.target.checked)}
                    />
                    <Image
                      src={item.variant.images[0].img}
                      alt={item.variant.product.nama}
                      width={64}
                      height={64}
                      className="rounded object-cover w-16 h-16"
                    />
                    <p className="font-semibold">{item.variant.product.nama}</p>
                  </div>

                  <div className="text-sm dark:text-gray-300">
                    Warna: {item.variant.warna}
                    <br />
                    Ukuran: {item.ukuran}
                  </div>

                  <div className="text-center">
                    Rp {item.variant.harga.toLocaleString("id-ID")}
                  </div>

                  <div className="text-center">{item.jumlah}</div>

                  <div className="text-center font-bold dark:text-blue-400">
                    Rp{" "}
                    {(item.variant.harga * item.jumlah).toLocaleString("id-ID")}
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => handleHapus(item.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}

              {/* Footer */}
              <div className="flex justify-between items-center border p-4 rounded bg-gray-100 sticky bottom-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-colors shadow-md">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      keranjang?.items?.length > 0 &&
                      selectProduk.length === keranjang.items.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <span>Pilih Semua</span>
                </div>

                <div className="flex gap-4 items-center">
                  <p className="dark:text-gray-300">
                    Total ({selectProduk.length})
                  </p>
                  <p className="font-bold text-xl text-blue-700 dark:text-blue-400">
                    Rp {totalHarga.toLocaleString("id-ID")}
                  </p>

                  <button
                    onClick={handleCheckout}
                    disabled={
                      checkoutMutation.isPending || selectProduk.length === 0
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
                  >
                    {checkoutMutation.isPending && (
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        ></path>
                      </svg>
                    )}
                    {checkoutMutation.isPending ? "Memproses..." : "Checkout"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
