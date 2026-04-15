"use client";
import Image from "next/image";
import { useState } from "react";
import Navbar from "../../components/navbar";
import Footer from "../../components/Footer";
import { useSession } from "next-auth/react";
import ChatSeller from "../../../lib/ui/ChatSeller";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function ProdukDetail({ produkChose }) {
  const { data: session } = useSession();
  const currentUser = session;
  console.log("produkChose", produkChose);
  const allImg =
    produkChose?.variations?.flatMap(
      (v) => v.images?.map((i) => i.img) || [],
    ) || [];
  const queryClient = useQueryClient();
  const firstVariation = produkChose?.variations?.[0];
  const firstImage = firstVariation?.images?.[0]?.img || allImg[0] || "";
  const [selectedImage, setSelectedImage] = useState(firstImage);

  console.log("currentuser", currentUser);

  const [selectedProduk, setSelectedProduk] = useState({
    produkId: 0,
    warna: "",
    nama: produkChose.nama || "",
    ukuran: "",
    stok: 0,
    jumlah: 1,
    harga: firstVariation?.harga || 0,
    gambar: firstImage,
  });

  function capitalizeFirst(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  const handlewarna = (warna, img, harga, idProdukVariasi) => {
    const variasi = produkChose.variations.find(
      (p) => p.id === idProdukVariasi,
    );
    // jika toggle off (klik warna yg sama), reset produkId & warna
    if (selectedProduk?.warna === warna) {
      setSelectedProduk((prev) => ({
        ...prev,
        produkId: 0,
        warna: "",
        gambar: img || allImg[0] || "",
        harga: harga || produkChose.variations[0]?.harga || 0,
        jumlah: 1,
      }));
      setSelectedImage(img || allImg[0] || "");
      return;
    }

    // set pilihan variasi baru (letakkan ...prev dulu supaya tidak tertimpa)
    setSelectedProduk((prev) => ({
      ...prev,
      id: produkChose.id,
      produkId: idProdukVariasi,
      warna,
      ukuran: "",
      gambar: img,
      harga,
      stok: variasi?.stok || 0,
      jumlah: 1,
      nama: produkChose.nama,
    }));

    setSelectedImage(img);
  };

  // pilih ukuran berdasarkan warna yang dipilih
  const produkDipilih = produkChose?.variations?.find(
    (p) => p.warna === selectedProduk.warna,
  );

  // Ambil semua ukuran dari semua produk dan hapus duplikat
  const deleteSameUkuran = [
    ...new Set(
      produkChose?.variations?.flatMap((v) => v.sizes.map((s) => s.size)),
    ),
  ];

  const handleukuran = (ukuran) => {
    setSelectedProduk((prev) => ({
      ...prev,
      ukuran,
    }));
  };

  const handlejumlah = (jumlah) => {
    setSelectedProduk((prev) => ({
      ...prev,
      jumlah: Math.min(prev.stok, Math.max(1, jumlah)),
    }));
  };

  const produkIdChoose = produkChose.variations.find((v) =>
    v.images?.some((img) => img.img === selectedImage),
  );

  const orderMutation = useMutation({
    mutationFn: async (orderPayload) => {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });
      if (!res.ok) throw new Error("Gagal membuat pesanan");
      return res.json();
    },
    onSuccess: (data) => {
      window.snap.pay(data.token, {
        onSuccess: () => {
          alert("Pembayaran Berhasil!");
          window.location.href = `/profile/${currentUser.user.id}`;
        },
        onPending: () => alert("Harap selesaikan pembayaran."),
      });
      resetSelection();
    },
  });

  async function handleBeli() {
    // 1. Validasi pilihan user sebelum kirim
    if (!selectedProduk.warna || !selectedProduk.ukuran) {
      alert("Silakan pilih warna dan ukuran terlebih dahulu");
      return;
    }

    if (!currentUser) return alert("Silakan login terlebih dahulu.");

    if (currentUser.user.id === selectedProduk.ownerId) {
      alert("Anda tidak bisa membeli produk Anda sendiri.");
      return;
    }

    const confirmation = confirm("Apakah Anda yakin ingin membeli produk ini?");
    if (!confirmation) return;

    const alamatUtama = addressList.find((addr) => addr.status === true);
    if (!alamatUtama) return alert("Atur alamat utama dahulu!");

    const alamat = confirm(
      `Kirim ke alamat:\n${alamatUtama.alamat}\nTelepon: ${alamatUtama.telepon}\nKalau tidak silahkan atur di halaman profile.`,
    );
    if (!alamat) return;

    orderMutation.mutate({
      items: [
        {
          name: selectedProduk.nama,
          warna: selectedProduk.warna,
          ukuran: selectedProduk.ukuran,
          quantity: selectedProduk.jumlah,
          price: selectedProduk.harga,
          author: selectedProduk.ownerId,
          variantId: selectedProduk.produkId,
          gambar: selectedProduk.gambar,
        },
      ],
      totalHarga: selectedProduk.harga * selectedProduk.jumlah,
      buyerId: currentUser.user.id,
      customerDetails: {
        namaPenerima: currentUser.user.name,
        telepon: alamatUtama.telepon,
        alamat: alamatUtama.alamat,
      },
    });
  }

  const cartMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/keranjang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: () => {
      alert("Produk berhasil ditambahkan ke keranjang!");
      // Invalidate agar angka di Navbar/Keranjang update otomatis
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      resetSelection();
    },
  });

  const handleAddToCart = async () => {
    if (!selectedProduk.warna || !selectedProduk.ukuran) {
      alert("Pilih warna dan ukuran dulu");
      return;
    }

    if (!currentUser) return alert("Silakan login terlebih dahulu.");

    if (currentUser.user.id === selectedProduk.ownerId) {
      alert("Anda tidak bisa menambahkan produk Anda sendiri ke keranjang.");
      return;
    }

    cartMutation.mutate({
      userId: currentUser.user.id,
      variantId: selectedProduk.produkId,
      ukuran: selectedProduk.ukuran,
      jumlah: selectedProduk.jumlah,
    });
  };

  const resetSelection = () => {
    setSelectedProduk({
      id: produkChose.id,
      produkId: 0,
      gambar: allImg[0] || "",
      ownerId: produkChose.ownerId,
      harga: produkChose.variations[0]?.harga || 0,
      nama: produkChose.nama,
      warna: "",
      ukuran: "",
      jumlah: 1,
    });
    setSelectedImage(allImg[0] || "");
  };

  const { data: addressList = [] } = useQuery({
    queryKey: ["addresses", currentUser?.user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/profile/address/${currentUser.user.id}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!currentUser?.user?.id,
  });

  if (!produkChose || !selectedProduk) {
    return <div className="dark:text-white">Loading produk...</div>;
  }

  return (
    <>
      <Navbar currentUser={currentUser} />
      <div className="grid grid-cols-2 w-full bg-blue-100 dark:bg-slate-900 transition-colors duration-300">
        <div className="col-span-1 w-full h-full">
          <div className="relative flex flex-col justify-self-center rounded-lg mt-4 w-1/2">
            <div className="relative aspect-4/3 w-full">
              <Image
                src={selectedImage || allImg[0]}
                alt={produkChose.nama || "produk-image"}
                fill
                unoptimized
                className="object-cover rounded-lg"
              />
            </div>

            <div className="flex flex-row mt-2  gap-1">
              {allImg.map((img, index) => (
                <div key={index} className="w-16 h-1/2">
                  <Image
                    src={img}
                    alt={`${produkChose.nama}-${index}` || "produk-image"}
                    width={50}
                    height={100}
                    unoptimized
                    className={`object-cover rounded-lg w-16 h-16  border-2 cursor-pointer ${
                      selectedImage === img
                        ? "border-blue-500"
                        : "border-transparent dark:border-slate-700"
                    }`}
                    onClick={() => {
                      setSelectedImage(img);
                      // sync selectedProduk.gambar juga
                      setSelectedProduk((prev) => ({ ...prev, gambar: img }));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-1 w-3/4 text-black dark:text-white">
          <div className="text-4xl font-light-semibold mt-8">
            <p className="">{capitalizeFirst(produkChose.nama)}</p>
          </div>
          <div className="text-lg font-light-bold mt-4">
            <span className="font-light">
              Rp.
              {produkIdChoose
                ? produkIdChoose.harga.toLocaleString("id-ID")
                : produkChose?.variations?.[0].harga.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="text-sm font-light-bold mt-2 w-full flex gap-2 flex-wrap justify-start items-center">
            <p>Warna:</p>
            {produkChose?.variations?.map((p, index) => (
              <button
                key={p.id || index}
                onMouseEnter={() => {
                  setSelectedImage(p.images?.[0]?.img ?? null);
                }}
                className={`px-2 py-1 border rounded-md  cursor-pointer transition-all duration-200 dark:border-slate-600 ${
                  selectedProduk.warna === p.warna
                    ? "bg-blue-700 text-white"
                    : ""
                }`}
                onClick={() =>
                  handlewarna(
                    p.warna,
                    p.images?.[0]?.img ?? null,
                    p.harga,
                    p.id,
                  )
                }
              >
                {p.warna}
              </button>
            ))}
          </div>

          {/*   ukuran */}

          <div className="text-sm font-light-bold font-light-bold mt-2 w-full flex gap-2 flex-wrap justify-start items-center">
            <p>Ukuran:</p>
            {deleteSameUkuran.map((ukuran, index) => {
              const isAvailable = selectedProduk.warna
                ? produkDipilih?.sizes.some((s) => s.size === ukuran)
                : true;

              return (
                <button
                  key={index}
                  disabled={!isAvailable}
                  className={`px-2 py-1 border rounded-lg transition-all duration-200 dark:border-slate-600 cursor-pointer ${
                    selectedProduk.ukuran === ukuran
                      ? "bg-blue-700 text-white"
                      : "bg-white dark:bg-slate-800"
                  } ${!isAvailable ? "opacity-40 cursor-not-allowed" : ""}`}
                  onClick={() => handleukuran(ukuran)}
                >
                  {ukuran}
                </button>
              );
            })}
          </div>

          {/* jumlah */}

          <div className="flex items-center gap-2">
            {/* Tombol Minus */}
            <button
              value={selectedProduk.jumlah ?? 0}
              disabled={!selectedProduk.ukuran || !selectedProduk.warna}
              onClick={() => handlejumlah(selectedProduk.jumlah - 1)}
              className="px-3 py-2 bg-gray-200 rounded-lg text-xl font-bold hover:bg-gray-300 dark:bg-slate-700 dark:text-white cursor-pointer"
            >
              -
            </button>

            {/* Angka */}
            <div className="px-4 py-2 bg-white dark:bg-slate-800  dark:border-slate-600 border rounded-lg text-lg font-semibold min-w-10 text-center">
              {selectedProduk.jumlah}
            </div>

            {/* Tombol Plus */}
            <button
              value={selectedProduk.jumlah ?? 0}
              disabled={
                !selectedProduk.ukuran ||
                !selectedProduk.warna ||
                selectedProduk.jumlah >= selectedProduk.stok
              }
              onClick={() => handlejumlah(selectedProduk.jumlah + 1)}
              className="px-3 py-2 bg-gray-200 dark:bg-slate-700 dark:text-white rounded-lg text-xl font-bold hover:bg-gray-300 cursor-pointer"
            >
              +
            </button>
            <p className="text-sm mt-1">
              Stok tersedia: <b>{selectedProduk.stok}</b>
            </p>
          </div>

          {/* tombol beli */}

          <div className="flex">
            <button
              onClick={handleBeli}
              disabled={
                !selectedProduk.warna ||
                !selectedProduk.ukuran ||
                !selectedProduk.jumlah
              }
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 cursor-pointer"
            >
              Beli Sekarang
            </button>

            <button
              onClick={() => handleAddToCart()}
              className="mt-4 ml-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200 cursor-pointer"
            >
              Tambah ke Keranjang
            </button>
            <ChatSeller
              sellerId={produkChose.ownerId}
              userId={currentUser?.user?.id}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col w-full bg-blue-200 dark:bg-slate-950 transition-colors duration-300">
        <div className="m-4 bg-blue-100 shadow-lg rounded-md p-2 text-black dark:text-white dark:bg-slate-800">
          <p className="text-4xl font-semibold mt-3">Deskripsi Produk</p>
          <p className="text-lg font-light mt-2 text-justify leading-relaxed mx-2">
            {capitalizeFirst(produkChose.deskripsi)}
          </p>
        </div>
      </div>
      <div className="w-full dark:bg-slate-950 transition-colors duration-300">
        <div className="m-4 bg-blue-100 shadow-lg rounded-md p-6 dark:bg-slate-800 text-black dark:text-white">
          <h1 className="text-2xl font-semibold mb-6">
            Ulasan Produk ({produkChose.review?.length || 0})
          </h1>

          {produkChose.review && produkChose.review.length > 0 ? (
            <div className="space-y-6">
              {produkChose.review.map((rev, index) => (
                <div
                  key={index}
                  className="border-b dark:border-slate-700 pb-4 last:border-0"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex text-amber-400 text-lg">
                      {[...Array(5)].map((_, i) => (
                        <span key={i}>{i < rev.rating ? "★" : "☆"}</span>
                      ))}
                    </div>
                    <p className="font-bold">
                      {rev.user?.nama || "Pembeli Rulshop"}
                    </p>
                  </div>
                  <p className="text-gray-600 dark:text-slate-300 italic">
                    {rev.comment}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-2">
                    {new Date(rev.createdAt).toLocaleDateString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">
              Belum ada komentar untuk produk ini.
            </p>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
