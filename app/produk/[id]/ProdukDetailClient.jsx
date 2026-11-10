"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import Navbar from "../../components/navbar";
import Footer from "../../components/Footer";
import { useSession } from "next-auth/react";
import ChatSeller from "../../../lib/ui/ChatSeller";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IoMdShare } from "react-icons/io";

export default function ProdukDetail({ id }) {
  const { data: session } = useSession();
  const [produkChose, setProdukChose] = useState(null);
  const currentUser = session;

  const allImg =
    produkChose?.variations?.flatMap(
      (v) => v.images?.map((i) => i.img) || [],
    ) || [];
  const queryClient = useQueryClient();
  const firstVariation = produkChose?.variations?.[0];
  const firstImage = firstVariation?.images?.[0]?.img || allImg[0] || "";
  const [selectedImage, setSelectedImage] = useState(firstImage);

  const [selectedProduk, setSelectedProduk] = useState({
    produkId: 0,
    warna: "",
    nama: "",
    ukuran: "",
    stok: 0,
    jumlah: 1,
    harga: 0,
    gambar: "",
  });

  function capitalizeFirst(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  const handlewarna = (warna, img, harga, idProdukVariasi) => {
    const variasi = produkChose?.variations?.find(
      (p) => p.id === idProdukVariasi,
    );
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

    setSelectedProduk((prev) => ({
      ...prev,
      id: produkChose?.id,
      produkId: idProdukVariasi,
      warna,
      ukuran: "",
      gambar: img,
      harga,
      stok: variasi?.stok || 0,
      jumlah: 1,
      nama: produkChose?.nama,
    }));

    setSelectedImage(img);
  };

  const produkDipilih = produkChose?.variations?.find(
    (p) => p.warna === selectedProduk.warna,
  );

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

  const produkIdChoose = produkChose?.variations?.find((v) =>
    v.images?.some((img) => img.img === selectedImage),
  );

  const updateStokManual = async () => {
    try {
      const res = await fetch(`/api/product/${produkChose?.id}`);
      const dataTerbaru = await res.json();

      if (selectedProduk.warna) {
        const variasiTerbaru = dataTerbaru.variations.find(
          (v) => v.id === selectedProduk.produkId,
        );
        if (variasiTerbaru) {
          setSelectedProduk((prev) => ({
            ...prev,
            stok: variasiTerbaru.stok,
          }));
        }
      }
    } catch (err) {
      console.error("Gagal update stok:", err);
    }
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

  const orderMutation = useMutation({
    mutationFn: async (orderPayload) => {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal membuat pesanan");
      return data;
    },
    onSuccess: (data) => {
      if (window.snap && data.token) {
        window.snap.pay(data.token, {
          onSuccess: async () => {
            await updateStokManual();
            alert("Pembayaran Berhasil!");
            window.location.href = `/profile/${currentUser.user.id}`;
          },
          onPending: () => alert("Harap selesaikan pembayaran."),
          onError: () => alert("Pembayaran gagal."),
          onClose: () => alert("Popup pembayaran ditutup."),
        });
      } else {
        alert("Token pembayaran Midtrans tidak ditemukan.");
      }
      resetSelection();
    },
    onError: (err) => {
      alert(`Error: ${err.message}`);
    },
  });

  async function handleBeli() {
    if (!selectedProduk.warna || !selectedProduk.ukuran) {
      alert("Silakan pilih warna dan ukuran terlebih dahulu");
      return;
    }

    if (!currentUser) return alert("Silakan login terlebih dahulu.");

    if (currentUser.user.id === produkChose.ownerId) {
      alert("Anda tidak bisa membeli produk Anda sendiri.");
      return;
    }

    const alamatUtama =
      addressList.find((addr) => addr.status === true) || addressList[0];
    if (!alamatUtama) {
      alert("Atur alamat pengiriman terlebih dahulu di halaman profil!");
      return;
    }

    const confirmation = confirm(
      `Konfirmasi Pengiriman:\nKirim ke: ${alamatUtama.alamat}\nPenerima: ${currentUser.user.name || alamatUtama.nama}\nTelepon: ${alamatUtama.telepon}\n\nLanjutkan pembayaran?`,
    );
    if (!confirmation) return;

    orderMutation.mutate({
      items: [
        {
          variantId: Number(selectedProduk.produkId),
          quantity: Number(selectedProduk.jumlah),
          ukuran: String(selectedProduk.ukuran),
        },
      ],
      customerDetails: {
        namaPenerima: currentUser.user.name || alamatUtama.nama || "Pelanggan",
        telepon: String(alamatUtama.telepon),
        alamat: String(alamatUtama.alamat),
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

    if (currentUser.user.id === produkChose.ownerId) {
      alert("Anda tidak bisa menambahkan produk Anda sendiri ke keranjang.");
      return;
    }

    cartMutation.mutate({
      userId: currentUser.user.id,
      variantId: Number(selectedProduk.produkId),
      ukuran: String(selectedProduk.ukuran),
      jumlah: Number(selectedProduk.jumlah),
    });
  };

  const resetSelection = () => {
    setSelectedProduk({
      id: produkChose?.id,
      produkId: 0,
      gambar: allImg[0] || "",
      ownerId: produkChose?.ownerId,
      harga: produkChose?.variations[0]?.harga || 0,
      nama: produkChose?.nama,
      warna: "",
      ukuran: "",
      jumlah: 1,
    });
    setSelectedImage(allImg[0] || "");
  };

  const handleShare = async () => {
    const shareData = {
      title: produkChose.nama,
      text: `Cek produk keren ini: ${produkChose.nama}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link berhasil disalin ke clipboard!");
      }
    } catch (err) {
      console.error("Gagal membagikan:", err);
    }
  };

  useEffect(() => {
    fetch(`/api/product/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setProdukChose(data);
          if (data.variations?.[0]) {
            setSelectedProduk((prev) => ({
              ...prev,
              harga: data.variations[0].harga,
              nama: data.nama,
            }));
          }
        }
      })
      .catch((err) => console.error(err));
  }, [id]);

  if (!produkChose) {
    return <div className="dark:text-white p-6">Loading produk...</div>;
  }

  return (
    <>
      <Navbar currentUser={currentUser} />
      <div className="grid grid-cols-1 md:grid-cols-2 w-full bg-blue-100 dark:bg-slate-900 transition-colors duration-300 p-4 md:p-8 gap-6">
        <div className="col-span-1 w-full flex flex-col items-center">
          <div className="relative flex flex-col rounded-lg mt-4 w-full max-w-md">
            <div className="relative aspect-4/3 w-full">
              <Image
                src={selectedImage || allImg[0]}
                alt={produkChose.nama || "produk-image"}
                fill
                unoptimized
                className="object-cover rounded-lg"
              />
            </div>

            <div className="flex flex-row mt-2 gap-2 overflow-x-auto">
              {allImg.map((img, index) => (
                <div key={index} className="w-16 h-16 shrink-0">
                  <Image
                    src={img}
                    alt={`${produkChose.nama}-${index}`}
                    width={64}
                    height={64}
                    unoptimized
                    className={`object-cover rounded-lg w-16 h-16 border-2 cursor-pointer ${
                      selectedImage === img
                        ? "border-blue-500"
                        : "border-transparent dark:border-slate-700"
                    }`}
                    onClick={() => {
                      setSelectedImage(img);
                      setSelectedProduk((prev) => ({ ...prev, gambar: img }));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-1 w-full text-black dark:text-white">
          <div className="text-3xl md:text-4xl font-semibold mt-4">
            <p>{capitalizeFirst(produkChose.nama)}</p>
          </div>
          <div className="text-xl font-bold mt-4 text-blue-700 dark:text-blue-400">
            <span>
              Rp{" "}
              {produkIdChoose
                ? produkIdChoose.harga.toLocaleString("id-ID")
                : produkChose?.variations?.[0]?.harga.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="text-sm mt-4 w-full flex gap-2 flex-wrap items-center">
            <p className="font-semibold">Warna:</p>
            {produkChose?.variations?.map((p, index) => (
              <button
                key={p.id || index}
                onMouseEnter={() => {
                  setSelectedImage(p.images?.[0]?.img ?? null);
                }}
                className={`px-3 py-1.5 border rounded-md cursor-pointer transition-all duration-200 dark:border-slate-600 ${
                  selectedProduk.warna === p.warna
                    ? "bg-blue-700 text-white border-blue-700"
                    : "bg-white dark:bg-slate-800"
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

          <div className="text-sm mt-4 w-full flex gap-2 flex-wrap items-center">
            <p className="font-semibold">Ukuran:</p>
            {deleteSameUkuran.map((ukuran, index) => {
              const isAvailable = selectedProduk.warna
                ? produkDipilih?.sizes.some((s) => s.size === ukuran)
                : true;

              return (
                <button
                  key={index}
                  disabled={!isAvailable}
                  className={`px-3 py-1.5 border rounded-lg transition-all duration-200 dark:border-slate-600 cursor-pointer ${
                    selectedProduk.ukuran === ukuran
                      ? "bg-blue-700 text-white border-blue-700"
                      : "bg-white dark:bg-slate-800"
                  } ${!isAvailable ? "opacity-40 cursor-not-allowed" : ""}`}
                  onClick={() => handleukuran(ukuran)}
                >
                  {ukuran}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              disabled={!selectedProduk.ukuran || !selectedProduk.warna}
              onClick={() => handlejumlah(selectedProduk.jumlah - 1)}
              className="px-3 py-1.5 bg-gray-200 rounded-lg text-lg font-bold hover:bg-gray-300 dark:bg-slate-700 dark:text-white cursor-pointer disabled:opacity-50"
            >
              -
            </button>

            <div className="px-5 py-1.5 bg-white dark:bg-slate-800 dark:border-slate-600 border rounded-lg text-base font-semibold min-w-10 text-center">
              {selectedProduk.jumlah}
            </div>

            <button
              disabled={
                !selectedProduk.ukuran ||
                !selectedProduk.warna ||
                selectedProduk.jumlah >= selectedProduk.stok
              }
              onClick={() => handlejumlah(selectedProduk.jumlah + 1)}
              className="px-3 py-1.5 bg-gray-200 dark:bg-slate-700 dark:text-white rounded-lg text-lg font-bold hover:bg-gray-300 cursor-pointer disabled:opacity-50"
            >
              +
            </button>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Stok tersedia: <b>{selectedProduk.stok}</b>
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={handleBeli}
              disabled={
                !selectedProduk.warna ||
                !selectedProduk.ukuran ||
                !selectedProduk.jumlah ||
                orderMutation.isPending
              }
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 cursor-pointer disabled:opacity-50"
            >
              {orderMutation.isPending ? "Memproses..." : "Beli Sekarang"}
            </button>

            <button
              onClick={handleAddToCart}
              disabled={cartMutation.isPending}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors duration-200 cursor-pointer disabled:opacity-50"
            >
              Tambah ke Keranjang
            </button>

            <button
              onClick={handleShare}
              className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg font-medium hover:bg-slate-300 transition-colors duration-200 cursor-pointer flex items-center gap-2"
            >
              <IoMdShare />
              Bagikan
            </button>

            <ChatSeller
              sellerId={produkChose.ownerId}
              userId={currentUser?.user?.id}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full bg-blue-200 dark:bg-slate-950 transition-colors duration-300 py-4">
        <div className="m-4 bg-blue-100 shadow-lg rounded-md p-4 text-black dark:text-white dark:bg-slate-800">
          <p className="text-2xl font-semibold mb-2">Deskripsi Produk</p>
          <p className="text-base font-light text-justify leading-relaxed">
            {capitalizeFirst(produkChose.deskripsi) ||
              "Tidak ada deskripsi produk."}
          </p>
        </div>
      </div>

      <div className="w-full bg-blue-200 dark:bg-slate-950 transition-colors duration-300 pb-8">
        <div className="m-4 bg-blue-100 shadow-lg rounded-md p-6 dark:bg-slate-800 text-black dark:text-white">
          <h1 className="text-xl font-semibold mb-6">
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
              Belum ada ulasan untuk produk ini.
            </p>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
