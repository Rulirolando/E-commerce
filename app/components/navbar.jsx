"use client";
import Link from "next/link";
import { SlBasket } from "react-icons/sl";
import SearchBar from "../components/SearchBar";
import { useRouter } from "next/navigation";
import { IoMoon, IoSunny } from "react-icons/io5";
import { FaRegBell } from "react-icons/fa";
import useThemeStore from "../../store/useThemeStore";
import { useEffect } from "react";
import useNotificationStore from "../../store/useNotificationStore";

export default function Navbar({ className = "", currentUser }) {
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { unreadCount, setUnreadCount } = useNotificationStore();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (currentUser) {
      const fetchNotifications = async () => {
        try {
          const res = await fetch(
            `/api/notifications?userId=${currentUser.user.id}`,
          );
          const data = await res.json();
          const count = data.filter((n) => !n.isRead).length;
          setUnreadCount(count);
        } catch {
          console.error("Gagal mengambil notifikasi");
        }
      };

      fetchNotifications();
      const interval = setInterval(fetchNotifications, 120000);
      return () => clearInterval(interval);
    }
  }, [currentUser, setUnreadCount]);

  function capitalizeFirst(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  return (
    <div
      className={`w-full h-20 bg-[#3C467B] flex justify-between items-center px-10 text-white ${className} dark:bg-slate-900 dark:text-white transition-colors duration-300`}
    >
      <h1
        className="text-4xl font-semibold cursor-pointer"
        onClick={() => router.push("/")}
      >
        Rulshop
      </h1>

      {/* Search bar */}
      <SearchBar />

      {/* Theme toggle */}
      <button
        onClick={toggleDarkMode}
        className="text-2xl p-2 rounded-full hover:bg-slate-700 transition-colors duration-300"
      >
        {isDarkMode ? <IoSunny /> : <IoMoon />}
      </button>

      {currentUser && (
        <Link
          href="/notifications"
          className="relative p-2 hover:bg-slate-700 rounded-full transition-all"
        >
          <FaRegBell className="text-2xl" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#3C467B] dark:border-slate-900">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      )}

      <Link href="/keranjang">
        <SlBasket />
      </Link>

      {currentUser && <Link href="/sell">Sell</Link>}

      <div className="flex gap-6 text-sm">
        {currentUser ? (
          <>
            <Link href={`/order/${currentUser.user.id}`}>Kelola pesanan</Link>
            <Link href={`/profile/${currentUser.user.id}`}>
              {" "}
              <p>{capitalizeFirst(currentUser.user.name)}</p>
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="text-blue-200 hover:text-blue-300"
            >
              Login
            </Link>
            <Link
              href="/auth/daftar"
              className="text-blue-200 hover:text-blue-300"
            >
              Daftar
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
