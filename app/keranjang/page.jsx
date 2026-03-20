"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Navbar from "../components/navbar";
import { useSession } from "next-auth/react";

export default function KeranjangPage() {
  const [keranjang, setKeranjang] = useState(null);
  console.log("keranjang", keranjang);
  const [selectProduk, setSelectProduk] = useState([]);
  const [addressList, setAddressList] = useState([]);
  console.log("selectProduk", selectProduk);
  const { data: session, status } = useSession();
  const currentUser = session;

  useEffect(() => {
    if (!currentUser?.user.id) return;

    const fetchCart = async () => {
      const res = await fetch(`/api/keranjang?userId=${currentUser.user.id}`);
      const data = await res.json();
      setKeranjang(data || {});
    };

    fetchCart();
  }, [currentUser]);

  /* =====================
     Helper
  ====================== */
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
  /* =====================
     Hapus item
  ====================== */
  const handleHapus = async (id) => {
    if (!confirm("Yakin hapus item ini?")) return;

    await fetch(`/api/keranjang/${id}`, { method: "DELETE" });
    const res = await fetch(`/api/keranjang?userId=${currentUser.user.id}`);
    const data = await res.json();
    setKeranjang(data || {});
  };

  /* =====================
     Checkout
  ====================== */
  const handleCheckout = async () => {
    if (selectProduk.length === 0) return alert("Pilih produk!");

    const alamatUtama = addressList.find((addr) => addr.status === true);
    if (!alamatUtama) return alert("Atur alamat utama dahulu!");

    if (!confirm("Yakin checkout?")) return;

    const alamat = confirm(
      `Kirim ke alamat:\n${alamatUtama.alamat}\nTelepon: ${alamatUtama.telepon}\nKalau tidak silahkan atur di halaman profile.`,
    );
    if (!alamat) return;

    try {
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

      console.log("Payload yang dikirim ke API:", itemsForDb); // CEK INI DI CONSOLE BROWSER

      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsForDb,
          totalHarga: totalHarga,
          buyerId: currentUser.user.id,
          customerDetails: {
            namaPenerima: currentUser.user.name,
            telepon: alamatUtama.telepon,
            alamat: alamatUtama.alamat,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server Error Response:", errorText);
        throw new Error("Gagal membuat pesanan");
      }
      const data = await response.json();

      window.snap.pay(data.token, {
        onSuccess: function () {
          alert("Pembayaran Berhasil!");
          // Redirect ke halaman pesanan atau bersihkan keranjang
          window.location.href = `/profile/${currentUser.user.id}`;
        },
        onPending: function () {
          alert("Harap selesaikan pembayaran.");
        },
      });

      setSelectProduk([]);
    } catch (error) {
      console.error("Checkout Error:", error);
      alert(
        "Terjadi kesalahan. Cek terminal VS Code untuk detail error Prisma.",
      );
    }
  };

  const fetchAddresses = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/profile/address/${currentUser.user.id}`,
        {
          method: "GET",
        },
      );
      const data = await response.json();
      setAddressList(data);
    } catch (error) {
      console.error("Gagal ambil alamat:", error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.user.id) fetchAddresses();
  }, [fetchAddresses, currentUser]);

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
      <Navbar currentUser={currentUser} />
      <div className="min-h-screen p-6 dark:bg-slate-950 transition-colors duration-300">
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
                <div className="col-span-2 flex gap-3">
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
                    className="rounded"
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
                    className="bg-red-500 text-white px-3 py-1 rounded"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="flex justify-between items-center border p-4 rounded bg-gray-100 sticky bottom-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-colors">
              <div>
                <input
                  type="checkbox"
                  checked={
                    keranjang?.items?.length > 0 &&
                    selectProduk.length === keranjang.items.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                Pilih Semua
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
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Checkout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
