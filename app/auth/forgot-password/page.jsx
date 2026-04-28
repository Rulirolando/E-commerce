"use client";
import { useState, useEffect } from "react";
import {
  sendResetOtp,
  resetPasswordAction,
  resendOtpAction,
} from "../../action/forgot-password";
import { useRouter } from "next/navigation";

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Pass
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [timer, setTimer] = useState(100);

  useEffect(() => {
    const interval = setInterval(
      () => setTimer((p) => (p > 0 ? p - 1 : 0)),
      1000,
    );
    return () => clearInterval(interval);
  }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await sendResetOtp(email);
    if (res.success) setStep(2);
    else alert(res.error);
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await resetPasswordAction(email, otp, newPassword);
    if (res.success) {
      alert("Password berhasil diubah! Silakan login.");
      router.push("/auth/login");
    } else alert(res.error);
    setLoading(false);
  };

  const handleResend = async () => {
    setLoading(true);
    const result = await resendOtpAction(email);
    if (result.success) {
      alert("Kode baru telah dikirim!");
      setTimer(300);
      setOtp("");
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="w-full h-screen flex justify-center items-center bg-blue-50 px-4">
      <div className="w-full max-w-sm rounded-xl shadow-lg p-8 bg-white text-center">
        <h2 className="text-2xl font-bold text-blue-500 mb-6">Lupa Password</h2>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">Masukkan email akun Anda</p>
            <input
              type="email"
              placeholder="Email"
              required
              className="p-3 border-2 border-blue-100 rounded-lg outline-none focus:border-blue-400"
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              disabled={loading}
              className="bg-blue-500 text-white p-3 rounded-lg font-bold"
            >
              {loading ? "Mengirim..." : "Kirim Kode OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              Masukkan kode dari email dan password baru
            </p>
            <input
              type="text"
              placeholder="Kode OTP (6 Digit)"
              required
              className="p-3 border-2 border-blue-100 rounded-lg outline-none focus:border-blue-400"
              onChange={(e) => setOtp(e.target.value)}
            />

            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Password Baru"
                onChange={(e) => setNewPassword(e.target.value)}
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

            {timer > 0 ? (
              <p className="text-xs text-gray-400">
                Berlaku hingga:{" "}
                <span className="font-mono font-bold">
                  {Math.floor(timer / 60)}:
                  {(timer % 60).toString().padStart(2, "0")}
                </span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={loading}
                className="text-sm text-blue-600 font-bold hover:underline disabled:text-gray-300"
              >
                {loading ? "Mengirim ulang..." : "Kirim ulang kode OTP"}
              </button>
            )}

            <button
              disabled={loading}
              className="bg-green-500 text-white p-3 rounded-lg font-bold"
            >
              {loading ? "Memproses..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
