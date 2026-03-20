"use client";
import { useState, useEffect } from "react";
import Navbar from "../components/navbar";
import { useSession } from "next-auth/react";
import {
  FaRegEnvelope,
  FaRegEnvelopeOpen,
  FaCheckDouble,
} from "react-icons/fa";
import useNotificationStore from "../../store/useNotificationStore";

export default function NotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();
  const currentUser = session;
  const { decreaseCount } = useNotificationStore();

  /* =====================
      Fetch Notifikasi
  ====================== */
  useEffect(() => {
    if (!currentUser?.user.id) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/notifications?userId=${currentUser.user.id}`,
        );
        const data = await res.json();
        setNotifications(data || []);
      } catch (error) {
        console.error("Gagal mengambil notifikasi:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [currentUser]);

  /* =====================
      Tandai Semua Dibaca
  ====================== */
  const markAllAsRead = async () => {
    if (!currentUser?.user.id) return;

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.user.id }),
      });

      if (response.ok) {
        setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
        decreaseCount();
      }
    } catch (error) {
      console.error("Gagal update notifikasi:", error);
    }
  };

  /* =====================
      Render Loading State
  ====================== */
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
        <Navbar currentUser={currentUser} />
        <div className="p-6">
          <h1 className="text-2xl font-bold dark:text-white">🔔 Notifikasi</h1>
          <p className="dark:text-gray-400">Memuat data...</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <Navbar currentUser={currentUser} />
      <div className="min-h-screen p-6 dark:bg-slate-950 transition-colors duration-300">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">
              🔔 Notifikasi Saya
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Kamu punya {unreadCount} pesan belum dibaca
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 text-sm bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all font-semibold shadow-md"
            >
              <FaCheckDouble /> Tandai Semua Dibaca
            </button>
          )}
        </div>

        {/* List Section */}
        <div className="max-w-4xl">
          {!notifications || notifications.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-xl dark:border-slate-800">
              <p className="dark:text-gray-400">Belum ada notifikasi masuk</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-4 border p-4 rounded-xl items-start transition-all duration-300 ${
                    !n.isRead
                      ? "bg-white border-blue-200 shadow-sm dark:bg-slate-900 dark:border-blue-900 dark:text-white"
                      : "bg-gray-50 border-gray-100 opacity-70 dark:bg-slate-900/40 dark:border-slate-800 dark:text-gray-400"
                  }`}
                >
                  {/* Icon Status */}
                  <div
                    className={`mt-1 p-2 rounded-lg ${!n.isRead ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50" : "bg-gray-200 text-gray-400 dark:bg-slate-800"}`}
                  >
                    {!n.isRead ? (
                      <FaRegEnvelope size={20} />
                    ) : (
                      <FaRegEnvelopeOpen size={20} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3
                        className={`font-bold ${!n.isRead ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}
                      >
                        {n.title}
                      </h3>
                      <span className="text-[10px] text-gray-400">
                        {new Date(n.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <p className="text-sm mt-1 leading-relaxed">{n.message}</p>

                    {!n.isRead && (
                      <span className="inline-block px-2 py-0.5 mt-2 text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white rounded">
                        Baru
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
