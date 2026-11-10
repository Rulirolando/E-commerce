import type { Metadata } from "next";
import { Suspense } from "react";
import Keranjang from "./keranjangClient";

export const metadata: Metadata = {
  title: "Keranjang",
  description: "Keranjang - Belanja Online Terlengkap dan Terpercaya",
};

export default function KeranjangPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-6 bg-white dark:bg-slate-950 dark:text-white">
          Memuat keranjang...
        </div>
      }
    >
      <Keranjang />
    </Suspense>
  );
}
