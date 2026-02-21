"use client";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import Navbar from "../../components/navbar";
import Footer from "../../components/Footer";

export default function ProdukDetail({ produkChose }) {
  console.log("produkChose", produkChose);
  const allImg =
    produkChose?.variations?.flatMap(
      (v) => v.images?.map((i) => i.img) || [],
    ) || [];
  const [selectedImage, setSelectedImage] = useState(allImg[0] || "");
  const [currentUser, setCurrentUser] = useState({});
  const [addressList, setAddressList] = useState([]);

  console.log("currentuser", currentUser);

  const [selectedProduk, setSelectedProduk] = useState({
    produkId: 0,
    warna: "",
    nama: produkChose.nama || "",
    ukuran: "",
    stok: 0,
    jumlah: 1,
    harga: 0,
    gambar: "",
  });

  console.log("selectedproduk", selectedProduk);

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

  async function handleBeli() {
    // 1. Validasi pilihan user sebelum kirim
    if (!selectedProduk.warna || !selectedProduk.ukuran) {
      alert("Silakan pilih warna dan ukuran terlebih dahulu");
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

    try {
      // 2. Susun Payload (Gunakan variabel 'payload' secara konsisten)
      const payload = {
        nama: selectedProduk.nama,
        warna: selectedProduk.warna,
        ukuran: selectedProduk.ukuran,
        jumlah: Number(selectedProduk.jumlah),
        harga: Number(selectedProduk.harga),
        totalHarga:
          Number(selectedProduk.harga) * Number(selectedProduk.jumlah),
        gambar: selectedProduk.gambar,
        namaPenerima: currentUser.nama,
        telepon: String(alamatUtama.telepon || ""),
        alamat: String(alamatUtama.alamat || ""),
        produkId: Number(selectedProduk.id),
        buyerId: Number(currentUser.id),
      };

      console.log("Data yang akan dikirim:", payload); // Ganti 'update' jadi 'payload'

      const res = await fetch("/api/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Detail Error Server:", data.error);
        alert(data.message || "Gagal membuat order");
        return;
      }

      alert("Pembelian berhasil!");

      // 3. Reset state setelah berhasil
      setSelectedProduk({
        id: produkChose.id,
        produkId: 0,
        gambar: allImg[0] || "",
        harga: produkChose.variations[0]?.harga || 0,
        nama: produkChose.nama,
        warna: "",
        ukuran: "",
        jumlah: 1,
      });
      setSelectedImage(allImg[0] || "");
    } catch (error) {
      console.error("Error Catch:", error);
      alert("Terjadi kesalahan: " + error.message);
    }
  }

  const handleAddToCart = async () => {
    if (!selectedProduk.warna || !selectedProduk.ukuran) {
      alert("Pilih warna dan ukuran dulu");
      return;
    }

    if (currentUser.id === selectedProduk.ownerId) {
      alert("Anda tidak bisa menambahkan produk Anda sendiri ke keranjang.");
      return;
    }

    await fetch("/api/keranjang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        variantId: selectedProduk.produkId,
        ukuran: selectedProduk.ukuran,
        jumlah: selectedProduk.jumlah,
      }),
    });
    alert("Produk berhasil ditambahkan ke keranjang!");
    // reset selectedProduk lengkap (termasuk gambar & harga)
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

  const fetchAddresses = useCallback(async () => {
    try {
      const response = await fetch(`/api/profile/address/${currentUser.id}`, {
        method: "GET",
      });
      const data = await response.json();
      setAddressList(data);
    } catch (error) {
      console.error("Gagal ambil alamat:", error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.id) fetchAddresses();
  }, [fetchAddresses, currentUser]);

  useEffect(() => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("loginSessionDB"));

      setCurrentUser(currentUser);
    } catch {
      setCurrentUser({});
    } finally {
    }
  }, []);

  useEffect(() => {
    if (!produkChose) return;

    const firstImage = produkChose.variations?.[0]?.images?.[0]?.img ?? null;

    setSelectedImage(firstImage);

    setSelectedProduk({
      id: produkChose.id,
      ownerId: produkChose.owner?.id,
      produkId: 0,
      nama: produkChose.nama,
      gambar: firstImage,
      harga: produkChose.variations?.[0]?.harga ?? 0,
      warna: "",
      ukuran: "",

      jumlah: 1,
    });
  }, [produkChose]);

  if (!produkChose || !selectedProduk) {
    return <div>Loading produk...</div>;
  }

  return (
    <>
      <Navbar />
      <div className="grid grid-cols-2 w-full bg-blue-100">
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
                        : "border-transparent"
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
        <div className="col-span-1 w-3/4">
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
                className={`px-2 py-1 border rounded-md  cursor-pointer transition-all duration-200 ${
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
                  className={`px-2 py-1 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedProduk.ukuran === ukuran
                      ? "bg-blue-700 text-white"
                      : ""
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
              className="px-3 py-2 bg-gray-200 rounded-lg text-xl font-bold hover:bg-gray-300"
            >
              -
            </button>

            {/* Angka */}
            <div className="px-4 py-2 bg-white border rounded-lg text-lg font-semibold min-w-10 text-center">
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
              className="px-3 py-2 bg-gray-200 rounded-lg text-xl font-bold hover:bg-gray-300"
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
          </div>

          <div className="relative w-1/2 h-16 border mt-3 rounded-lg">
            <div className="absolute top-1 left-1 w-14 h-14 border rounded-full flex items-center justify-center">
              <p className="text-sm font-semibold ">Profile</p>
            </div>
            <div className="absolute w-1/2 h-1/2 left-16 top-1/4 flex items-center">
              <p className="text-sm font-semibold">Toko kelontong</p>
            </div>
            <button className="absolute top-1/4 right-1 w-14 h-7 cursor-pointer border rounded-md flex items-center justify-center bg-blue-500 text-white font-semibold">
              dddd
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col w-full bg-blue-200">
        <div className="m-4 bg-blue-100 shadow-lg rounded-md p-2">
          <p className="text-4xl font-semibold mt-3">Deskripsi Produk</p>
          <p className="text-lg font-light mt-2 text-justify leading-relaxed mx-2">
            {capitalizeFirst(produkChose.deskripsi)} Lorem ipsum dolor sit amet,
            consectetur adipisicing elit. Quidem obcaecati nobis earum aut, eum,
            dolores soluta, assumenda qui nulla ipsum ex maxime amet doloremque
            odio delectus dolorem minima illo nemo. Lorem ipsum dolor sit amet
            consectetur adipisicing elit. Odio quasi, placeat ex, qui dolor
            officia recusandae rem totam, unde hic veniam quo suscipit. Deleniti
            voluptate non ducimus consectetur reprehenderit dignissimos! Earum
            laudantium enim, quod in neque adipisci, deleniti vero perspiciatis
            dicta hic ipsa corrupti odit eos, alias nisi similique quaerat
            ducimus velit! Consequuntur dignissimos harum rem. Eaque harum
            quidem a? Id in, fugit ab beatae dolor quis aliquid ipsum illum
            quasi quo. Asperiores, beatae ratione sit placeat nesciunt eius,
            dolores accusamus dolorum pariatur vitae omnis, itaque aliquid
            dolore laborum ducimus. Voluptatibus natus unde non consectetur quis
            pariatur corporis esse officiis consequatur iste, nesciunt error
            doloremque quisquam fuga aspernatur deserunt rem amet accusamus? Et
            blanditiis amet, ipsa temporibus est saepe aliquid! Facere voluptate
            tempora tenetur dicta perspiciatis error maxime itaque et blanditiis
            excepturi consequatur adipisci voluptatum, laboriosam cumque iste
            optio! Rem itaque minima quasi ad cum fugit iusto dolores corrupti
            quis?
          </p>
        </div>
      </div>
      <div className="w-full">
        <div className="m-4 bg-blue-100 shadow-lg rounded-md p-2">
          <h1 className="text-4xl font-semibold mt-3">Komentar</h1>
          <p className="text-lg font-light mt-2">{produkChose.comment}</p>
        </div>
      </div>
      <Footer />
    </>
  );
}
