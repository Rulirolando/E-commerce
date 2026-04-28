"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyOtpAction, resendOtpAction } from "../../action/register";

function VerifyContent() {
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);
  const [resending, setResending] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";
  const [timer, setTimer] = useState(100);

  useEffect(() => {
    const interval = setInterval(
      () => setTimer((p) => (p > 0 ? p - 1 : 0)),
      1000,
    );
    return () => clearInterval(interval);
  }, []);

  const handleChange = (val, i) => {
    if (isNaN(val)) return;
    const newOtp = [...otp];
    newOtp[i] = val.substring(val.length - 1);
    setOtp(newOtp);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (e, i) => {
    // Fitur Backspace: pindah ke input sebelumnya jika kosong
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const data = e.clipboardData.getData("text").slice(0, 6);

    // Pastikan hanya angka
    if (!/^\d+$/.test(data)) return;

    const newOtp = [...otp];
    const dataArray = data.split("");

    dataArray.forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });

    setOtp(newOtp);

    const lastIndex = Math.min(dataArray.length, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleVerify = async () => {
    setLoading(true);
    const result = await verifyOtpAction(email, otp.join(""));
    if (result.success) {
      alert("Berhasil! Silakan login.");
      router.push("/auth/login");
    } else {
      alert(result.error);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    const result = await resendOtpAction(email);
    if (result.success) {
      alert("Kode baru telah dikirim!");
      setTimer(300); // Reset timer
      setOtp(new Array(6).fill("")); // Kosongkan input
      inputRefs.current[0]?.focus();
    } else {
      alert(result.error);
    }
    setResending(false);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-blue-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl text-center">
        <h2 className="text-2xl font-bold text-blue-500 mb-2">Rulshop</h2>
        <p className="text-sm text-gray-500 mb-4">
          Kode dikirim ke <b>{email}</b>
        </p>
        <div className="flex justify-between gap-2 mb-4">
          {otp.map((d, i) => (
            <input
              key={i}
              type="text"
              maxLength={1}
              value={d}
              ref={(el) => (inputRefs.current[i] = el)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onPaste={handlePaste}
              onChange={(e) => handleChange(e.target.value, i)}
              className="h-12 w-full border-2 border-blue-200 text-center font-bold text-xl rounded-lg focus:border-blue-500 outline-none"
            />
          ))}
        </div>
        <div className="mb-6">
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
              disabled={resending}
              className="text-sm text-blue-600 font-bold hover:underline disabled:text-gray-300"
            >
              {resending ? "Mengirim ulang..." : "Kirim ulang kode OTP"}
            </button>
          )}
        </div>
        <button
          onClick={handleVerify}
          disabled={otp.includes("") || loading}
          className="w-full bg-blue-500 py-3 text-white rounded-xl font-bold disabled:bg-gray-300"
        >
          {loading ? "Memverifikasi..." : "Konfirmasi Kode"}
        </button>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
