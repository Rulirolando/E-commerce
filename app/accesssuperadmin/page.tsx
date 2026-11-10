import { auth } from "@/app/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AccessSuperAdminPage() {
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
    <main className="min-h-screen w-full bg-blue-100 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {/* Header */}
      <header className="border-b border-blue-200 bg-white/90 px-5 py-5 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-blue-600 dark:text-blue-400">
              RULSHOP
            </p>

            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              Dashboard Super Admin
            </h1>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Pusat pengelolaan sistem dan pengguna.
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Login sebagai
            </p>

            <p className="font-semibold text-blue-700 dark:text-blue-400">
              {session.user.name ?? "Super Admin"}
            </p>

            <span className="mt-1 inline-block rounded-full bg-blue-200 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              SUPER ADMIN
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        {/* Welcome */}
        <section className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-500 to-blue-700 p-6 text-white shadow-lg md:p-10">
          <div className="relative z-10 max-w-2xl">
            <p className="font-medium text-blue-100">Selamat datang kembali!</p>

            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Kelola Rulshop dengan Mudah
            </h2>

            <p className="mt-4 leading-relaxed text-blue-50">
              Pantau akses pengguna, kelola hak administrator, dan buka
              dashboard sesuai kebutuhan melalui satu tempat.
            </p>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full border-30px border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-white/10"
          />
        </section>

        {/* Ringkasan */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl dark:bg-blue-950">
              🛡️
            </div>

            <h3 className="mt-5 text-lg font-bold">Hak Super Admin</h3>

            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Mengelola role pengguna dan mengakses dashboard Admin tanpa perlu
              mengganti role akun.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl dark:bg-blue-950">
              👥
            </div>

            <h3 className="mt-5 text-lg font-bold">Pengelolaan Pengguna</h3>

            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Mengangkat pengguna biasa menjadi Admin atau menurunkan Admin
              menjadi pengguna biasa.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:col-span-2 lg:col-span-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl dark:bg-blue-950">
              ⚙️
            </div>

            <h3 className="mt-5 text-lg font-bold">Kontrol Sistem</h3>

            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Gunakan menu pengelolaan yang tersedia untuk menjalankan tugas
              administrasi.
            </p>
          </div>
        </section>

        {/* Menu Dashboard */}
        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Menu Dashboard</h2>

            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Pilih menu yang ingin kamu buka.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Dashboard Admin */}
            <Link
              href="/accessadmin"
              className="group rounded-2xl border border-blue-200 bg-white p-6 shadow-md transition duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-2xl dark:bg-blue-950">
                  📊
                </div>

                <span className="text-2xl text-blue-500 transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </div>

              <h3 className="mt-5 text-xl font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Dashboard Admin
              </h3>

              <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400">
                Buka halaman Admin untuk melihat fitur dan pengelolaan yang
                tersedia bagi administrator.
              </p>

              <span className="mt-5 inline-flex rounded-lg bg-blue-500 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-blue-600">
                Buka Dashboard Admin
              </span>
            </Link>

            {/* Kelola Pengguna */}
            <Link
              href="/accesssuperadmin/users"
              className="group rounded-2xl border border-blue-200 bg-white p-6 shadow-md transition duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-2xl dark:bg-blue-950">
                  👤
                </div>

                <span className="text-2xl text-blue-500 transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </div>

              <h3 className="mt-5 text-xl font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Kelola Admin dan Pengguna
              </h3>

              <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400">
                Lihat daftar pengguna, berikan akses Admin, atau kembalikan role
                Admin menjadi USER.
              </p>

              <span className="mt-5 inline-flex rounded-lg bg-blue-500 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-blue-600">
                Kelola Pengguna
              </span>
            </Link>
          </div>
        </section>

        {/* Informasi Role */}
        <section className="mt-8 rounded-2xl border border-blue-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold">Informasi Hak Akses</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="font-semibold">USER</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Pengguna biasa.
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-950/50">
              <p className="font-semibold text-blue-700 dark:text-blue-300">
                ADMIN
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Mengakses fitur administrasi.
              </p>
            </div>

            <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/50">
              <p className="font-semibold text-indigo-700 dark:text-indigo-300">
                SUPER ADMIN
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Mengelola role pengguna dan membuka dashboard Admin.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-blue-200 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Rulshop Dashboard · Super Admin
        </footer>
      </div>
    </main>
  );
}
