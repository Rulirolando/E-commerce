"use client";

import { useEffect, useState, use } from "react";
import Navbar from "../../components/navbar";
import CardProduk from "../../components/CardProduk";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function PublicStorePage({ params }) {
  const unwrappedParams = use(params);
  const sellerId = unwrappedParams.id;
  const router = useRouter();
  const { data: currentUser } = useSession();

  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStoreData() {
      try {
        const storeRes = await fetch(`/api/seller/store?userId=${sellerId}`);
        const storeData = await storeRes.json();
        setStore(storeData);

        const prodRes = await fetch(`/api/product/user/${sellerId}`);
        const prodData = await prodRes.json();
        setProducts(prodData);
      } catch (error) {
        console.error("Gagal memuat toko:", error);
      } finally {
        setLoading(false);
      }
    }

    if (sellerId) {
      fetchStoreData();
    }
  }, [sellerId]);

  // Fungsi handleLoveProduct tanpa parameter yang tidak terpakai
  const handleLoveProduct = () => {
    if (!currentUser) {
      alert("Silakan login terlebih dahulu untuk menyukai produk.");
      return;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Memuat Toko...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-200 dark:bg-slate-950 text-white pb-16">
      <Navbar currentUser={currentUser} />

      <main className="max-w-5xl mx-auto px-4 pt-10 space-y-6">
        {/* Header Toko */}
        <div className=" border bg-blue-100 dark:bg-slate-950 rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center gap-6">
          <Image
            src={store?.fotoToko || store?.user?.imgProfile || "/no-image.png"}
            alt="Logo Toko"
            width={120}
            height={120}
            className="w-28 h-28 rounded-full object-cover border-2 border-indigo-500 shadow"
          />
          <div className="flex-1 text-center sm:text-left space-y-2">
            <h1 className="text-2xl font-bold dark:text-slate-400 text-black">
              {store?.namaToko || store?.user?.username || "Toko Penjual"}
            </h1>
            <p className="text-sm dark:text-slate-400 text-black">
              {store?.deskripsi || "Belum ada deskripsi toko."}
            </p>
            <div className="text-xs dark:text-slate-400 text-black space-y-1 pt-1">
              <p>📍 Alamat: {store?.alamat || "Belum diatur"}</p>
              <p>📞 Telp/WA: {store?.noTelp || "Belum diatur"}</p>
            </div>
          </div>
        </div>

        {/* Daftar Produk Toko */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold dark:text-slate-400 text-black transition-colors">
            Produk dari Toko Ini ({products.length})
          </h2>

          <div className="flex flex-wrap gap-4  text-black">
            {products.length > 0 ? (
              products.map((item) =>
                item.variations?.map((p) => (
                  <CardProduk
                    key={p.id}
                    nama={item.nama}
                    harga={"Rp " + p.harga.toLocaleString("id-ID")}
                    stok={p.stok}
                    avgRating={item.avgRating}
                    totalReviews={item.totalReviews}
                    onClick={() => router.push(`/produk/${p.productId}`)}
                    gambar={p.images[0]?.img}
                    terjual={p.terjual}
                    edit={false}
                    showLove={true}
                    onLove={handleLoveProduct}
                  />
                )),
              )
            ) : (
              <div className="w-full text-center py-16 text-slate-400">
                <p className="text-lg">
                  Toko ini belum memiliki produk yang dijual.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
