"use client";

import { Suspense, useState } from "react";
import ShowProduk from "./produk";
import { useRouter, useSearchParams } from "next/navigation";
import kategoriList from "../../public/assets/kategoriProduk";
import CardProduk from "./CardProduk";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function Search() {
  const searchParams = useSearchParams();
  const keyword = (searchParams.get("q") || "").trim().toLowerCase();
  const router = useRouter();

  const [kategori, setKategori] = useState("");
  const [warna, setWarna] = useState("");
  const [ukuran, setUkuran] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [produkChosen, setProdukChosen] = useState("");

  const { data: session } = useSession();
  const currentUser = session;
  const userId = currentUser?.user?.id;

  const queryClient = useQueryClient();

  // Mengambil produk dari API dengan sinkronisasi database secara real-time
  const {
    data: produkList = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["products-search", keyword],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (keyword) {
        params.set("q", keyword);
      }

      const res = await fetch(`/api/products/search?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Gagal mengambil data produk");
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error("Format data produk dari API tidak valid");
      }

      return data;
    },
    staleTime: 0, // Selalu anggap data kedaluwarsa agar mengambil data terbaru dari database
    refetchOnWindowFocus: true,
  });

  // Mutation untuk fitur Love
  const loveMutation = useMutation({
    mutationFn: async (productId) => {
      if (!userId) {
        throw new Error("Login terlebih dahulu");
      }

      const res = await fetch("/api/love", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          productId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Gagal memperbarui Love");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["products-search"],
      });
    },
    onError: (err) => {
      alert(err.message || "Gagal memperbarui Love");
    },
  });

  // Filter produk
  const filteredProduk = produkList.filter((p) => {
    const allWarna = (p.variations || []).map((item) =>
      (item.warna || "").toLowerCase(),
    );

    const allUkuran = (p.variations || []).flatMap((item) =>
      (item.sizes || []).map((u) => (u.size || "").toLowerCase()),
    );

    const matchKategori =
      kategori === "" ||
      (p.kategori || "").toLowerCase().includes(kategori.toLowerCase());

    const matchWarna = warna === "" || allWarna.includes(warna.toLowerCase());

    const matchUkuran =
      ukuran === "" || allUkuran.includes(ukuran.toLowerCase());

    const matchLokasi =
      lokasi === "" ||
      (p.lokasi || "").toLowerCase().includes(lokasi.toLowerCase());

    const matchCari =
      keyword === "" ||
      (p.nama || "").toLowerCase().includes(keyword) ||
      (p.deskripsi || "").toLowerCase().includes(keyword) ||
      (p.kategori || "").toLowerCase().includes(keyword);

    return (
      matchKategori && matchWarna && matchUkuran && matchLokasi && matchCari
    );
  });

  if (isLoading) {
    return (
      <div className="p-10 text-center dark:bg-slate-950 dark:text-white">
        Memuat produk...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-center text-red-500 dark:bg-slate-950">
        <p>Gagal memuat produk.</p>
        <p className="mt-2 text-sm">
          {error?.message || "Terjadi kesalahan saat mengambil data."}
        </p>
        <button
          onClick={() =>
            queryClient.invalidateQueries({
              queryKey: ["products-search"],
            })
          }
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="m-0 flex w-full gap-2 bg-[#F3F4F6] transition-colors duration-300 dark:bg-slate-950">
      <div className="w-full space-y-2 p-2">
        {/* Filter */}
        <div className="flex flex-wrap gap-4">
          <select
            className="rounded-xl border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            value={warna}
            onChange={(e) => {
              setWarna(e.target.value);
              if (keyword) router.push("/products");
            }}
          >
            <option value="">Semua Warna</option>
            <option value="hitam">Hitam</option>
            <option value="putih">Putih</option>
            <option value="merah">Merah</option>
            <option value="biru">Biru</option>
            <option value="coklat">Coklat</option>
          </select>

          <select
            className="rounded-xl border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            value={ukuran}
            onChange={(e) => {
              setUkuran(e.target.value);
              if (keyword) router.push("/products");
            }}
          >
            <option value="">Semua Ukuran</option>
            <option value="s">S</option>
            <option value="m">M</option>
            <option value="l">L</option>
            <option value="xl">XL</option>
          </select>

          <select
            className="rounded-xl border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            value={lokasi}
            onChange={(e) => {
              setLokasi(e.target.value);
              if (keyword) router.push("/products");
            }}
          >
            <option value="">Semua Lokasi</option>
            <option value="jakarta">Jakarta</option>
            <option value="bandung">Bandung</option>
            <option value="surabaya">Surabaya</option>
            <option value="yogyakarta">Yogyakarta</option>
          </select>

          <select
            className="rounded-xl border border-gray-300 px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            value={kategori}
            onChange={(e) => {
              setKategori(e.target.value);
              if (keyword) router.push("/products");
            }}
          >
            <option value="">Semua Kategori</option>

            {Object.keys(kategoriList).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* Hasil Produk */}
        <div className="grid w-full grid-cols-6 gap-1 max-md:grid-cols-1">
          <div
            className={`flex h-full flex-wrap items-start justify-center rounded-2xl bg-blue-200 transition-all duration-500 ease-in-out dark:bg-slate-900 ${
              produkChosen ? "col-span-5 opacity-100" : "col-span-6 opacity-100"
            }`}
          >
            {filteredProduk.length > 0 ? (
              filteredProduk.map((p) => {
                const totalStok = (p.variations || []).reduce(
                  (acc, curr) => acc + (curr.stok || 0),
                  0,
                );

                const hargaPertama = p.variations?.[0]?.harga;

                const gambarPertama = p.variations?.[0]?.images?.[0]?.img || "";

                const isLoved =
                  p.loves?.some(
                    (l) => l.userId === userId && l.status === true,
                  ) || false;

                const isHabis = totalStok <= 0;

                return (
                  <CardProduk
                    key={p.id}
                    onClick={() => {
                      if (!isHabis) {
                        setProdukChosen(p);
                      }
                    }}
                    nama={p.nama}
                    stok={totalStok}
                    harga={
                      hargaPertama != null
                        ? "Rp " + hargaPertama.toLocaleString("id-ID")
                        : "Harga belum tersedia"
                    }
                    gambar={gambarPertama}
                    terjual={p.variations?.[0]?.terjual || 0}
                    edit={false}
                    isLoved={isLoved}
                    onLove={() => {
                      if (!userId) {
                        alert("Login dulu yuk!");
                        return;
                      }

                      loveMutation.mutate(p.id);
                    }}
                    showLove={p.ownerId === userId}
                  />
                );
              })
            ) : (
              <div className="w-full p-10 text-center dark:text-white">
                <p>Produk Tidak Ditemukan!</p>
                <p className="mt-2 text-sm text-gray-500">
                  Coba ubah kata pencarian atau filter produk.
                </p>
              </div>
            )}
          </div>

          {/* Detail produk yang dipilih */}
          <ShowProduk produkSelected={produkChosen} />
        </div>
      </div>
    </div>
  );
}

export default function SearchProduk() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center dark:text-white">Memuat produk...</div>
      }
    >
      <Search />
    </Suspense>
  );
}
