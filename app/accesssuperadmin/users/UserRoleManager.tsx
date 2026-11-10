"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  username: string | null;
  email: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
};

export default function UserRoleManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Mengambil daftar pengguna dari API yang sudah digunakan sebelumnya.
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/super-admin", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengambil data pengguna.");
      }

      // Mendukung respons berupa array langsung maupun { users: [...] }.
      const userList = Array.isArray(data)
        ? data
        : Array.isArray(data.users)
          ? data.users
          : null;

      if (!userList) {
        throw new Error("Format data pengguna dari API tidak sesuai.");
      }

      setUsers(userList);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil data pengguna.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  // Pencarian berdasarkan nama pengguna, email, atau role.
  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return users;

    return users.filter((user) => {
      const username = user.username ?? "";

      return (
        username.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.role.toLowerCase().includes(keyword)
      );
    });
  }, [users, search]);

  // Mengubah role melalui endpoint API yang sama.
  async function changeRole(user: User) {
    if (user.role === "SUPER_ADMIN") {
      setError("Role SUPER_ADMIN tidak dapat diubah dari halaman ini.");
      return;
    }

    const nextRole: "USER" | "ADMIN" = user.role === "ADMIN" ? "USER" : "ADMIN";

    const confirmed = window.confirm(
      `Apakah kamu yakin ingin mengubah role ${user.email} menjadi ${nextRole}?`,
    );

    if (!confirmed) return;

    setBusyId(user.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/super-admin", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          role: nextRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengubah role pengguna.");
      }

      setMessage(
        data.message || `Role pengguna berhasil diubah menjadi ${nextRole}.`,
      );

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengubah role.",
      );
    } finally {
      setBusyId(null);
    }
  }

  // Menghapus akun USER atau ADMIN
  async function deleteUser(user: User) {
    if (user.role === "SUPER_ADMIN") {
      setError("Akun SUPER_ADMIN tidak boleh dihapus.");
      return;
    }

    const confirmed = window.confirm(
      `PERINGATAN!\n\nApakah kamu yakin ingin menghapus akun ini?\n\nNama: ${
        user.username || "Tanpa nama"
      }\nEmail: ${user.email}\nRole: ${user.role}\n\nTindakan ini tidak dapat dibatalkan.`,
    );

    if (!confirmed) return;

    setBusyId(user.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/super-admin", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal menghapus akun.");
      }

      setMessage(data.message || "Akun berhasil dihapus.");

      // Hapus dari tampilan tanpa menunggu refresh seluruh halaman.
      setUsers((currentUsers) =>
        currentUsers.filter((item) => item.id !== user.id),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menghapus akun.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-blue-100 px-4 py-8 text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="overflow-hidden rounded-2xl bg-linear-to-r from-blue-700 via-blue-600 to-indigo-600 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium text-blue-100">
                PANEL SUPER ADMIN
              </p>

              <h1 className="text-2xl font-bold sm:text-3xl">
                Manajemen Pengguna
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-blue-100 sm:text-base">
                Lihat daftar pengguna dan kelola hak akses administrator.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadUsers()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden="true">↻</span>
              {loading ? "Memuat..." : "Muat Ulang"}
            </button>
          </div>
        </section>

        {/* Statistik */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Total Pengguna
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-700 dark:text-blue-400">
              {users.length}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Administrator
            </p>
            <p className="mt-2 text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {users.filter((user) => user.role === "ADMIN").length}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pengguna Biasa
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {users.filter((user) => user.role === "USER").length}
            </p>
          </div>
        </section>

        {/* Tabel pengguna */}
        <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Daftar Pengguna</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Kelola role USER dan ADMIN.
              </p>
            </div>

            <div className="w-full sm:max-w-sm">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, email, atau role..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Pesan berhasil */}
          {message && (
            <div
              role="status"
              className="mx-5 mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {message}
            </div>
          )}

          {/* Pesan error */}
          {error && (
            <div
              role="alert"
              className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              <p className="font-semibold">Terjadi kesalahan</p>
              <p className="mt-1">{error}</p>

              <button
                type="button"
                onClick={() => void loadUsers()}
                className="mt-2 font-semibold underline"
              >
                Coba lagi
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-5 py-4 font-semibold">Pengguna</th>
                  <th className="px-5 py-4 font-semibold">Email</th>
                  <th className="px-5 py-4 font-semibold">Role</th>
                  <th className="px-5 py-4 text-center font-semibold">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                        <span>Memuat data pengguna...</span>
                      </div>
                    </td>
                  </tr>
                ) : error && users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      Data belum dapat ditampilkan.
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      {search
                        ? "Tidak ada pengguna yang cocok dengan pencarian."
                        : "Belum ada data pengguna."}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="transition hover:bg-blue-50/70 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linears-to-br from-blue-600 to-indigo-600 font-bold text-white">
                            {(user.username || user.email || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-100">
                              {user.username || "Tanpa nama"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              ID: {user.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {user.email}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            user.role === "SUPER_ADMIN"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                              : user.role === "ADMIN"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {user.role === "SUPER_ADMIN" ? (
                          <span className="text-xs font-medium text-purple-600 dark:text-purple-300">
                            Akses utama
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => void changeRole(user)}
                              disabled={busyId !== null || loading}
                              className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                user.role === "ADMIN"
                                  ? "bg-amber-500 hover:bg-amber-600"
                                  : "bg-blue-600 hover:bg-blue-700"
                              }`}
                            >
                              {busyId === user.id
                                ? "Memproses..."
                                : user.role === "ADMIN"
                                  ? "Jadikan USER"
                                  : "Jadikan ADMIN"}
                            </button>

                            <button
                              type="button"
                              onClick={() => void deleteUser(user)}
                              disabled={busyId !== null || loading}
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busyId === user.id ? "Memproses..." : "Hapus"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Menampilkan {filteredUsers.length} dari {users.length} pengguna
            </span>
            <span>Data diperbarui dari server</span>
          </div>
        </section>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Panel Manajemen Pengguna
        </p>
      </div>
    </main>
  );
}
