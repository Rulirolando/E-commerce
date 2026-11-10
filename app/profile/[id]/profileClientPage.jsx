"use client";

import { useEffect, useState, useCallback } from "react";
import CardProduk from "../../components/CardProduk";
import Image from "next/image";
import Navbar from "../../components/navbar";
import { MdAccountCircle } from "react-icons/md";
import { IoBasket } from "react-icons/io5";
import { TbBrandProducthunt } from "react-icons/tb";
import { FaHeart } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import { IoIosSettings } from "react-icons/io";
import { CiLock } from "react-icons/ci";
import { RiLogoutBoxRLine } from "react-icons/ri";
import { MdOutlineVerifiedUser, MdAccessTime } from "react-icons/md";
import { IoIosNotificationsOutline } from "react-icons/io";
import { MdOutlineMail } from "react-icons/md";
import { IoHelpCircleOutline } from "react-icons/io5";
import { PiNewspaperThin } from "react-icons/pi";
import ProfileEditModal from "../../components/ProfileEditModal";
import AddAdressModal from "../../components/AddressAddModal";
import Link from "next/link";
import EditProdukModal from "../../components/EditProduk";
import { signOut } from "next-auth/react";
import { format, formatDistanceToNow, isValid } from "date-fns";
import { id } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function ProfilePage({ userId, currentUser }) {
  const [user, setUser] = useState({});
  const [username, setUsername] = useState(null);
  const [activeMenu, setActiveMenu] = useState("profile");
  const [activePesananMenu, setActivePesananMenu] = useState("semuapesanan");
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [mailEnabled, setMailEnabled] = useState(false);
  const [IsEditProfile, setIsEditProfile] = useState(false);
  const [isAddAddress, setIsAddAddress] = useState(false);
  const [isEditAddress, setIsEditAddress] = useState(null);
  const [editAddress, setEditAddress] = useState(null);
  const [produkBeli, setProdukBeli] = useState([]);
  const [isEdit, setIsEdit] = useState(false);
  const [onEdit, setOnEdit] = useState({});
  const [myProduks, setMyProduks] = useState(null);
  const [addressList, setAddressList] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: produkLoves = [], isLoading: loadingLoves } = useQuery({
    queryKey: ["Favorite", userId],
    queryFn: async () => {
      const res = await fetch(`/api/love/${userId}`);
      if (!res.ok) throw new Error("Gagal mengambil favorit");
      return res.json();
    },
    enabled: !!userId,
  });

  const loveMutation = useMutation({
    mutationFn: async (produkId) => {
      const res = await fetch("/api/love", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          productId: produkId,
        }),
      });
      if (!res.ok) throw new Error("Gagal update wishlist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["Favorite"] });
    },
  });

  async function toggleLove(produkId) {
    if (!currentUser) return alert("Silakan login terlebih dahulu.");
    loveMutation.mutate(produkId);
  }

  async function handleSubmitAddress(e, id) {
    e.preventDefault();
    if (!editAddress) return;

    try {
      const res = await fetch(`/api/profile/address/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editAddress),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Gagal memperbarui alamat");
      }

      const updatedDataFromDB = await res.json();
      const newAddressList = addressList.map((item) =>
        item.id === id ? updatedDataFromDB : item,
      );
      setAddressList(newAddressList);
      setIsEditAddress(null);
      setEditAddress(null);
      alert("Alamat berhasil diperbarui!");
    } catch (error) {
      console.error("Error updating address:", error);
      alert("Terjadi kesalahan saat memperbarui alamat.");
    }
  }

  async function handleDeleteAddress(id) {
    try {
      const res = await fetch(`/api/profile/address/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Gagal menghapus alamat");
      }

      alert("Alamat berhasil dihapus!");
      const newAddressList = addressList.filter((item) => item.id !== id);
      setAddressList(newAddressList);
    } catch (error) {
      console.error("Error deleting address:", error);
      alert("Terjadi kesalahan saat menghapus alamat.");
    }
  }

  const toggleStatusAddress = async (addressId) => {
    try {
      const response = await fetch("/api/profile/address", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: addressId,
          userId: userId,
        }),
      });

      if (!response.ok) throw new Error("Gagal memperbarui database");
      await fetchAddresses();
    } catch (error) {
      console.error("Error:", error);
      alert("Gagal mengubah alamat utama");
    }
  };

  async function handleHapusProduk(variationId) {
    const confirmDelete = window.confirm("Yakin ingin menghapus variasi ini?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/product/${variationId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Produk terhapus!");
        window.location.reload();
      } else {
        const errorData = await res.json();
        alert(errorData.error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Terjadi kesalahan koneksi");
    }
  }

  const fetchAddresses = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/profile/address/${userId}`, {
        method: "GET",
      });

      const data = await response.json();

      if (response.ok) {
        setAddressList(data);
      } else {
        console.error("Gagal mengambil data:", data.message);
      }
    } catch (error) {
      console.error("Error fetching address list:", error);
    }
  }, [userId]);

  const formatHumanDate = (dateInput) => {
    if (!dateInput) return null;
    let date = new Date(dateInput);

    if (!isValid(date)) {
      return "Tanggal tidak valid";
    }

    const relative = formatDistanceToNow(date, {
      addSuffix: true,
      locale: id,
    });
    const absolute = format(date, "d MMM yyyy", { locale: id });

    return `${absolute} (${relative})`;
  };

  useEffect(() => {
    if (userId) {
      fetchAddresses();
    }
  }, [fetchAddresses, userId]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/profile/${userId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-cache",
        });

        if (!res.ok) {
          throw new Error("Gagal fetch user");
        }

        const data = await res.json();
        setUser(data);
        setUsername(data.username);
      } catch (error) {
        console.error("FETCH USER ERROR:", error);
      }
    };
    fetchUser();
  }, [userId]);

  useEffect(() => {
    async function fetchMyProduk() {
      try {
        const myProduk = await fetch(`/api/product/user/${userId}`);
        const myProdukData = await myProduk.json();
        setMyProduks(myProdukData);
      } catch {
        setMyProduks(null);
      }
    }
    if (userId) {
      fetchMyProduk();
    }
  }, [userId, isEdit]);

  useEffect(() => {
    try {
      async function fetchProdukBeli() {
        const allProduk = await fetch(`/api/order/${userId}`);
        const allProdukData = await allProduk.json();
        setProdukBeli(allProdukData);
      }
      fetchProdukBeli();
    } catch {
      setProdukBeli([]);
    }
  }, [userId]);

  // Menu samping profil (Pencairan Dana sudah dihapus dari sini)
  const menuItems = [
    {
      id: "profile",
      label: "Profile",
      icon: <MdAccountCircle size={30} />,
      show: true,
    },
    {
      id: "pesanan",
      label: "Pesanan saya",
      icon: <IoBasket size={30} />,
      show: currentUser?.user.id === userId,
    },
    {
      id: "produk",
      label: `Produk ${currentUser?.user.id === userId ? "saya" : username}`,
      icon: <TbBrandProducthunt size={30} />,
      show: true,
    },
    {
      id: "favorit",
      label: "Favorit",
      icon: <FaHeart size={30} />,
      show: currentUser?.user.id === userId,
    },
    {
      id: "alamat",
      label: "Alamat",
      icon: <FaLocationDot size={30} />,
      show: true,
    },
    {
      id: "pengaturan",
      label: "Pengaturan",
      icon: <IoIosSettings size={30} />,
      show: currentUser?.user.id === userId,
    },
  ];

  const handleLogout = async () => {
    setActiveMenu("keluar");
    if (confirm("Apakah Anda yakin ingin keluar?")) {
      await signOut({ callbackUrl: "/", redirect: true });
    }
  };

  const ButtonPesanan = ({ target, label }) => (
    <button
      onClick={() => setActivePesananMenu(target)}
      className={`cursor-pointer border p-1 px-2 rounded-lg bg-blue-950 text-gray-200 transition-all duration-200 ${
        activePesananMenu === target
          ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-400 shadow-md"
          : "bg-blue-100 dark:bg-slate-800 text-blue-900 dark:text-slate-300 border-gray-300 dark:border-slate-700 hover:bg-blue-300 dark:hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );

  const filteredProduk = (condisi) => {
    return (
      <div className="w-full h-full">
        {produkBeli.filter(condisi).map((produk, index) => (
          <div
            key={index}
            className="w-full dark:bg-slate-800 transition-colors bg-blue-200 ml-2 mt-5 rounded-2xl p-4 shadow-2xs"
          >
            <div className="flex w-full justify-between items-center">
              <div className="w-1/2 flex flex-row dark:text-slate-100">
                <IoBasket size={30} />
                <div className="flex flex-col ml-3">
                  <h1>ID: {produk.id}</h1>
                  <p className="font-light text-sm">
                    Tanggal:{" "}
                    {new Date(produk.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              <p className="border-gray-100 rounded-lg px-2 text-[12px] text-light py-0.5 bg-blue-400 dark:bg-blue-600">
                {produk.status}
              </p>
            </div>
            <hr className="mt-5 dark:border-slate-700" />
            <div className="flex justify-between w-full mt-5 items-center">
              <div className="flex items-center">
                <Image
                  src={produk.gambar}
                  width={100}
                  height={100}
                  alt="foto barang"
                  className="object-cover w-30 h-30 rounded-md"
                />
                <div className="flex flex-col ml-3 dark:text-slate-200">
                  <h1 className="font-normal text-sm">{produk.nama}</h1>
                  <div className="flex items-center space-x-3">
                    <p className="font-normal text-sm">
                      Rp.{produk.harga.toLocaleString("id-ID")}
                    </p>
                    <p className="font-light text-light text-sm">
                      {produk.jumlah} x
                    </p>
                  </div>
                  {produk.estimasiTiba && (
                    <div className="flex items-center gap-1 mt-2 text-[11px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-md w-fit italic">
                      <MdAccessTime size={14} />
                      <span>
                        Estimasi tiba: {formatHumanDate(produk.estimasiTiba)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xs uppercase tracking-wider text-amber-900 dark:text-slate-400">
                  Total belanja
                </h1>
                <p className="font-light text-sm dark:text-blue-400">
                  Rp. {(produk.jumlah * produk.harga).toLocaleString("id-ID")}
                </p>

                <div className="flex mt-7 gap-2">
                  <Link
                    href={`/produk/${produk.produk?.productId || produk.produkId}`}
                    className="border-gray-100 bg-blue-500 text-white rounded-lg p-2 dark:bg-blue-700 dark:hover:bg-blue-500 text-xs font-semibold"
                  >
                    Lihat detail
                  </Link>
                  {produk.status === "Selesai" && !produk.review?.length && (
                    <button
                      onClick={() => {
                        setSelectedOrder(produk);
                        setShowReviewModal(true);
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg p-2 transition-colors text-xs font-semibold cursor-pointer"
                    >
                      Beri Ulasan
                    </button>
                  )}
                  {produk.status === "Selesai" && produk.review?.length > 0 && (
                    <span className="text-[10px] text-green-600 dark:text-green-400 font-medium ml-2 italic flex items-center">
                      Sudah diulas
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const profileMenu = (label, input) => (
    <div className="flex flex-col w-1/2">
      <span className="text-amber-900 dark:text-slate-400 text-sm mb-1">
        {label}
      </span>
      <div className="bg-blue-100 border border-gray-300 rounded-md px-2 py-1 w-[90%] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 shadow-inner">
        {input}
      </div>
    </div>
  );

  if (!user) return <div>User tidak ditemukan</div>;

  return (
    <>
      <Navbar currentUser={currentUser} />
      <div className="w-full bg-blue-100 flex gap-4 h-auto dark:bg-slate-900 transition-colors duration-300">
        {/* Kiri */}
        <div className="sticky top-2 mb-4 w-[250px] bg-blue-200 border-gray-100 ml-32 mt-14 rounded-2xl p-4 h-screen dark:bg-slate-800 transition-colors duration-300">
          <div className="flex flex-col items-center">
            <Image
              id={user.id}
              src={
                currentUser?.user?.image || user?.imgProfile || "/no-image.png"
              }
              alt="Profile"
              width={50}
              height={50}
              className="w-16 h-16 rounded-full mb-4 border-transparent dark:border-slate-700 shadow-sm object-cover"
              referrerPolicy="no-referrer"
            />
            <h2 className="font-light text-sm text-gray-500 dark:text-slate-400">
              {user.username}
            </h2>
          </div>

          <div className="flex flex-col">
            {menuItems.map(
              (item, index) =>
                item.show && (
                  <button
                    key={item.id}
                    onClick={() => setActiveMenu(item.id)}
                    className={`flex items-center cursor-pointer p-2 rounded-lg w-[90%] transition-colors 
              ${index === 0 ? "mt-8" : "mt-2"}
              ${
                activeMenu === item.id
                  ? "bg-blue-300 text-amber-950 border-gray-100 dark:bg-blue-600 dark:text-white"
                  : "text-amber-950 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-red-950/30"
              }
            `}
                  >
                    {item.icon}
                    <p className="ml-4 font-bold text-amber-950 dark:text-slate-300">
                      {item.label}
                    </p>
                  </button>
                ),
            )}

            {currentUser?.user.id === userId && (
              <button
                onClick={handleLogout}
                className={`flex items-center mt-2 cursor-pointer p-2 rounded-lg w-[90%] transition-colors 
            ${
              activeMenu === "keluar"
                ? "bg-blue-300 text-amber-950 dark:bg-blue-600 dark:text-white"
                : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            }`}
              >
                <RiLogoutBoxRLine size={30} />
                <p className="ml-4 font-bold text-amber-950 dark:text-slate-300">
                  Keluar
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Kanan */}
        {activeMenu === "profile" && (
          <div className="sticky top-2 w-[800px] h-full bg-blue-200 border-gray-100 ml-2 mt-14 rounded-2xl p-4 shadow-2xl dark:bg-slate-800 transition-colors duration-300">
            <div className="flex justify-between">
              <h1 className="text-2xl font-semibold dark:text-white">
                Profile
                {currentUser?.user.id === userId ? "Saya" : ` ${username}`}
              </h1>
              <button
                type="button"
                onClick={() => setIsEditProfile(true)}
                className={`${
                  currentUser?.user.id === userId ? "" : "hidden"
                } font-semibold border border-blue-500 hover:bg-blue-300 hover:text-amber-950 hover:border-gray-100 p-2 rounded-lg dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white transition-all cursor-pointer`}
              >
                Edit profile
              </button>
            </div>
            {IsEditProfile && (
              <ProfileEditModal
                user={user}
                setUser={setUser}
                onClose={() => setIsEditProfile(false)}
              />
            )}

            <div className="w-full mt-10">
              <div className="flex w-full flex-wrap justify-start space-y-11">
                {profileMenu("Nama Lengkap", user.nama)}
                {profileMenu("Email", user.email)}
                {profileMenu("Nomor Telepon", user.noTelp)}
                {profileMenu(
                  "Tanggal Lahir",
                  user.tanggalLahir
                    ? new Date(user.tanggalLahir).toLocaleDateString("id-ID")
                    : "-",
                )}
                {profileMenu("Jenis Kelamin", user.jenisKelamin)}
              </div>
            </div>
          </div>
        )}

        {activeMenu === "pesanan" && (
          <div className="w-[800px] h-full mb-4 flex flex-col">
            <div className="w-full h-full bg-blue-200 border-gray-100 ml-2 mt-14 rounded-2xl p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700 transition-colors duration-300">
              <div className="w-full">
                <h1 className="text-2xl font-semibold text-start dark:text-white">
                  Pesanan saya
                </h1>
                <div className="flex gap-3 mt-7">
                  <ButtonPesanan target="semuapesanan" label="Semua" />
                  <ButtonPesanan
                    target="belumdibayarpesanan"
                    label="Belum dibayar"
                  />
                  <ButtonPesanan
                    target="dibayarpesanan"
                    label="Sudah dibayar"
                  />
                  <ButtonPesanan target="dikemaspesanan" label="Dikemas" />
                  <ButtonPesanan target="dikirimpesanan" label="Dikirim" />
                  <ButtonPesanan target="selesaipesanan" label="Selesai" />
                </div>
              </div>
            </div>
            {activePesananMenu === "semuapesanan" &&
              filteredProduk((produk) => produk.buyerId === userId)}
            {activePesananMenu === "belumdibayarpesanan" &&
              filteredProduk(
                (produk) =>
                  produk.status === "Belum dibayar" &&
                  produk.buyerId === userId,
              )}
            {activePesananMenu === "dibayarpesanan" &&
              filteredProduk(
                (produk) =>
                  produk.status === "Sudah dibayar" &&
                  produk.buyerId === userId,
              )}
            {activePesananMenu === "dikemaspesanan" &&
              filteredProduk(
                (produk) =>
                  produk.status === "Dikemas" && produk.buyerId === userId,
              )}
            {activePesananMenu === "dikirimpesanan" &&
              filteredProduk(
                (produk) =>
                  produk.status === "Dikirim" && produk.buyerId === userId,
              )}
            {activePesananMenu === "selesaipesanan" &&
              filteredProduk(
                (produk) =>
                  produk.status === "Selesai" && produk.buyerId === userId,
              )}
          </div>
        )}

        {activeMenu === "produk" && (
          <div className="w-[800px] h-full bg-blue-200 border-gray-100 ml-2 mt-14 rounded-2xl p-4 shadow-2xl dark:bg-slate-800 dark:border-slate-700 transition-colors duration-300">
            <div className="flex space-x-4 p-2 dark:border-slate-800">
              <Image
                src={user.foto || "/no-image.png"}
                width={100}
                height={100}
                alt="logo"
                className="object-cover w-30 h-30 rounded-full dark:border-slate-600"
              />
              <div className="flex flex-col">
                <h1 className="text-xl font-bold dark:text-white">
                  Toko kelontong
                </h1>
                <p className="font-light text-sm dark:text-slate-300">
                  {user.username}
                </p>
                <p className="font-light text-sm dark:text-slate-300">
                  {user.email}
                </p>
                <p className="font-light text-sm dark:text-slate-300">
                  {user.alamat}
                </p>
                <p className="font-light text-sm dark:text-slate-300">
                  {user.no_hp}
                </p>
                <p className="font-light text-sm text-yellow-300">★★★★★</p>
              </div>
            </div>
            <div className="font-bold text-xl p-2 dark:text-white">
              Produk saya
            </div>
            <div className="flex flex-start flex-wrap w-full h-full">
              {isEdit && (
                <EditProdukModal
                  produk={onEdit}
                  onClose={() => setIsEdit(false)}
                />
              )}
              {myProduks?.length > 0 ? (
                myProduks?.map((item) =>
                  item.variations?.map((p) => (
                    <CardProduk
                      key={p.id}
                      nama={item.nama}
                      harga={p.harga}
                      stok={p.stok}
                      avgRating={item.avgRating}
                      totalReviews={item.totalReviews}
                      onClick={() => router.push(`/produk/${p.productId}`)}
                      gambar={p.images[0]?.img}
                      terjual={p.terjual}
                      edit={currentUser?.user.id === userId ? true : false}
                      onEdit={() => {
                        setOnEdit({
                          variationId: p.id,
                          productId: item.id,
                          postId: item.id,
                          nama: item.nama,
                          ...p,
                        });
                        setIsEdit(true);
                      }}
                      onHapus={() => {
                        handleHapusProduk(p.id);
                      }}
                      loveProduk={true}
                    />
                  )),
                )
              ) : (
                <div className="w-full flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-lg font-semibold text-gray-500 dark:text-slate-400">
                    Belum ada produk
                  </p>
                  <h1 className="text-sm text-gray-400 dark:text-slate-500">
                    Silahkan tambahkan produk anda
                  </h1>
                </div>
              )}
            </div>
          </div>
        )}

        {activeMenu === "favorit" && (
          <div className="w-[800px] h-full bg-blue-200 border-gray-100 ml-2 mt-14 rounded-2xl p-4 shadow-2xl dark:bg-slate-800 dark:border-slate-700 transition-colors duration-300">
            <div className="flex space-x-4 p-2">
              <h1 className="font-bold text-2xl dark:text-white">Favorit</h1>
            </div>

            <div className="flex flex-start flex-wrap w-full h-full">
              {loadingLoves ? (
                <div className="flex justify-center items-center w-full py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  <p className="ml-3 text-gray-500">Memuat favorit...</p>
                </div>
              ) : produkLoves.length > 0 ? (
                produkLoves.map((produk) => (
                  <CardProduk
                    key={produk.id}
                    nama={produk.product?.nama}
                    stok={produk.product?.variations?.[0]?.stok}
                    harga={
                      "Rp " +
                      produk.product?.variations?.[0]?.harga.toLocaleString(
                        "id-ID",
                      )
                    }
                    avgRating={produk.product?.avgRating}
                    totalReviews={produk.product?.totalReviews}
                    gambar={produk.product?.variations?.[0]?.images?.[0]?.img}
                    terjual={produk.product?.variations?.[0]?.terjual || 0}
                    edit={false}
                    isLoved={produk.status === true}
                    onLove={() => toggleLove(produk.productId)}
                    showLove={produk.product?.ownerId === currentUser?.user.id}
                    onClick={() =>
                      router.push(
                        `/produk/${produk.product?.variations?.[0]?.id}`,
                      )
                    }
                  />
                ))
              ) : (
                <p className="text-gray-500 dark:text-slate-400 italic">
                  Belum ada produk favorit
                </p>
              )}
            </div>
          </div>
        )}

        {activeMenu === "alamat" && (
          <div className="w-[800px] h-full bg-blue-200 border-gray-100 ml-2 mt-14 rounded-2xl p-4 shadow-2xl dark:bg-slate-800 dark:border-slate-700 transition-colors duration-300">
            <div className="flex justify-between mb-12 pt-2">
              <h1 className="text-2xl font-semibold dark:text-white">Alamat</h1>
              {userId && (
                <button
                  onClick={() => setIsAddAddress(!isAddAddress)}
                  className="border border-blue-500 hover:bg-blue-300 hover:text-amber-950 hover:border-gray-100 p-2 rounded-lg cursor-pointer dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-600 dark:hover:text-white transition-all"
                >
                  {isAddAddress ? "Batal" : "Tambahkan Alamat"}
                </button>
              )}
            </div>

            {/* Tambah alamat Baru */}
            {isAddAddress && userId && (
              <AddAdressModal
                currentUser={currentUser}
                onClose={() => setIsAddAddress(!isAddAddress)}
                onAddAddress={async (newaddress) => {
                  try {
                    const res = await fetch(`/api/profile/address`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        newaddress,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      alert(data.message || "Gagal update");
                      return;
                    }
                    setAddressList(data);
                  } catch {
                    console.error("Error updating profile.");
                  }
                }}
              />
            )}

            {[...addressList].length > 0 ? (
              [...addressList].map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col mt-3 w-full hover:border border-gray-400 shadow-lg rounded-md p-6 dark:hover:border-slate-600 transition-all dark:bg-slate-800/50 ${item.status ? "ring-2 ring-blue-500 dark:ring-blue-600 bg-white dark:bg-slate-800" : ""}`}
                >
                  <form
                    onSubmit={(e) => handleSubmitAddress(e, item?.id)}
                    className=""
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className="flex flex-col gap-2 w-full max-w-md">
                        {/* Input Nama & Status */}
                        <div className="flex space-x-3 items-center">
                          <input
                            type="text"
                            value={
                              isEditAddress === item.id
                                ? editAddress.nama
                                : item.nama
                            }
                            className="font-bold text-lg border-b focus:outline-none focus:border-blue-500 dark:text-white dark:disabled:text-slate-200 transition-colors"
                            placeholder="Nama"
                            disabled={isEditAddress !== item.id}
                            onChange={(e) =>
                              setEditAddress({
                                ...editAddress,
                                nama: e.target.value,
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={() => toggleStatusAddress(item.id)}
                            className={`px-2 py-1 rounded text-xs cursor-pointer transition-all ${
                              item.status
                                ? "bg-green-500 text-white"
                                : "bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                            }`}
                          >
                            {" "}
                            {item.status ? "Alamat Utama" : "Jadikan Utama"}
                          </button>
                        </div>

                        {/* Input Telepon */}
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={
                            isEditAddress === item.id
                              ? editAddress.telepon
                              : item.telepon
                          }
                          className="text-sm border-b focus:outline-none focus:border-blue-500 w-full dark:text-slate-300"
                          placeholder="Nomor Telepon"
                          disabled={isEditAddress !== item.id}
                          onChange={(e) => {
                            const onlyNumber = e.target.value.replace(
                              /\D/g,
                              "",
                            );
                            setEditAddress({
                              ...editAddress,
                              telepon: onlyNumber,
                            });
                          }}
                        />

                        {/* Input Alamat */}
                        <textarea
                          value={
                            isEditAddress === item.id
                              ? editAddress.alamat
                              : item.alamat
                          }
                          className="text-sm border-b focus:outline-none focus:border-blue-500 w-full dark:text-slate-300"
                          placeholder="Alamat Lengkap"
                          name="alamat"
                          disabled={isEditAddress !== item.id}
                          onChange={(e) =>
                            setEditAddress({
                              ...editAddress,
                              alamat: e.target.value,
                            })
                          }
                        />

                        {/* Input Lokasi */}
                        <input
                          type="text"
                          value={
                            isEditAddress === item.id
                              ? editAddress.lokasi
                              : item.lokasi
                          }
                          className="text-sm border-b focus:outline-none focus:border-blue-500 w-full dark:text-blue-400"
                          placeholder="Koordinat/Lokasi"
                          name="lokasi"
                          disabled={isEditAddress !== item.id}
                          onChange={(e) =>
                            setEditAddress({
                              ...editAddress,
                              lokasi: e.target.value,
                            })
                          }
                        />
                      </div>
                      <button
                        type="submit"
                        className={`bg-blue-500 ${
                          isEditAddress !== item.id ? "hidden" : ""
                        } text-white hover:bg-blue-600 px-4 py-2 rounded-lg text-sm transition cursor-pointer`}
                      >
                        Simpan
                      </button>

                      {/* Tombol Aksi */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.id !== isEditAddress) {
                              setIsEditAddress(item.id);
                              setEditAddress(item);
                            } else {
                              setIsEditAddress(null);
                              setEditAddress(null);
                            }
                          }}
                          className="bg-blue-500 text-white hover:bg-blue-600 px-4 py-2 rounded-lg text-sm transition cursor-pointer dark:bg-blue-500 dark:hover:bg-blue-600 "
                        >
                          {isEditAddress === item.id ? "Batal" : "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(item.id)}
                          className="border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm cursor-pointer dark:border-slate-600 dark:text-slate-400 dark:hover:bg-red-900/20 transition-all"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-gray-500 dark:text-slate-400 italic font-medium">
                  Belum ada alamat tersimpan
                </p>
              </div>
            )}
          </div>
        )}

        {activeMenu === "pengaturan" && (
          <div className="w-[800px] h-full bg-blue-200 border-gray-100 ml-2 mt-14 rounded-2xl p-4 shadow-2xl dark:bg-slate-800 dark:border-slate-700 transition-colors duration-300">
            <div className="w-full">
              <h1 className="font-bold text-lg dark:text-white">
                Pengaturan Akun
              </h1>
              <p className="font-bold text-sm mt-7 dark:text-slate-400">
                Keamanan
              </p>
            </div>

            <button className="flex flex-row items-center space-x-3 mt-3 w-full hover:border border-gray-400 shadow-lg rounded-md p-6 cursor-pointer dark:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all">
              <div className="p-2 bg-blue-100 dark:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400 transition-colors">
                <CiLock size={24} />
              </div>
              <div className="flex flex-col text-left">
                <h2 className="font-semibold text-gray-800 dark:text-slate-200">
                  Ubah kata sandi
                </h2>
                <p className="text-xs font-light dark:text-slate-400">
                  Terakhir diubah bulan lalu
                </p>
              </div>
            </button>

            <button className="flex flex-row items-center space-x-3 mt-3 w-full hover:border border-gray-400 shadow-lg rounded-md p-6 cursor-pointer dark:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all">
              <div className="p-2 bg-blue-100 dark:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400 transition-colors">
                <MdOutlineVerifiedUser size={24} />
              </div>
              <div className="flex flex-col text-left">
                <h2 className="font-semibold text-gray-800 dark:text-slate-200">
                  Verifikasi 2 langkah
                </h2>
                <p className="text-xs font-light dark:text-slate-400">
                  Tingkatkan keamanan akun anda
                </p>
              </div>
            </button>

            <p className="font-bold text-sm mt-7 dark:text-slate-400">
              Notifikasi
            </p>

            <div className="flex items-center justify-between mt-3 w-full border-gray-400 shadow-lg rounded-md p-6 dark:bg-slate-800/50">
              <div className="flex flex-row items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400 transition-colors">
                  <IoIosNotificationsOutline size={24} />
                </div>
                <div className="flex flex-col">
                  <h2 className="font-semibold text-gray-800 dark:text-slate-200">
                    Notifikasi
                  </h2>
                  <p className="text-xs font-light dark:text-slate-400">
                    Terima notifikasi pesanan & promo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotifEnabled(!notifEnabled)}
                className={`relative flex h-6 w-12 cursor-pointer items-center rounded-full transition-colors duration-300 ${
                  notifEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`absolute h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-300 ${
                    notifEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between mt-3 w-full border-gray-400 shadow-lg rounded-md p-6 dark:bg-slate-800/50">
              <div className="flex flex-row items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400 transition-colors">
                  <MdOutlineMail size={24} />
                </div>
                <div className="flex flex-col">
                  <h2 className="font-semibold text-gray-800 dark:text-slate-200">
                    Email Newsletter
                  </h2>
                  <p className="text-xs font-light text-gray-500 dark:text-slate-400">
                    Dapatkan info promo terbaru
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMailEnabled(!mailEnabled)}
                className={`relative flex h-6 w-12 cursor-pointer items-center rounded-full transition-colors duration-300 ${
                  mailEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`absolute h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-300 ${
                    mailEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <p className="font-bold text-sm mt-7 dark:text-slate-400">
              Lainnya
            </p>

            <button className="flex flex-row items-center space-x-3 mt-3 w-full hover:border border-gray-400 shadow-lg rounded-md p-6 cursor-pointer dark:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all">
              <div className="p-2 bg-blue-100 dark:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400 transition-colors">
                <IoHelpCircleOutline size={24} />
              </div>
              <h2 className="text-sm font-medium text-gray-800 dark:text-slate-200">
                Bantuan & dukungan
              </h2>
            </button>

            <button className="flex flex-row items-center space-x-3 mt-3 w-full hover:border border-gray-400 shadow-lg rounded-md p-6 cursor-pointer dark:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all">
              <div className="p-2 bg-blue-100 dark:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400 transition-colors">
                <PiNewspaperThin size={24} />
              </div>
              <h2 className="text-sm font-medium text-gray-800 dark:text-slate-200">
                Syarat & ketentuan
              </h2>
            </button>
          </div>
        )}
      </div>

      {/* Modal Beri Ulasan */}
      {showReviewModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4 dark:text-white">
              Beri Ulasan Produk
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Rating (1 - 5 Bintang)
                </label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-2xl cursor-pointer ${
                        rating >= star ? "text-amber-400" : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Komentar / Ulasan
                </label>
                <textarea
                  className="w-full border rounded-lg p-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white mt-1"
                  rows={4}
                  placeholder="Ceritakan pengalaman Anda membeli produk ini..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      // Ambil ID produk utama dengan aman dari berbagai kemungkinan struktur data
                      const targetProductId =
                        selectedOrder.produk?.product?.id || // Jika order meload product di dalam variasi
                        selectedOrder.produk?.productId || // Jika variasi menyimpan productId
                        selectedOrder.productId || // Kolom langsung di order jika ada
                        selectedOrder.product?.id; // Cadangan

                      if (!targetProductId) {
                        alert("ID Produk utama tidak ditemukan.");
                        return;
                      }

                      const res = await fetch("/api/review", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          orderId: Number(selectedOrder.id),
                          productId: Number(targetProductId),
                          rating: Number(rating),
                          comment,
                        }),
                      });

                      const data = await res.json();

                      if (!res.ok) {
                        throw new Error(
                          data.message || "Gagal mengirim ulasan",
                        );
                      }

                      alert("Ulasan berhasil dikirim!");
                      setShowReviewModal(false);
                      setComment("");
                      window.location.reload();
                    } catch (err) {
                      alert(err.message || "Gagal mengirim ulasan.");
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                >
                  Kirim Ulasan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
