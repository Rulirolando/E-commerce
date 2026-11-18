"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SellerOtpLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // State untuk Countdown Timer (120 detik = 2 menit)
  const [timeLeft, setTimeLeft] = useState(120);

  useEffect(() => {
    let timer;
    if (step === "otp" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Format detik ke MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  async function handleRequestOtp(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/seller/auth-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_otp", email }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Gagal memvalidasi data toko.");

      setStep("otp");
      setTimeLeft(120); // Reset timer ke 2 menit saat OTP baru dikirim
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/seller/auth-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_otp", email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "OTP salah.");

      const loginRes = await signIn("credentials", {
        email,
        password: "SELLER_OTP_BYPASS",
        otp,
        redirect: false,
      });

      if (loginRes?.error) {
        throw new Error("Gagal membuat sesi login.");
      }

      router.push("/seller/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-800">
        <div className="text-center mb-6">
          <span className="inline-block rounded-full bg-indigo-950 px-3 py-1 text-xs font-bold text-indigo-300 mb-2">
            SELLER CENTER RULSHOP
          </span>
          <h1 className="text-2xl font-bold text-white">
            {step === "email" ? "Daftar / Masuk Toko" : "Verifikasi OTP Gmail"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {step === "email"
              ? "Masukkan nama toko dan email untuk validasi awal"
              : `Kode verifikasi dikirim ke ${email}`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Gmail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toko@gmail.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 text-sm font-semibold text-white shadow-md transition cursor-pointer"
            >
              {loading
                ? "Memvalidasi & Mengirim OTP..."
                : "Validasi & Kirim OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Kode OTP (6 Digit)
                </label>
                {/* Tampilan Timer di UI */}
                <span
                  className={`text-xs font-bold ${timeLeft > 0 ? "text-indigo-400" : "text-red-400"}`}
                >
                  {timeLeft > 0
                    ? `Waktu: ${formatTime(timeLeft)}`
                    : "OTP Kedaluwarsa"}
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                disabled={timeLeft === 0}
                className="w-full text-center font-mono text-xl tracking-widest rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading || timeLeft === 0}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 text-sm font-semibold text-white shadow-md transition cursor-pointer disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              {loading ? "Memverifikasi..." : "Verifikasi & Masuk Dashboard"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp("");
              }}
              className="w-full text-center text-xs text-slate-400 hover:underline mt-2"
            >
              ← Ganti Email / Kirim Ulang OTP
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
