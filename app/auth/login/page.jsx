"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    sessionStorage.setItem("temp_pass", password);

    try {
      // 1. Minta OTP ke server
      const res = await fetch("/api/auth/send-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Email atau password salah");
        sessionStorage.removeItem("temp_pass");
      } else {
        // 2. Jika OTP terkirim, redirect ke halaman verifikasi OTP
        router.push(
          `/auth/verify?email=${encodeURIComponent(email)}&purpose=login`,
        );
      }
    } catch {
      setError("Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="w-full h-screen flex justify-center items-center bg-blue-50">
      <div className="w-80 rounded-lg shadow-lg flex flex-col p-6 bg-white">
        <div className="flex justify-center">
          <p className="text-blue-400 text-3xl font-bold">Rulshop</p>
        </div>

        <p className="text-blue-400 text-xl font-bold mt-4">Masuk</p>

        {error && (
          <div className="bg-red-50 text-red-500 text-xs p-3 rounded-lg my-2 border border-red-100 text-center font-medium">
            ⚠️ {error}
          </div>
        )}

        <form
          onSubmit={handleCredentialsLogin}
          className="flex flex-col gap-3 mt-4"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="p-2 border-2 border-blue-400 rounded-md text-sm"
          />

          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Password"
              className="p-2 border-2 border-blue-400 rounded-md w-full text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-2 text-xs text-blue-500"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="flex justify-end">
            <Link
              href="/auth/forgot-password"
              className="text-[11px] text-blue-500 hover:underline font-medium"
            >
              Lupa Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="p-2 bg-blue-400 text-white rounded-md hover:bg-blue-500 disabled:bg-gray-300 font-semibold"
          >
            {loading ? "Mengirim OTP..." : "Masuk"}
          </button>
        </form>

        <div className="my-4 text-center text-sm text-gray-400">atau</div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="p-2 border border-blue-400 rounded-md text-blue-500 hover:bg-blue-50 w-full text-sm font-semibold"
        >
          Masuk dengan Google
        </button>

        <p className="text-blue-400 text-sm mt-4 text-center">
          Belum punya akun?{" "}
          <a
            href="/auth/daftar"
            className="text-blue-500 font-semibold underline"
          >
            Daftar
          </a>
        </p>
      </div>
    </div>
  );
}
