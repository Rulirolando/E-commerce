"use client";
import { useState, useEffect } from "react";
import ShowProduk from "./produk";
import { useSearchParams } from "next/navigation";
import kategoriList from "../../public/assets/kategoriProduk";
import CardProduk from "./CardProduk";
import { useSession } from "next-auth/react";

export default function SearchProduk() {
  const searchParams = useSearchParams();
  const kategoriURL = (searchParams.get("q") || "").toLowerCase().trim();
  const [kategori, setKategori] = useState(kategoriURL || "");
  const [warna, setWarna] = useState("");
  const [ukuran, setUkuran] = useState("");
  const [lokasi, setLokasi] = useState("");
  console.log("kategorilist", kategori);
  const [produkChosen, setProdukChosen] = useState("");
  const [produkList, setProdukList] = useState([]);
  console.log("produklist", produkList);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const currentUser = session;

  async function toggleLove(produkId) {
    if (!currentUser.user.id) {
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
        return alert(love.message);
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
  const filteredProduk = produkList.filter((p) => {
    const allWarna = p.variations.map((item) => item.warna.toLowerCase());
    const allUkuran = p.variations.map((item) =>
      item.sizes.flatMap((u) => u.size.toLowerCase()),
    );

    const matchKategori =
      kategori === "" ||
      p.kategori.toLowerCase().includes(kategori.toLowerCase());

    const matchWarna = warna === "" || allWarna.includes(warna.toLowerCase());
    const matchUkuran =
      ukuran === "" || allUkuran.includes(ukuran.toLowerCase());

    const matchLokasi =
      lokasi === "" || p.lokasi.toLowerCase().includes(lokasi.toLowerCase());

    const keyword = (searchParams.get("q") || "").toLowerCase().trim();

    const matchCari =
      keyword === "" ||
      p.nama.toLowerCase().includes(keyword) ||
      p.deskripsi.toLowerCase().includes(keyword) ||
      p.kategori.toLowerCase().includes(keyword);

    return (
      matchKategori && matchWarna && matchUkuran && matchLokasi && matchCari
    );
  });

  // 🔥 Load data dari localStorage
  useEffect(() => {
    try {
      fetch("/api/products/search")
        .then((res) => res.json())
        .then((data) => {
          setProdukList(data);
        });
    } catch {
      setProdukList([]);
    } finally {
      setLoading(true);
    }
  }, []);

  useEffect(() => {
    setKategori(""); // reset kategori saat search
  }, [searchParams]);

  if (!loading) return <p className="dark:text-white">Memuat...</p>;

  return (
    <>
      {/* Konten */}
      <div className="flex m-0 w-full gap-2 bg-[#F3F4F6] dark:bg-slate-950 transition-colors duration-300">
        <div className="p-2 space-y-2 w-full">
          {/* Filter Section */}
          <div className="flex flex-wrap gap-4">
            {/* Filter Warna */}
            <select
              className="border dark:border-slate-700 dark:bg-slate-800 dark:text-white border-gray-300 rounded-xl px-3 py-2"
              value={warna}
              onChange={(e) => {
                setWarna(e.target.value);
              }}
            >
              <option value="">Semua Warna</option>
              <option value="hitam">Hitam</option>
              <option value="putih">Putih</option>
              <option value="merah">Merah</option>
              <option value="biru">Biru</option>
              <option value="coklat">Coklat</option>
            </select>

            {/* Filter Ukuran */}
            <select
              className="border dark:border-slate-700 dark:bg-slate-800 dark:text-white border-gray-300 rounded-xl px-3 py-2"
              value={ukuran}
              onChange={(e) => {
                setUkuran(e.target.value);
              }}
            >
              <option value="">Semua Ukuran</option>
              <option value="s">S</option>
              <option value="m">M</option>
              <option value="l">L</option>
              <option value="xl">XL</option>
            </select>

            {/* Filter Lokasi */}
            <select
              className="border border-gray-300  dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl px-3 py-2"
              value={lokasi}
              onChange={(e) => {
                setLokasi(e.target.value);
              }}
            >
              <option value="">Semua Lokasi</option>
              <option value="jakarta">Jakarta</option>
              <option value="bandung">Bandung</option>
              <option value="surabaya">Surabaya</option>
              <option value="yogyakarta">Yogyakarta</option>
            </select>
            <select
              className="border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl px-1 py-2 text-center"
              value={kategori}
              onChange={(e) => {
                setKategori(e.target.value);
              }}
            >
              <option value="">Semua Kategori</option>
              {Object.keys(kategoriList).map((kategori) => (
                <option key={kategori} value={kategori}>
                  {kategori}
                </option>
              ))}
            </select>
          </div>

          {/* Produk Tampil */}
          <div className="grid grid-cols-6 max-md:grid-cols-1 gap-1 w-full">
            <div
              className={`transition-all duration-500 ease-in-out transform ${
                produkChosen
                  ? "col-span-5 translate-x-0 opacity-100"
                  : "col-span-6 translate-x-0 opacity-100"
              } flex flex-wrap items-start justify-center h-full bg-blue-200 dark:bg-slate-900 rounded-2xl`}
            >
              {produkList.length > 0 ? (
                filteredProduk.map((p) => {
                  const totalStokSemuaVariasi = p.variations?.reduce(
                    (acc, curr) => acc + curr.stok,
                    0,
                  );
                  return (
                    <CardProduk
                      key={p.id}
                      onClick={() => setProdukChosen(p)}
                      nama={p.nama}
                      stok={totalStokSemuaVariasi}
                      harga={
                        "Rp " + p.variations?.[0]?.harga.toLocaleString("id-ID")
                      }
                      gambar={p.variations?.[0]?.images?.[0]?.img || ""}
                      terjual={p.variations?.[0]?.terjual || 0}
                      edit={false}
                      isLoved={p.loves.some(
                        (l) =>
                          l.userId === currentUser?.user.id &&
                          l.status === true,
                      )}
                      onLove={() => toggleLove(p.id)}
                      showLove={p.ownerId === currentUser?.user.id}
                    />
                  );
                })
              ) : (
                <div className="p-10 text-center dark:text-white">
                  <p>Produk Tidak Ditemukan!</p>
                </div>
              )}
            </div>

            {/* Produk Dipilih */}
            <ShowProduk produkSelected={produkChosen} />
          </div>
        </div>
      </div>
    </>
  );
}
