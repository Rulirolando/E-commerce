"use client";

import { useState } from "react";
import Image from "next/image";
import kategoriList from "../../public/assets/kategoriProduk";
import { useRouter } from "next/navigation";
import Navbar from "../components/navbar";
import DragDropUploader from "../components/DragDropUploader";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function JualPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const currentUser = session;
  console.log("currentUser:", currentUser);
  const queryClient = useQueryClient();

  const [form, setForm] = useState(() => ({
    nama: "",
    kategori: "",
    deskripsi: "",
    lokasi: "",
    comment: "",
  }));

  const [variasi, setVariasi] = useState(() => ({
    warna: "",
    harga: "",
    stok: "",
    ukuran: "",
    gambar: "",
  }));

  const [variasiList, setVariasiList] = useState([]);

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
      alert("Produk berhasil disimpan!");
      router.push("/");
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const tambahVariasi = () => {
    if (!currentUser)
      return alert("User belum siap. Silakan login ulang jika perlu.");

    if (
      !variasi.warna ||
      !variasi.harga ||
      !variasi.stok ||
      !variasi.ukuran ||
      !variasi.gambar
    )
      return alert("Isi semua data variasi!");

    const newVar = {
      warna: variasi.warna,
      harga: parseInt(variasi.harga, 10),
      stok: parseInt(variasi.stok, 10),
      ukuran: variasi.ukuran.split(",").map((u) => u.trim()),
      gambar: [variasi.gambar], // base64 or url
    };

    setVariasiList((prev) => [...prev, newVar]);

    setVariasi({
      warna: "",
      harga: "",
      stok: "",
      ukuran: "",
      gambar: "",
    });
  };

  const hapusVariasi = (id) => {
    setVariasiList((prev) => prev.filter((_, i) => i !== id));
  };

  const simpanProduk = async () => {
    if (!currentUser) return alert("Anda harus login terlebih dahulu.");

    const newProduk = {
      nama: form.nama,
      kategori: form.kategori,
      deskripsi: form.deskripsi,
      lokasi: form.lokasi,
      comment: form.comment,
      ownerId: currentUser.user.id,
      variasiList,
    };
    mutation.mutate(newProduk);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 p-6 flex items-center justify-center">
        <p className="dark:text-white animate-pulse text-lg">Memuat data...</p>
      </div>
    );
  }
  function capitalizeFirst(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  return (
    <>
      <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300 w-full p-3">
        <Navbar currentUser={currentUser} />
        <div className="p-6 max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-4 dark:text-white">{`Jual produk kamu ${capitalizeFirst(
            currentUser.user.name,
          )}`}</h1>

          {/* FORM PRODUK */}
          <div className="space-y-3 bg-blue-100 p-4 rounded-xl dark:bg-slate-900 transition-colors shadow-sm">
            <input
              placeholder="Nama produk"
              className="p-2 w-full border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
            />

            <div className="p-4 w-full max-w-xl">
              <label className="font-semibold text-lg dark:text-gray-300">
                Pilih Kategori Produk
              </label>
              <select
                className="w-full p-3 mt-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none"
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
              >
                <option value="">-- Pilih Kategori --</option>
                {Object.keys(kategoriList).map((kategori) => (
                  <option key={kategori} value={kategori}>
                    {kategori}
                  </option>
                ))}
              </select>

              {form.kategori && (
                <div className="mt-4 p-4 border rounded-lg bg-gray-100 dark:bg-slate-800/50 backdrop-blur-sm transition-colors">
                  <h2 className="font-bold text-xl dark:text-blue-400">
                    {form.kategori}
                  </h2>
                  <p className="mt-2 text-gray-700 dark:text-gray-300">
                    {kategoriList[form.kategori].deskripsi}
                  </p>

                  <h3 className="font-semibold mt-3 dark:text-white">
                    Contoh Produk:
                  </h3>
                  <ul className="list-disc ml-5 text-gray-800 dark:text-gray-400">
                    {kategoriList[form.kategori].contoh.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <textarea
              placeholder="Deskripsi"
              className="p-2 w-full border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none"
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
            />

            <input
              placeholder="Lokasi"
              className="p-2 w-full border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none"
              value={form.lokasi}
              onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
            />
          </div>

          <h2 className="text-lg font-bold mt-4 dark:text-white">
            Variasi Produk
          </h2>

          {/* FORM VARIASI */}
          <div className="space-y-3 bg-blue-50 p-4 rounded-xl mt-2 dark:bg-slate-900 dark:border-slate-800 ">
            <input
              placeholder="Warna"
              className="p-2 w-full border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none"
              value={variasi.warna}
              onChange={(e) =>
                setVariasi({ ...variasi, warna: e.target.value })
              }
            />

            <input
              placeholder="Harga"
              type="number"
              className="p-2 w-full border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none"
              value={variasi.harga}
              onChange={(e) =>
                setVariasi({ ...variasi, harga: e.target.value })
              }
            />

            <input
              placeholder="Stok"
              type="number"
              className="p-2 w-full border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none"
              value={variasi.stok}
              onChange={(e) => setVariasi({ ...variasi, stok: e.target.value })}
            />

            <input
              placeholder="Ukuran (pisahkan dengan koma: S,M,L)"
              className="p-2 w-full border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none"
              value={variasi.ukuran}
              onChange={(e) =>
                setVariasi({ ...variasi, ukuran: e.target.value })
              }
            />
            <div className="dark:bg-slate-800 rounded-lg p-2"></div>
            <DragDropUploader
              onUpload={(file) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  setVariasi((prev) => ({ ...prev, gambar: reader.result }));
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>

          {/* Preview gambar setelah upload */}
          {variasi.gambar && (
            // use native img tag for base64 to avoid Next/Image processing
            <Image
              src={variasi.gambar}
              alt="Preview"
              width={100}
              height={100}
              className="w-32 h-32 object-cover mt-2 rounded-lg border"
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={tambahVariasi}
              className="bg-blue-700 text-white px-3 py-2 rounded"
            >
              + Tambah Variasi
            </button>

            <button
              onClick={() => {
                setVariasi({
                  warna: "",
                  harga: "",
                  stok: "",
                  ukuran: "",
                  gambar: "",
                });
              }}
              className="px-3 py-2 border border-gray-300 rounded dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-800 transition-colors hover:bg-gray-100"
            >
              Reset Variasi
            </button>
          </div>
        </div>

        {/* LIST VARIASI */}
        {variasiList.length > 0 && (
          <div className="mt-3 dark:bg-slate-900 dark:border-slate-800 w-1/2 flex justify-self-center">
            <h3 className="font-bold dark:text-white">Variasi Ditambahkan:</h3>
            <ul className="list-disc ml-5">
              {variasiList.map((v, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 dark:bg-slate-800"
                >
                  <div className="flex-1 dark:text-blue-400">
                    {v.warna} — Rp{v.harga.toLocaleString()} — stok {v.stok}
                  </div>
                  {v.gambar?.[0] && (
                    <Image
                      src={v.gambar[0]}
                      alt={v.warna}
                      width={100}
                      height={100}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <button
                    className="text-sm text-red-500 hover:text-red-700"
                    onClick={() => hapusVariasi(index)}
                  >
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={simpanProduk}
          className="mt-4 w-1/2 bg-green-600 text-white p-3 rounded-xl flex justify-self-center justify-center"
        >
          Simpan Produk
        </button>
      </div>
    </>
  );
}
