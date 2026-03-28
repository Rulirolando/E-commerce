"use client";

import Navbar from "../components/navbar";
import { useSession } from "next-auth/react";
import {
  FaRegEnvelope,
  FaRegEnvelopeOpen,
  FaCheckDouble,
} from "react-icons/fa";
import useNotificationStore from "../../store/useNotificationStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function NotificationPage() {
  const { data: session, status } = useSession();
  const currentUser = session;
  const { decreaseCount } = useNotificationStore();
  const queryClient = useQueryClient();

  const orderMutation = useMutation({
    mutationFn: async (orderId) => {
      const res = await fetch("/api/order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: "Selesai" }),
      });
      if (!res.ok) throw new Error("Gagal update status");
      return res.json();
    },
    onSuccess: () => {
      alert("Pesanan selesai! Terima kasih telah berbelanja.");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleSelesaikanPesanan = async (orderId) => {
    const confirm = window.confirm("Apakah Anda yakin barang sudah diterima?");
    if (!confirm) return;

    orderMutation.mutate(orderId);
  };

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", currentUser?.user?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/notifications?userId=${currentUser.user.id}`,
      );
      if (!res.ok) throw new Error("Gagal mengambil notifikasi");
      return res.json();
    },
    enabled: !!currentUser?.user?.id,
  });

  const readAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.user.id }),
      });
      if (!res.ok) throw new Error("Gagal update notifikasi");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      decreaseCount();
    },
  });

  if (status === "loading" || isLoading) {
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
              onClick={() => readAllMutation.mutate()}
              disabled={readAllMutation.isPending}
              className="flex items-center gap-2 text-sm bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all font-semibold shadow-md"
            >
              <FaCheckDouble />
              {readAllMutation.isPending
                ? "Memproses..."
                : "Tandai Semua Dibaca"}
            </button>
          )}
        </div>

        <div className="max-w-4xl">
          {!notifications || notifications.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-xl dark:border-slate-800">
              <p className="dark:text-gray-400">Belum ada notifikasi masuk</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => {
                // LOGIKA SINKRONISASI: Cek apakah ada notifikasi lain dengan orderId sama yang sudah "Selesai"
                const isOrderSelesai = notifications.some(
                  (notif) =>
                    notif.orderId === n.orderId &&
                    notif.orderId !== null &&
                    notif.title.toLowerCase().includes("selesai"),
                );

                // Tampilkan tombol jika judul mengandung kata kunci pengiriman/tiba/selesai
                const showActionButton =
                  (n.title.toLowerCase().includes("dikirim") ||
                    n.title.toLowerCase().includes("tiba") ||
                    n.title.toLowerCase().includes("selesai")) &&
                  n.orderId;

                return (
                  <div
                    key={n.id}
                    className={`flex gap-4 border p-4 rounded-xl items-start transition-all duration-300 ${
                      !n.isRead
                        ? "bg-white border-blue-200 shadow-sm dark:bg-slate-900 dark:border-blue-900 dark:text-white"
                        : "bg-gray-50 border-gray-100 opacity-70 dark:bg-slate-900/40 dark:border-slate-800 dark:text-gray-400"
                    }`}
                  >
                    <div
                      className={`mt-1 p-2 rounded-lg ${!n.isRead ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50" : "bg-gray-200 text-gray-400 dark:bg-slate-800"}`}
                    >
                      {!n.isRead ? (
                        <FaRegEnvelope size={20} />
                      ) : (
                        <FaRegEnvelopeOpen size={20} />
                      )}
                    </div>

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
                      <p className="text-sm mt-1 leading-relaxed">
                        {n.message}
                      </p>

                      {showActionButton && (
                        <div
                          className={`mt-3 p-3 rounded-lg border transition-colors ${
                            isOrderSelesai
                              ? "bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30"
                              : "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800"
                          }`}
                        >
                          <p
                            className={`text-xs mb-2 font-medium italic ${isOrderSelesai ? "text-green-700 dark:text-green-400" : "text-blue-800 dark:text-blue-300"}`}
                          >
                            {isOrderSelesai
                              ? "✅ Pesanan ini telah dinyatakan selesai:"
                              : "Klik tombol di bawah jika paket sudah sampai:"}
                          </p>
                          <button
                            type="button"
                            disabled={isOrderSelesai}
                            onClick={() => handleSelesaikanPesanan(n.orderId)}
                            className={`text-xs px-4 py-2 rounded-lg transition-all font-bold shadow-sm ${
                              isOrderSelesai
                                ? "bg-green-500 text-white cursor-default opacity-90"
                                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer"
                            }`}
                          >
                            {isOrderSelesai
                              ? "✅ Pesanan Selesai"
                              : "Barang Sudah Saya Terima"}
                          </button>
                        </div>
                      )}

                      {!n.isRead && (
                        <span className="inline-block px-2 py-0.5 mt-2 text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white rounded">
                          Baru
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
