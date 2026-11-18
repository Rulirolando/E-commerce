"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  username: string | null;
  email: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN" | "SELLER";
  adminCode?: string | null; // <-- Tambahkan properti ini
};

export default function UserRoleManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((user) => {
      const username = user.username ?? "";
      return (
        username.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.role.toLowerCase().includes(keyword) ||
        (user.adminCode ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [users, search]);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: nextRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengubah role pengguna.");
      }

      setMessage(data.message || `Role berhasil diubah menjadi ${nextRole}.`);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(user: User) {
    if (user.role === "SUPER_ADMIN") {
      setError("Akun SUPER_ADMIN tidak boleh dihapus.");
      return;
    }

    const confirmed = window.confirm(
      `PERINGATAN!\n\nApakah kamu yakin ingin menghapus akun ${user.email}?`,
    );

    if (!confirmed) return;

    setBusyId(user.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/super-admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Gagal menghapus akun.");

      setMessage("Akun berhasil dihapus.");
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
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
                Manajemen Pengguna & Kode Admin
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-blue-100 sm:text-base">
                Lihat daftar pengguna dan pantau kode akses admin yang aktif
                secara permanen.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadUsers()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/25 disabled:opacity-60"
            >
              <span>↻</span> {loading ? "Memuat..." : "Muat Ulang"}
            </button>
          </div>
        </section>

        {/* Tabel */}
        <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold">Daftar Pengguna & Kode Akses</h2>
            <div className="w-full sm:max-w-sm">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, atau kode admin..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          {message && (
            <div className="mx-5 mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-5 py-4 font-semibold">Pengguna</th>
                  <th className="px-5 py-4 font-semibold">Email</th>
                  <th className="px-5 py-4 font-semibold">Role</th>
                  <th className="px-5 py-4 font-semibold">Kode Akses Admin</th>
                  <th className="px-5 py-4 text-center font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Memuat data pengguna...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Tidak ada data pengguna ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="transition hover:bg-blue-50/70 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-100">
                        {user.username || "Tanpa nama"}
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
                      <td className="px-5 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {user.role === "ADMIN" ? (
                          user.adminCode || "-"
                        ) : (
                          <span className="text-slate-400 text-xs font-normal italic">
                            Tidak berlaku
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {user.role === "SUPER_ADMIN" ? (
                          <span className="text-xs font-medium text-purple-600">
                            Utama
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => void changeRole(user)}
                              disabled={busyId !== null}
                              className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${
                                user.role === "ADMIN"
                                  ? "bg-amber-500 hover:bg-amber-600"
                                  : "bg-blue-600 hover:bg-blue-700"
                              }`}
                            >
                              {user.role === "ADMIN"
                                ? "Jadikan USER"
                                : "Jadikan ADMIN"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteUser(user)}
                              disabled={busyId !== null}
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                            >
                              Hapus
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
        </section>
      </div>
    </main>
  );
}
