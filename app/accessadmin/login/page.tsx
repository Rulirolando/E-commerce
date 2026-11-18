"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function AdminLoginPage() {
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Tahap 1: Validasi Email & Kode Akses, lalu Kirim OTP ke Gmail
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_otp",
          email,
          adminCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Gagal memproses kredensial.");
        setLoading(false);
        return;
      }

      setStep("otp");
    } catch {
      setError("Terjadi kesalahan pada sistem.");
    } finally {
      setLoading(false);
    }
  }

  // Tahap 2: Verifikasi OTP lalu buat sesi NextAuth
  async function handleVerifyAndLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const verifyRes = await fetch("/api/admin/auth-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_otp", email, otp }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyData.message || "Kode OTP salah.");
        setLoading(false);
        return;
      }

      const res = await signIn("credentials", {
        email,
        password: "ADMIN_BYPASS_PASS", // Mengirim password dummy otomatis
        otp,
        redirect: false,
      });

      if (res?.error) {
        setError("Gagal membuat sesi login admin.");
        setLoading(false);
        return;
      }

      window.location.href = "/accessadmin";
    } catch {
      setError("Terjadi kesalahan saat verifikasi OTP.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 border border-slate-200">
        <div className="text-center mb-6">
          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 mb-2">
            ADMINISTRATOR
          </span>
          <h1 className="text-2xl font-bold text-slate-800">
            {step === "credentials"
              ? "Login Admin Rulshop"
              : "Verifikasi Kode OTP"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === "credentials"
              ? "Masukkan email dan kode akses dari Super Admin"
              : `Masukkan 6 digit kode OTP yang dikirim ke ${email}`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        {step === "credentials" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Email Admin
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rulshop.tech"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Kode Akses (Dari Super Admin)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Contoh: 482910"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-mono tracking-widest outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {loading ? "Memproses..." : "Kirim OTP ke Gmail"}
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
                className="w-full text-center font-mono text-xl tracking-widest rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer transition-colors"
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
