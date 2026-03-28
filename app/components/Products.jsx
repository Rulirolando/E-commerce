"use client";
import { useState, useEffect } from "react";
import ShowProduk from "./produk";
import { useRouter, useSearchParams } from "next/navigation";
import kategoriList from "../../public/assets/kategoriProduk";
import CardProduk from "./CardProduk";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function SearchProduk() {
  const searchParams = useSearchParams();
  const keyword = (searchParams.get("q") || "").toLowerCase().trim();
  const router = useRouter();

  const [kategori, setKategori] = useState("");
  const [warna, setWarna] = useState("");
  const [ukuran, setUkuran] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [produkChosen, setProdukChosen] = useState("");
  console.log("produkChosen:", produkChosen);
  const { data: session } = useSession();
  const currentUser = session;
  const queryClient = useQueryClient();

  const { data: produkList = [], isLoading } = useQuery({
    queryKey: ["products-search"],
    queryFn: async () => {
      const res = await fetch("/api/products/search");
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const loveMutation = useMutation({
    mutationFn: async (productId) => {
      const res = await fetch("/api/love", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.user.id, productId }),
      });
      return res.json();
    },
    onSuccess: () => {
      // Refresh data produk agar status Love terupdate otomatis
      queryClient.invalidateQueries({ queryKey: ["products-search"] });
    },
  });

  const activeKategori = keyword !== "" ? "" : kategori;

  const filteredProduk = produkList.filter((p) => {
    const allWarna = p.variations.map((item) => item.warna.toLowerCase());
    const allUkuran = p.variations.map((item) =>
      item.sizes.flatMap((u) => u.size.toLowerCase()),
    );

    const matchKategori =
      activeKategori === "" ||
      p.kategori.toLowerCase().includes(kategori.toLowerCase());

    const matchWarna = warna === "" || allWarna.includes(warna.toLowerCase());
    const matchUkuran =
      ukuran === "" || allUkuran.includes(ukuran.toLowerCase());

    const matchLokasi =
      lokasi === "" || p.lokasi.toLowerCase().includes(lokasi.toLowerCase());

    const matchCari =
      keyword === "" ||
      p.nama.toLowerCase().includes(keyword) ||
      p.deskripsi.toLowerCase().includes(keyword) ||
      p.kategori.toLowerCase().includes(keyword);

    return (
      matchKategori && matchWarna && matchUkuran && matchLokasi && matchCari
    );
  });

  useEffect(() => {
    const resetFilter = () => {
      if (keyword !== "") {
        setKategori("");
        setWarna("");
        setUkuran("");
        setLokasi("");
      }
    };
    resetFilter();
  }, [keyword]);

  if (isLoading) return <p className="dark:text-white">Memuat...</p>;

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
                const selected = e.target.value;
                setWarna(selected);

                if (searchParams.get("q")) {
                  router.push("/products");
                }
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
                const selected = e.target.value;
                setUkuran(selected);

                if (searchParams.get("q")) {
                  router.push("/products");
                }
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
                const selected = e.target.value;
                setLokasi(selected);

                if (searchParams.get("q")) {
                  router.push("/products");
                }
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
                const selected = e.target.value;
                setKategori(selected);

                if (searchParams.get("q")) {
                  router.push("/products");
                }
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
                      onLove={() => {
                        if (!currentUser) return alert("Login dulu yuk!");
                        loveMutation.mutate(p.id);
                      }}
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
