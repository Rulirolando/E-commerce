"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
export default function ShowProduk({ produkSelected }) {
  const { data: session } = useSession();
  const currentUser = session;
  const [selectedImage, setSelectedImage] = useState("");
  const [mounted, setMounted] = useState(false);
  console.log("selectedimage", selectedImage);
  console.log("produkselected", produkSelected);
  const allimg = produkSelected
    ? produkSelected.variations.flatMap((item) => item.gambar)
    : [];

  function capitalizeFirst(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function handleOwner() {
    if (currentUser.user.id === produkSelected.ownerId) {
      alert("Anda adalah pemilik produk ini.");
      return;
    }
  }

  useEffect(() => {
    try {
      if (produkSelected && produkSelected.variations.length > 0) {
        setSelectedImage(produkSelected.variations[0].gambar[0]);
      }
    } catch {
      setSelectedImage("");
    } finally {
      setMounted(true);
    }
  }, [produkSelected]);

  if (!mounted) {
    // tampilkan skeleton / loading yang sama di server & client sehingga tidak ada mismatch
    return (
      <div className="p-6 dark:bg-slate-900 h-screen transition-colors">
        <h1 className="text-2xl font-bold mb-4 dark:text-white">
          🛒 Keranjang Belanja
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Memuat...</p>
      </div>
    );
  }

  const idImg =
    produkSelected && selectedImage
      ? produkSelected.variations.find((p) => p.gambar.includes(selectedImage))
      : null;

  console.log("idimg", idImg);
  console.log("allimg", allimg);

  console.log("produkSelected:", produkSelected);

  return (
    <div
      className={` max-md:hidden bg-blue-100 rounded-2xl p-4 transition-all duration-500 ease-in-out transform ${
        produkSelected
          ? "translate-x-0 opacity-100 col-span-1"
          : "translate-x-full opacity-0"
      } flex flex-col w-full h-screen overflow-auto items-center bg-blue-100 shadow-md sticky top-0 dark:bg-slate-900`}
    >
      {produkSelected ? (
        <>
          <div className="relative aspect-4/3 w-full ">
            <Image
              src={selectedImage || produkSelected.variations[0].images[0].img}
              alt={produkSelected.nama}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className={`object-cover rounded-2xl `}
            />
          </div>

          {/* gambar kecil yang dipilih */}
          <div className="flex justify-start gap-2 mt-2">
            {produkSelected.variations.map((p, index) => (
              <Image
                key={index}
                src={p.images[0].img}
                alt={produkSelected.nama}
                width={50}
                height={50}
                onClick={() => setSelectedImage(p.images[0].img)}
                className={`object-cover rounded-2xl cursor-pointer w-16 h-16 border-2 ${
                  selectedImage === p.images[0].img
                    ? "border-blue-500"
                    : "border-transparent dark:border-slate-700"
                }`}
              />
            ))}
          </div>

          {/*    Ukuran */}
          <div className="flex justify-start items-center w-full mt-4  flex-wrap">
            {" "}
            <span className="font-semibold text-sm mr-2 dark:text-white">
              Ukuran:
              <span className="bg-blue-300 text-blue-900 px-3 mx-1 rounded-full text-sm font-medium dark:bg-blue-900 dark:text-blue-100">
                {idImg
                  ? idImg.ukuran.join(" | ")
                  : produkSelected.variations[0].sizes
                      .flatMap((p) => p.size)
                      .join(" | ")}
              </span>{" "}
            </span>
          </div>
          {/*    Warna */}
          <div className="flex justify-start items-center w-full mt-4  flex-wrap">
            {" "}
            <span className="font-semibold text-sm mr-2 dark:text-white">
              Warna:
              <span className="bg-blue-300 text-blue-900 px-3 mx-1 rounded-full text-sm font-medium dark:bg-blue-900 dark:text-blue-100">
                {idImg ? idImg.warna : produkSelected.variations[0].warna}
              </span>{" "}
            </span>
          </div>

          {/*      Stok */}
          <div className="flex justify-start items-center w-full mt-4  flex-wrap">
            {" "}
            <span className="font-semibold text-sm mr-2 dark:text-white">
              Stok:
              <span className="bg-blue-300 text-blue-900 px-3 mx-1 rounded-full text-sm font-medium dark:bg-blue-900 dark:text-blue-100">
                {idImg ? idImg.stok : produkSelected.variations[0].stok}
              </span>{" "}
            </span>
          </div>

          <h2 className="text-lg font-semibold mt-2 dark:text-white">
            {capitalizeFirst(produkSelected.nama)}
          </h2>
          <div className="flex justify-between w-full items-center mt-2 mb-4">
            {" "}
            <p className="text-blue-800 font-bold dark:text-blue-400">
              Rp{" "}
              {idImg
                ? idImg.harga.toLocaleString("id-ID")
                : produkSelected.variations[0].harga.toLocaleString("id-ID")}
            </p>
            <button
              onClick={handleOwner}
              className="bg-blue-900 text-white p-2 rounded-lg hover:bg-blue-700 transition-all duration-200 cursor-pointer dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              <Link href={`/produk/${produkSelected.id}`}>Lihat detail</Link>
            </button>
          </div>

          <p className="mt-4 text-justify text-gray-500 dark:text-gray-300">
            {produkSelected.deskripsi} Lorem ipsum dolor sit amet consectetur
            adipisicing elit. Corporis aliquam est consectetur corrupti
            perspiciatis voluptate eum quod tempore nam, amet nemo, omnis earum,
            soluta quaerat! Ad odit voluptate aperiam doloribus. Lorem ipsum
            dolor sit amet consectetur adipisicing elit. Vel cum commodi fugiat
            dolorum quidem, ab obcaecati esse dolor aperiam sint? Praesentium
            amet iste autem officia mollitia! Quos corporis beatae consequatur?
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Tempora
            ipsam voluptates non numquam provident sint sequi, perferendis vel
            ad nemo delectus iste, aperiam, enim porro! Iste eum voluptate
            cupiditate? Voluptatibus.
          </p>
        </>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">
          Pilih produk untuk melihat detail
        </p>
      )}
    </div>
  );
}
