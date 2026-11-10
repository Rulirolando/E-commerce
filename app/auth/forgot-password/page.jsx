"use client";

import { useState, useEffect } from "react";
import {
  sendResetOtp,
  resetPasswordAction,
  resendOtpAction,
} from "../../action/forgot-password";
import { useRouter } from "next/navigation";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  const router = useRouter();

  // Timer dihitung berdasarkan waktu kedaluwarsa dari server.
  useEffect(() => {
    if (!expiresAt) {
      setRemainingTime(0);
      return;
    }

    const updateTimer = () => {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );

      setRemainingTime(seconds);
    };

    updateTimer();

    const interval = setInterval(updateTimer, 250);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const showError = (text) => {
    setMessage(text);
    setMessageType("error");
  };

  const showSuccess = (text) => {
    setMessage(text);
    setMessageType("success");
  };

  // Kirim OTP pertama kali
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await sendResetOtp(normalizedEmail);

      if (result?.error) {
        showError(result.error);
        return;
      }

      setEmail(normalizedEmail);
      setExpiresAt(result.expiresAt);
      setOtp("");
      setStep(2);
      showSuccess("OTP berhasil dikirim. Silakan periksa email kamu.");
    } catch (error) {
      console.error(error);
      showError("Terjadi kesalahan saat mengirim OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Verifikasi OTP dan ubah password
  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");

    if (remainingTime <= 0) {
      showError("OTP sudah kedaluwarsa. Silakan kirim ulang OTP.");
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      showError("OTP harus terdiri dari 6 angka.");
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      showError(
        "Password minimal 8 karakter dan harus mengandung huruf kecil, huruf besar, angka, serta simbol.",
      );
      return;
    }

    setLoading(true);

    try {
      const result = await resetPasswordAction(email, otp.trim(), newPassword);

      if (result?.error) {
        if (result.blocked || result.expired) {
          setExpiresAt(new Date().toISOString());
          setOtp("");
        }

        showError(result.error);
        return;
      }

      if (result?.success) {
        setExpiresAt(null);
        showSuccess(
          "Password berhasil diubah! Mengalihkan ke halaman login...",
        );

        setTimeout(() => {
          router.push("/auth/login");
        }, 1200);
      }
    } catch (error) {
      console.error(error);
      showError("Terjadi kesalahan saat mengubah password.");
    } finally {
      setLoading(false);
    }
  };

  // Kirim ulang OTP setelah waktu habis
  const handleResend = async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = await resendOtpAction(email);

      if (result?.error) {
        showError(result.error);
        return;
      }

      setOtp("");
      setNewPassword("");
      setExpiresAt(result.expiresAt);
      showSuccess("OTP baru berhasil dikirim. Gunakan kode terbaru.");
    } catch (error) {
      console.error(error);
      showError("Terjadi kesalahan saat mengirim ulang OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-lg">
        <h2 className="mb-6 text-2xl font-bold text-blue-500">Lupa Password</h2>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              Masukkan email yang terdaftar di akun Rulshop.
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              required
              disabled={loading}
              className="rounded-lg border-2 border-blue-100 p-3 outline-none focus:border-blue-400"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-500 p-3 font-bold text-white disabled:bg-gray-300"
            >
              {loading ? "Mengirim..." : "Kirim Kode OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              Masukkan kode OTP dan password baru untuk akun:
            </p>

            <p className="break-all rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-600">
              {email}
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="Kode OTP (6 digit)"
              required
              disabled={loading || remainingTime <= 0}
              className="rounded-lg border-2 border-blue-100 p-3 outline-none focus:border-blue-400 disabled:bg-gray-100"
            />

            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-gray-500">
                {remainingTime > 0
                  ? "OTP berlaku selama:"
                  : "Waktu OTP telah habis"}
              </p>

              <p
                className={`mt-1 font-mono text-2xl font-bold ${
                  remainingTime <= 20 ? "text-red-600" : "text-blue-600"
                }`}
              >
                {formatTime(remainingTime)}
              </p>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Password Baru"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={loading || remainingTime <= 0}
                className="w-full rounded-md border-2 border-blue-400 p-3 pr-16 text-sm disabled:bg-gray-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-xs text-blue-500"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {/* Ketentuan password baru */}
            <div className="text-left text-[11px] text-gray-500 -mt-2 space-y-1">
              <p className="font-semibold">
                Password harus memenuhi ketentuan:
              </p>

              <ul className="list-disc pl-5 space-y-1">
                <li>Minimal 8 karakter</li>
                <li>Mengandung minimal 1 huruf kecil (a-z)</li>
                <li>Mengandung minimal 1 huruf besar (A-Z)</li>
                <li>Mengandung minimal 1 angka (0-9)</li>
                <li>Mengandung minimal 1 simbol (@, #, $, !, dan lainnya)</li>
              </ul>
            </div>

            {remainingTime > 0 ? (
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-green-500 p-3 font-bold text-white disabled:bg-gray-300"
              >
                {loading ? "Memproses..." : "Update Password"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="rounded-lg bg-blue-500 p-3 font-bold text-white disabled:bg-gray-300"
              >
                {loading ? "Mengirim ulang..." : "Kirim Ulang OTP"}
              </button>
            )}
          </form>
        )}

        {message && (
          <p
            role="status"
            className={`mt-4 wrap-break-words rounded-lg p-3 text-sm ${
              messageType === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
