"use client";
import Navbar from "../components/navbar";
import Image from "next/image";
import img from "../../public/assets/img/pngtree-e-commerce-website-displayed-on-laptop-screen-with-shopping-cart-and-image_3903594.jpg";
import kategoriList from "../../public/assets/kategoriProduk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Footer from "../components/Footer";
import CardProduk from "../components/CardProduk";
export default function Home({ currentUser }) {
  const router = useRouter();
  const [showAllKategori, setShowAll] = useState(false);
  const [produkList, setProdukList] = useState([]);
  console.log("produkList", produkList);
  const [recentProduk, setRecentProduk] = useState("terbaru");
  console.log("Current", currentUser);

  async function toggleLove(produkId) {
    if (!currentUser) {
      alert("Silakan login terlebih dahulu untuk menyukai produk.");
      return;
    }
    try {
      const res = await fetch("/api/love", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser.user.id,
          productId: produkId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return alert(data.message);
      }
      setProdukList((prev) =>
        prev.map((p) =>
          p.id === produkId
            ? {
                ...p,
                loves: data.loves
                  ? [...p.loves, { userId: currentUser.user.id, status: true }]
                  : p.loves.filter((l) => l.userId !== currentUser.user.id),
              }
            : p,
        ),
      );
    } catch (error) {
      console.error("Error toggling love:", error);
      alert("Terjadi kesalahan saat menyukai produk. Silakan coba lagi.");
    }
  }
  const kategoriArray = Object.keys(kategoriList)
    .map((key) => {
      const foto = kategoriList[key].foto;
      if (!foto) return null;

      return (
        <button
          className="relative w-1/4 h-48"
          key={key}
          onClick={() => router.push(`/products?q=${key}`)}
        >
          <Image
            src={foto}
            alt={kategoriList[key].deskripsi}
            width={300}
            height={300}
            className="w-full h-full object-cover transition hover:-translate-y-1 hover:scale-105 duration-300 rounded-lg"
          />

          <p className="absolute bottom-3 left-3 text-white font-bold text-xl drop-shadow">
            {key}
          </p>
        </button>
      );
    })
    .filter(Boolean);

  // tampilkan hanya 6 kategori awal jika belum showAllKategori
  const tampilkanKategori = showAllKategori
    ? kategoriArray
    : kategoriArray.slice(0, 6);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/product");
        const data = await res.json();
        setProdukList(data);
      } catch (err) {
        console.error("Gagal ambil produk", err);
      }
    };
    fetchProducts();
  }, []);

  return (
    <>
      <div className="w-full bg-blue-100">
        {" "}
        <Navbar className="fixed z-50" currentUser={currentUser} />
        <div className="relative w-full h-1/2">
          <Image
            src={img}
            alt="logo"
            width={100}
            height={100}
            className="w-full h-1/2 object-cover"
          ></Image>
          <div className="absolute top-1/4 left-30 w-1/2 space-y-4 text-white">
            <h1 className="text-5xl font-bold">
              Belanja Produk Berkualitas dengan Harga Terbaik
            </h1>
            <p>
              Temukan berbagai pilihan produk berkualitas tinggi untuk memenuhi
              kebutuhan Anda. Pengiriman cepat, pembayaran aman, dan layanan
              pelanggan terbaik.
            </p>
          </div>
        </div>
        <h1 className="text-center font-bold text-5xl mt-12">
          Kategori Populer
        </h1>
        <p className="text-center mt-4">
          Jelajahi berbagai kategori produk pilihan kami
        </p>
        <div className="w-full flex flex-wrap gap-5 justify-center mt-7">
          {tampilkanKategori}
        </div>
        {/* BUTTON LIHAT SEMUA */}
        {!showAllKategori === true ? (
          <button
            className="flex justify-self-center mt-7 px-4 py-2 text-blue-400 border-2 border-blue-700  shadow-blue-500 rounded-lg hover:bg-blue-300 text-center cursor-pointer transition translate hover:-translate-y-1 hover:scale-105 duration-300"
            onClick={() => setShowAll(true)}
          >
            Lihat Semua
          </button>
        ) : (
          <button
            className="flex justify-self-center mt-7 px-4 py-2  text-blue-400 border-2 border-blue-700  shadow-blue-500 rounded-lg hover:bg-blue-300 text-center cursor-pointer transition translate hover:-translate-y-1 hover:scale-105 duration-300"
            onClick={() => setShowAll(false)}
          >
            Lihat Lebih Sedikit
          </button>
        )}
        <h1 className="text-center font-bold text-5xl mt-12">Produk Terbaru</h1>
        <p className="text-center mt-4">
          Jelajahi berbagai produk pilihan kami
        </p>
        <div className="w-full flex justify-center mt-7">
          <div className="border-gray-100 shadow-lg rounded-2xl px-1 flex">
            <button
              onClick={() => setRecentProduk("terbaru")}
              className={`border rounded-2xl px-4 ${
                recentProduk === "terbaru" &&
                "bg-blue-400 transition-colors duration-300 "
              } border-gray-400 cursor-pointer`}
            >
              Terbaru
            </button>
            <button
              onClick={() => setRecentProduk("terlaris")}
              className={`border rounded-2xl px-4 ${
                recentProduk === "terlaris" &&
                "bg-blue-400 transition-colors duration-300"
              } border-gray-400 cursor-pointer`}
            >
              Terlaris
            </button>
          </div>
        </div>
        <div className="w-full flex gap-1 justify-center mt-7">
          {recentProduk === "terbaru"
            ? produkList
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((p) => (
                  <CardProduk
                    onClick={() => router.push(`produk/${p.id}`)}
                    key={p.id}
                    nama={p.nama}
                    harga={
                      "Rp " + p.variations?.[0]?.harga.toLocaleString("id-ID")
                    }
                    gambar={p.variations?.[0]?.images?.[0]?.img}
                    terjual={p.variations?.[0]?.terjual || 0}
                    edit={false}
                    isLoved={p.loves.some(
                      (l) =>
                        l.userId === currentUser?.user?.id && l.status === true,
                    )}
                    onLove={() => toggleLove(p.id)}
                    showLove={p.ownerId === currentUser?.user?.id}
                  />
                ))
                .slice(0, 6)
            : produkList
                .sort((a, b) => b.variations.terjual - a.variations.terjual)
                .map((p) => (
                  <CardProduk
                    key={p.id}
                    onClick={() => router.push(`produk/${p.id}`)}
                    nama={p.nama}
                    harga={
                      "Rp " + p.variations?.[0]?.harga.toLocaleString("id-ID")
                    }
                    gambar={p.variations?.[0]?.images?.[0]?.img}
                    terjual={p.variations?.[0]?.terjual || 0}
                    edit={false}
                    isLoved={p.loves.some(
                      (l) =>
                        l.userId === currentUser?.user?.id && l.status === true,
                    )}
                    onLove={() => toggleLove(p.id)}
                    showLove={p.ownerId === currentUser?.user?.id}
                  />
                ))
                .slice(0, 6)}
        </div>
        <button
          className="flex justify-self-center mt-7 px-4 py-2  text-blue-400 border-2 border-blue-700  shadow-blue-500 rounded-lg hover:bg-blue-300 text-center cursor-pointer transition translate hover:-translate-y-1 hover:scale-105 duration-300"
          onClick={() => router.push("/products")}
        >
          Lihat Semua Produk
        </button>
        <Footer />
      </div>
    </>
  );
}
