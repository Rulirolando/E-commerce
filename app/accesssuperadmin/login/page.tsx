"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devInfo, setDevInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Langkah 1: Validasi Email & Password lalu minta OTP
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/super-admin/auth-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_otp", email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Gagal memproses kredensial.");
        setLoading(false);
        return;
      }

      setDevInfo(data.devOtp || "");
      setStep("otp");
    } catch {
      setError("Terjadi kesalahan pada sistem.");
    } finally {
      setLoading(false);
    }
  }

  // Langkah 2: Kirim Email, Password, dan OTP ke NextAuth Credentials
  async function handleVerifyAndLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        otp,
        redirect: false,
      });

      if (res?.error) {
        setError("Kode OTP salah, kedaluwarsa, atau kredensial tidak valid.");
        setLoading(false);
        return;
      }

      router.push("/accesssuperadmin");
    } catch {
      setError("Terjadi kesalahan saat login.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 mb-2">
            SUPER ADMIN
          </span>
          <h1 className="text-2xl font-bold text-slate-800">
            {step === "credentials"
              ? "Login Super Admin"
              : "Verifikasi Kode OTP"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === "credentials"
              ? "Masukkan akun Super Admin Anda"
              : `Masukkan kode 6 digit untuk ${email}`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        {step === "otp" && devInfo && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-xl text-center">
            💡 <strong>[Mode Demo]</strong> OTP Anda:{" "}
            <span className="font-mono font-bold text-sm tracking-wider">
              {devInfo}
            </span>
          </div>
        )}

        {step === "credentials" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Email Super Admin
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@rulshop.tech"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {loading ? "Memproses..." : "Lanjutkan & Kirim OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Kode OTP (6 Digit)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full text-center font-mono text-xl tracking-widest rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {loading ? "Memverifikasi..." : "Verifikasi & Masuk"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setOtp("");
                setError("");
              }}
              className="w-full text-center text-xs text-slate-500 hover:underline mt-2"
            >
              ← Kembali / Ganti Akun
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
