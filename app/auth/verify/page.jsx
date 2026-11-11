"use client";

import { useState, useTransition, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  verifyOtpAction,
  resendOtpAction,
  verifyLoginOtpAction,
  resendLoginOtpAction,
} from "../../action/register";

const OTP_DURATION = 120;
const RESEND_COOLDOWN = 30; // Detik sebelum tombol kirim ulang bisa diklik kembali

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const purpose = searchParams.get("purpose") || "register";

  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [remainingTime, setRemainingTime] = useState(OTP_DURATION);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [isPending, startTransition] = useTransition();

  // Timer utama untuk masa berlaku OTP
  useEffect(() => {
    if (remainingTime <= 0 || success) return;

    const timer = setTimeout(() => {
      setRemainingTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [remainingTime, success]);

  // Timer cooldown untuk tombol kirim ulang OTP
  useEffect(() => {
    if (resendCooldown <= 0 || success) return;

    const cooldownTimer = setTimeout(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(cooldownTimer);
  }, [resendCooldown, success]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  function handleVerify(e) {
    e.preventDefault();
    setMessage("");

    if (!email) {
      setMessage("Email tidak ditemukan. Silakan ulangi proses sebelumnya.");
      return;
    }

    if (remainingTime <= 0) {
      setMessage("Waktu OTP habis. Silakan kirim ulang OTP.");
      return;
    }

    if (!/^\d{6}$/.test(code.trim())) {
      setMessage("Masukkan OTP yang terdiri dari 6 angka.");
      return;
    }

    const password =
      purpose === "login" ? sessionStorage.getItem("temp_pass") : null;

    if (purpose === "login" && !password) {
      setMessage("Sesi login berakhir. Silakan login kembali.");
      return;
    }

    startTransition(async () => {
      try {
        const result =
          purpose === "login"
            ? await verifyLoginOtpAction(email, code.trim())
            : await verifyOtpAction(email, code.trim());

        if (result?.blocked || result?.expired) {
          setMessage(result.error);
          setRemainingTime(0);
          return;
        }

        if (result?.error) {
          setMessage(result.error);
          return;
        }

        if (!result?.success) {
          setMessage("Verifikasi gagal. Silakan coba lagi.");
          return;
        }

        if (purpose === "login") {
          const loginResult = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (loginResult?.error || !loginResult?.ok) {
            sessionStorage.removeItem("temp_pass");
            setMessage("OTP benar, tetapi login gagal. Silakan login kembali.");
            return;
          }

          sessionStorage.removeItem("temp_pass");
          setSuccess(true);
          setMessage("Login berhasil! Mengalihkan ke halaman utama...");
          router.replace("/");
          router.refresh();
          return;
        }

        setSuccess(true);
        setMessage(
          "Registrasi dan verifikasi berhasil! Silakan login dengan akun kamu.",
        );
        router.replace("/auth/login?verified=1");
      } catch (error) {
        console.error("Verify OTP error:", error);
        setMessage("Terjadi kesalahan. Silakan coba lagi.");
      }
    });
  }

  function handleResend() {
    if (resendCooldown > 0) return;
    setMessage("");

    if (!email) {
      setMessage("Email tidak ditemukan. Silakan ulangi proses sebelumnya.");
      return;
    }

    startTransition(async () => {
      try {
        const result =
          purpose === "login"
            ? await resendLoginOtpAction(email)
            : await resendOtpAction(email);

        if (result?.error) {
          setMessage(result.error);
          return;
        }

        setCode("");
        setRemainingTime(OTP_DURATION);
        setResendCooldown(RESEND_COOLDOWN);
        setMessage("OTP baru berhasil dikirim. Gunakan kode terbaru.");
      } catch (error) {
        console.error("Resend OTP error:", error);
        setMessage("Gagal mengirim ulang OTP. Silakan coba lagi.");
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-50 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-white p-6 shadow-lg">
        <h1 className="text-center text-3xl font-bold text-blue-500">
          Rulshop
        </h1>

        <div className="text-center">
          {purpose === "login" && (
            <button
              type="button"
              onClick={() => router.replace("/auth/login")}
              className="text-sm font-semibold text-blue-600 underline"
            >
              Kembali ke halaman login
            </button>
          )}
        </div>

        <p className="text-center text-sm text-gray-600">
          Masukkan kode 6 angka yang dikirim ke email:
        </p>

        <p className="break-all text-center text-sm font-semibold text-blue-600">
          {email || "Email tidak ditemukan"}
        </p>

        <div className="rounded-lg bg-blue-50 p-4 text-center">
          <p className="mb-1 text-sm text-gray-600">
            {remainingTime > 0 ? "OTP berlaku selama" : "Waktu OTP telah habis"}
          </p>

          <p
            className={`text-3xl font-bold tabular-nums ${
              remainingTime <= 20 ? "text-red-600" : "text-blue-600"
            }`}
          >
            {formatTime(remainingTime)}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {remainingTime > 0
              ? "Masukkan kode sebelum waktu habis."
              : "Kirim ulang untuk mendapatkan kode baru."}
          </p>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col gap-3">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="Masukkan 6 angka OTP"
            required
            disabled={isPending || success || remainingTime <= 0}
            className="w-full rounded-md border-2 border-blue-400 p-3 text-center tracking-[0.4em] outline-none focus:border-blue-600 disabled:bg-gray-100"
          />

          <button
            type="submit"
            disabled={isPending || success || !email || remainingTime <= 0}
            className="rounded-md bg-blue-500 p-3 font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isPending ? "Memproses..." : "Verifikasi OTP"}
          </button>
        </form>

        {message && (
          <p
            role="status"
            className={`wrap-break-words rounded-md p-3 text-center text-sm ${
              success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}
          >
            {message}
          </p>
        )}

        {/* Tombol Kirim Ulang OTP Tunggal dengan Cooldown */}
        <div className="text-center mt-1">
          <button
            type="button"
            onClick={handleResend}
            disabled={isPending || success || !email || resendCooldown > 0}
            className="text-sm font-semibold text-blue-600 underline disabled:cursor-not-allowed disabled:text-gray-400"
          >
            {resendCooldown > 0
              ? `Kirim ulang OTP dalam ${resendCooldown} detik`
              : "Kirim ulang OTP"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center">Memuat halaman verifikasi...</div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
