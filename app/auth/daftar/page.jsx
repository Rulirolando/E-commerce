"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerUser, googleSignIn } from "../../action/register";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="p-2 bg-blue-400 text-white rounded-md hover:bg-blue-500 disabled:bg-gray-300"
    >
      {pending ? "Memproses..." : "Daftar"}
    </button>
  );
}

export default function Daftar() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [state, formAction] = useActionState(registerUser, null);

  return (
    <div className="w-full h-screen flex justify-center items-center bg-blue-50">
      <div className="w-72 rounded-lg shadow-lg flex flex-col p-4 bg-white">
        <div className="flex justify-center">
          <p className="text-blue-400 text-3xl font-bold">Rulshop</p>
        </div>

        {/* GOOGLE REGISTER */}
        <form action={googleSignIn}>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded w-full text-sm font-semibold"
          >
            Daftar dengan Google
          </button>
        </form>

        <p className="text-blue-400 text-xl font-bold mt-4 border-t pt-2 text-center">
          Daftar
        </p>

        {/* PESAN ERROR DARI SERVER */}
        {state?.error && (
          <p className="text-red-500 text-xs bg-red-50 p-2 rounded mt-2 border border-red-200 text-center">
            ⚠️ {state.error}
          </p>
        )}

        {/* REGISTER FORM */}
        <form action={formAction} className="flex flex-col gap-3 mt-4">
          <input
            name="username"
            type="text"
            required
            placeholder="Username"
            className="p-2 border-2 border-blue-400 rounded-md text-sm"
          />

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

          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              placeholder="Konfirmasi Password"
              className="p-2 border-2 border-blue-400 rounded-md w-full text-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 top-2 text-xs text-blue-500"
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>

          <SubmitButton />
        </form>

        <p className="text-blue-400 text-sm mt-4 text-center">
          Sudah punya akun?{" "}
          <a
            href="/auth/login"
            className="text-blue-500 font-semibold underline"
          >
            Masuk
          </a>
        </p>
      </div>
    </div>
  );
}
