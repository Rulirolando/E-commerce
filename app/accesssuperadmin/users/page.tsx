import { auth } from "@/app/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import UserRoleManager from "./UserRoleManager";

export default async function ManageUsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    if (session.user.role === "ADMIN") {
      redirect("/accessadmin");
    }

    redirect("/");
  }

  return (
    <main className="min-h-screen bg-blue-100 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <header className="border-b border-blue-200 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-blue-600 dark:text-blue-400">
              RULSHOP
            </p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              Kelola Admin dan Pengguna
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Atur hak akses pengguna di sistem Rulshop.
            </p>
          </div>

          <Link
            href="/accesssuperadmin"
            className="rounded-lg border border-blue-300 px-4 py-2 font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-800"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <section className="rounded-2xl bg-linear-to-r from-blue-500 to-blue-700 p-6 text-white shadow-lg md:p-8">
          <p className="text-sm font-medium text-blue-100">
            Pusat Pengelolaan Pengguna
          </p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">
            Kelola Hak Akses
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-50 md:text-base">
            Lihat daftar pengguna, promosikan USER menjadi ADMIN, atau turunkan
            ADMIN menjadi USER. Perubahan role akan disimpan ke database.
          </p>
        </section>

        <section className="mt-7 rounded-2xl border border-blue-200 bg-white p-4 shadow-md dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <UserRoleManager />
        </section>

        <footer className="mt-8 border-t border-blue-200 py-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Rulshop Dashboard · Pengelolaan Pengguna
        </footer>
      </div>
    </main>
  );
}
