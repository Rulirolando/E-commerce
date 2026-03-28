"use client";

import { useState } from "react";
import Navbar from "../../components/navbar";
import Image from "next/image";
import { IoBasket } from "react-icons/io5";
import Link from "next/link";
import { GoPerson } from "react-icons/go";
import { MdOutlinePhone, MdAccessTime } from "react-icons/md";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const FilterButton = ({
  label,
  target,
  activePesananMenu,
  setActivePesananMenu,
}) => (
  <button
    onClick={() => setActivePesananMenu(target)}
    className={` ${
      activePesananMenu === target
        ? "bg-blue-900 text-blue-900 dark:bg-blue-700 dark:border-blue-700"
        : "bg-blue-950 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700  dark:hover:bg-slate-700"
    } cursor-pointer border p-1 px-2 rounded-lg  text-gray-200`}
  >
    {label}
  </button>
);

const FilteredProduk = ({
  label,
  active,
  status,
  statusChange,
  produkBeli,
  estimasiWaktu,
  setEstimasiWaktu,
  handleStatusChange,
}) => {
  if (active === label && label === "semuapesanan") {
    return (
      <>
        {" "}
        <div className="w-full h-full  ">
          {produkBeli.map((produk, index) => (
            <div
              key={index}
              className="w-full  bg-blue-200 ml-2 mt-5 rounded-2xl p-4 shadow-2xs dark:bg-slate-900 dark:border-slate-800 transition-colors"
            >
              <div className="flex w-full justify-between items-center">
                <div className="w-1/2 flex flex-row dark:text-blue-400">
                  {" "}
                  <IoBasket size={30} />{" "}
                  <div className="flex flex-col ml-3 dark:text-white">
                    <h1>ID: {produk.produkId}</h1>
                    <p className="font-light text-sm opacity-80 dark:text-slate-400">
                      Tanggal:{" "}
                      {new Date(produk.createdAt).toLocaleString("id-ID")}
                    </p>
                    <div className="flex items-center">
                      {" "}
                      <GoPerson />
                      <p className="font-light text-sm ml-2">
                        {produk.namaPenerima}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <MdOutlinePhone />
                      <p className="font-light text-sm ml-2">
                        {" "}
                        {produk.telepon}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="border-gray-100 rounded-lg px-2 text-[12px] text-light py-0.5 bg-blue-400 dark:bg-blue-600 ">
                  {produk.status}
                </p>
              </div>
              <hr className="mt-5 dark:border-slate-800 border-slate-300" />
              <div className="flex justify-between w-full mt-5 items-center">
                <div className="flex items-center">
                  <Image
                    src={produk.gambar}
                    width={100}
                    height={100}
                    alt="foto barang"
                    className="object-cover w-30 h-30 rounded-md dark:bg-slate-800"
                  />
                  <div className="flex flex-col ml-3 dark:text-white">
                    <h1 className="font-normal text-sm">{produk.nama}</h1>
                    <div className="flex items-center space-x-3 ">
                      <p className="font-normal text-sm dark:text-blue-400">
                        Rp.{produk.harga.toLocaleString("id-ID")}
                      </p>
                      <p className="font-light text-light text-sm">
                        {produk.jumlah} x
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col text-slate-900 dark:text-white">
                  <h1>Total belanja</h1>
                  <p className="font-light text-sm">
                    Rp.
                    {(produk.jumlah * produk.harga).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  } else if (active === label) {
    return (
      <>
        {" "}
        <div className="w-full h-full  ">
          {produkBeli
            .filter((produk) => produk.status === status)
            .map((produk, index) => (
              <div
                key={index}
                className="w-full  bg-blue-200 ml-2 mt-5 rounded-2xl p-4 shadow-2xs dark:bg-slate-900 dark:border-slate-800 transition-colors"
              >
                <div className="flex w-full justify-between items-center">
                  <div className="w-1/2 flex flex-row text-slate-800 dark:text-blue-400">
                    {" "}
                    <IoBasket size={30} />{" "}
                    <div className="flex flex-col ml-3 text-slate-900 dark:text-white">
                      <h1>ID: {produk.produkId}</h1>
                      <p className="font-light text-sm dark:text-slate-400">
                        {new Date(produk.createdAt).toLocaleString("id-ID")}
                      </p>
                      <div className="flex items-center">
                        {" "}
                        <GoPerson />
                        <p className="font-light text-sm ml-2">
                          {produk.namaPenerima}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <MdOutlinePhone />
                        <p className="font-light text-sm ml-2">
                          {" "}
                          {produk.telepon}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="border-gray-100 rounded-lg px-2 text-[12px] text-light py-0.5 bg-blue-400 dark:bg-blue-600">
                    {produk.status}
                  </p>
                </div>
                <hr className="mt-5 border-slate-300 dark:border-slate-800" />
                <div className="flex justify-between w-full mt-5 items-center">
                  <div className="flex items-center">
                    <Image
                      src={produk.gambar}
                      width={100}
                      height={100}
                      alt="foto barang"
                      className="object-cover w-30 h-30 rounded-md dark:bg-slate-800"
                    />
                    <div className="flex flex-col ml-3 text-slate-900 dark:text-white">
                      <h1 className="font-normal text-sm">{produk.nama}</h1>
                      <div className="flex items-center space-x-3 ">
                        <p className="font-normal text-sm dark:text-blue-400">
                          Rp.{produk.harga.toLocaleString("id-ID")}
                        </p>
                        <p className="font-light text-light text-sm">
                          {produk.jumlah} x
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col text-slate-900 dark:text-white">
                    <h1>Total belanja</h1>
                    <p className="font-light text-sm">
                      Rp.
                      {(produk.jumlah * produk.harga).toLocaleString("id-ID")}
                    </p>

                    {status !== "Selesai" && label !== "semuapesanan" && (
                      <div className="mt-5 pt-4 border-t dark:border-slate-800 border-slate-100 flex flex-wrap items-end justify-end gap-4">
                        {/* Input Estimasi Waktu */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                            <MdAccessTime /> Estimasi Sampai
                          </label>
                          <input
                            type="date"
                            placeholder="Contoh: 2-3 Hari atau 24 Maret"
                            className="p-2 text-xs rounded-md border border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-48"
                            value={estimasiWaktu[produk.id] || ""}
                            onChange={(e) =>
                              setEstimasiWaktu({
                                ...estimasiWaktu,
                                [produk.id]: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}

                    {status === "Selesai" ? (
                      <div className="flex mt-7">
                        <button className="border-gray-100 bg-blue-500 rounded-lg p-2 dark:bg-blue-600">
                          <Link href={`/produk/${produk.produkId}`}>
                            {" "}
                            Lihat detail
                          </Link>
                        </button>
                      </div>
                    ) : (
                      ""
                    )}
                    {status === "Selesai" ? (
                      ""
                    ) : (
                      <div className="flex mt-7">
                        <button
                          onClick={() =>
                            handleStatusChange(produk.id, statusChange)
                          }
                          className="border-gray-100 bg-blue-500 rounded-lg p-2 dark:bg-blue-600"
                        >
                          Ubah status
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </>
    );
  }
};

export default function DetailPage({ currentUser }) {
  const [activePesananMenu, setActivePesananMenu] = useState("semuapesanan");
  const [estimasiWaktu, setEstimasiWaktu] = useState({});
  const queryClient = useQueryClient();

  const fetchUserOrders = async (userId) => {
    const response = await fetch(`/api/order/produk/${userId}`);
    if (!response.ok) throw new Error("Gagal mengambil data pesanan");
    return response.json();
  };

  const {
    data: produkBeli = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["orders", currentUser?.user?.id],
    queryFn: () => fetchUserOrders(currentUser.user.id),
    enabled: !!currentUser?.user?.id,
  });

  const updateOrderStatus = async ({ id, status, estimasiTiba }) => {
    const response = await fetch("/api/order", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, estimasiTiba }),
    });
    if (!response.ok) throw new Error("Gagal memperbarui status");
    return response.json();
  };

  const mutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: (data, variables) => {
      // Refresh data otomatis setelah update berhasil
      queryClient.invalidateQueries({
        queryKey: ["orders", currentUser?.user?.id],
      });
      alert(`Pesanan ${variables.status}!`);
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  async function handleStatusChange(id, ket) {
    const waktuSampai = estimasiWaktu[id];

    if (ket === "Dikirim" && !waktuSampai) {
      alert("Harap masukkan estimasi tanggal tiba terlebih dahulu!");
      return;
    }
    mutation.mutate({ id, status: ket, estimasiTiba: waktuSampai });
  }

  return (
    <>
      <Navbar currentUser={currentUser} />
      <div className="w-full bg-blue-100 px-15 min-h-screen dark:bg-slate-950 transition-colors">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
          Kelola pesanan
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Kelola semua pesanan masuk dari pelanggan
        </p>
        {isLoading ? (
          <div className="mt-10 text-center dark:text-white">
            Memuat data pesanan...
          </div>
        ) : isError ? (
          <div className="mt-10 text-center text-red-500">
            Terjadi kesalahan saat memuat data.
          </div>
        ) : (
          <div className="w-full flex flex-col">
            {" "}
            <div className="flex gap-3 mt-7">
              <FilterButton
                label="Semua"
                target="semuapesanan"
                activePesananMenu={activePesananMenu}
                setActivePesananMenu={setActivePesananMenu}
              />
              <FilterButton
                label="Belum Dibayar"
                target="belumdibayarpesanan"
                activePesananMenu={activePesananMenu}
                setActivePesananMenu={setActivePesananMenu}
              />
              <FilterButton
                label="Sudah dibayar"
                target="dibayarpesanan"
                activePesananMenu={activePesananMenu}
                setActivePesananMenu={setActivePesananMenu}
              />
              <FilterButton
                label="Dikemas"
                target="dikemaspesanan"
                activePesananMenu={activePesananMenu}
                setActivePesananMenu={setActivePesananMenu}
              />
              <FilterButton
                label="Dikirim"
                target="dikirimpesanan"
                activePesananMenu={activePesananMenu}
                setActivePesananMenu={setActivePesananMenu}
              />
              <FilterButton
                label="Selesai"
                target="selesaipesanan"
                activePesananMenu={activePesananMenu}
                setActivePesananMenu={setActivePesananMenu}
              />
            </div>
            <FilteredProduk
              label="semuapesanan"
              active={activePesananMenu}
              produkBeli={produkBeli}
              estimasiWaktu={estimasiWaktu}
              setEstimasiWaktu={setEstimasiWaktu}
              handleStatusChange={handleStatusChange}
            />
            <FilteredProduk
              label="belumdibayarpesanan"
              active={activePesananMenu}
              status="Belum dibayar"
              statusChange="Sudah dibayar"
              produkBeli={produkBeli}
              estimasiWaktu={estimasiWaktu}
              setEstimasiWaktu={setEstimasiWaktu}
              handleStatusChange={handleStatusChange}
            />
            <FilteredProduk
              label="dibayarpesanan"
              active={activePesananMenu}
              status="Sudah dibayar"
              statusChange="Dikemas"
              produkBeli={produkBeli}
              estimasiWaktu={estimasiWaktu}
              setEstimasiWaktu={setEstimasiWaktu}
              handleStatusChange={handleStatusChange}
            />
            <FilteredProduk
              label="dikemaspesanan"
              active={activePesananMenu}
              status="Dikemas"
              statusChange="Dikirim"
              produkBeli={produkBeli}
              estimasiWaktu={estimasiWaktu}
              setEstimasiWaktu={setEstimasiWaktu}
              handleStatusChange={handleStatusChange}
            />
            {/* Dikirim pesanan */}
            <FilteredProduk
              label="dikirimpesanan"
              active={activePesananMenu}
              status="Dikirim"
              statusChange="Selesai"
              produkBeli={produkBeli}
              estimasiWaktu={estimasiWaktu}
              setEstimasiWaktu={setEstimasiWaktu}
              handleStatusChange={handleStatusChange}
            />
            {/* Selesai Pesanan */}
            <FilteredProduk
              label="selesaipesanan"
              active={activePesananMenu}
              status="Selesai"
              produkBeli={produkBeli}
              estimasiWaktu={estimasiWaktu}
              setEstimasiWaktu={setEstimasiWaktu}
              handleStatusChange={handleStatusChange}
            />
          </div>
        )}
      </div>
    </>
  );
}
