"use client"; // Wajib untuk Client Side

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  // Handler untuk Login Credentials (Email/Password)
  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    if (!email || !password) {
      alert("Email dan password harus diisi");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/", // Tujuan setelah login sukses
        redirect: false,
      });

      if (result?.error) {
        alert("Login gagal! Periksa kembali email dan password Anda.");
      } else {
        // Login berhasil, redirect ke halaman utama
        window.location.href = "/";
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk Google Login
  const handleGoogleLogin = async () => {
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="w-full h-screen flex justify-center items-center bg-blue-50">
      <div className="w-64 h-3/4 rounded-lg shadow-lg flex flex-col p-4 bg-white">
        <div className="flex justify-center">
          <p className="text-blue-400 text-3xl font-bold">Rulshop</p>
        </div>

        <p className="text-blue-400 text-xl font-bold mt-4">Masuk</p>

        <form
          onSubmit={handleCredentialsLogin}
          className="flex flex-col gap-3 mt-4"
        >
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="p-2 border-2 border-blue-400 rounded-md"
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            className="p-2 border-2 border-blue-400 rounded-md"
          />

          <button
            type="submit"
            disabled={loading}
            className="p-2 bg-blue-400 text-white rounded-md hover:bg-blue-500 disabled:bg-gray-300"
          >
            {loading ? "Proses..." : "Masuk"}
          </button>
        </form>

        <div className="my-4 text-center text-sm text-gray-400">atau</div>

        {/* GOOGLE LOGIN */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="p-2 border border-blue-400 rounded-md text-blue-500 hover:bg-blue-50 w-full"
        >
          Masuk dengan Google
        </button>

        <p className="text-blue-400 text-sm mt-4">
          Belum punya akun?{" "}
          <a href="/auth/daftar" className="text-blue-500">
            Daftar
          </a>
        </p>
      </div>
    </div>
  );
}
