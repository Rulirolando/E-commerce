"use client";
import Link from "next/link";
import { SlBasket } from "react-icons/sl";
import SearchBar from "../components/SearchBar";
import { useRouter, usePathname } from "next/navigation";
import { IoMoon, IoSunny, IoChatbubbleEllipses } from "react-icons/io5";
import { FaRegBell } from "react-icons/fa";
import useThemeStore from "../../store/useThemeStore";
import { useEffect, useRef } from "react";
import useNotificationStore from "../../store/useNotificationStore";
import useChatStore from "../../store/useChatStore";
import { socket } from "../../lib/socket";

export default function Navbar({ className = "", currentUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  // Menyimpan ref pathname agar callback socket selalu menggunakan nilai pathname terbaru tanpa re-subscribe socket effect
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { unreadCount, setUnreadCount } = useNotificationStore();
  const {
    unreadChatCount,
    setUnreadChatCount,
    incrementUnreadChat,
    resetUnreadChat,
  } = useChatStore();

  const user = currentUser?.user;
  const userId = user?.id;
  const isLoggedIn = Boolean(userId);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Fetch Notifikasi
  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${userId}`);
        if (!res.ok) return;
        const data = await res.json();
        const count = Array.isArray(data)
          ? data.filter((n) => !n.isRead).length
          : 0;
        setUnreadCount(count);
      } catch (err) {
        console.error("Gagal mengambil notifikasi:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 120000);

    return () => clearInterval(interval);
  }, [userId, setUnreadCount]);

  // Fetch Unread Chat & Listener Socket Real-time
  useEffect(() => {
    if (!userId) return;

    const fetchUnreadChats = async () => {
      try {
        const res = await fetch(`/api/chat?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const unreadTotal = data.filter((chat) => chat.isUnread).length;
            setUnreadChatCount(unreadTotal);
          }
        }
      } catch (err) {
        console.error("Gagal mengambil unread chat count:", err);
      }
    };

    fetchUnreadChats();

    socket.emit("join-personal-room", userId);

    const handleUpdateChatList = () => {
      if (!pathnameRef.current.startsWith("/chat")) {
        incrementUnreadChat();
      }
    };

    socket.on("update-chat-list", handleUpdateChatList);

    return () => {
      socket.off("update-chat-list", handleUpdateChatList);
    };
  }, [userId, setUnreadChatCount, incrementUnreadChat]);

  // Reset unread chat saat pengguna membuka halaman /chat
  useEffect(() => {
    if (pathname.startsWith("/chat")) {
      resetUnreadChat();
    }
  }, [pathname, resetUnreadChat]);

  function capitalizeFirst(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  return (
    <div
      className={`w-full h-20 bg-[#3C467B] flex justify-between items-center px-10 text-white dark:bg-slate-900 dark:text-white transition-colors duration-300 ${className}`}
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
        aria-label="Toggle Dark Mode"
        className="text-2xl p-2 rounded-full hover:bg-slate-700 transition-colors duration-300"
      >
        {isDarkMode ? <IoSunny /> : <IoMoon />}
      </button>

      {/* Notification Icon */}
      {isLoggedIn && (
        <Link
          href="/notifications"
          aria-label="Notifikasi"
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

      {/* Chat Icon dengan Badge Unread */}
      {isLoggedIn && (
        <Link
          href="/chat"
          aria-label="Chat"
          className="relative p-2 hover:bg-slate-700 rounded-full transition-all"
        >
          <IoChatbubbleEllipses className="text-2xl" />
          {unreadChatCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#3C467B] dark:border-slate-900">
              {unreadChatCount > 9 ? "9+" : unreadChatCount}
            </span>
          )}
        </Link>
      )}

      <Link href="/keranjang" aria-label="Keranjang Belanja">
        <SlBasket className="text-2xl" />
      </Link>

      {isLoggedIn && <Link href="/sell">Sell</Link>}

      <div className="flex gap-6 text-sm items-center">
        {isLoggedIn ? (
          <>
            <Link href={`/order/${userId}`}>Kelola pesanan</Link>
            <Link href={`/profile/${userId}`}>
              <p>{capitalizeFirst(user.name)}</p>
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
