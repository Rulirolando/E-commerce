"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CiSearch } from "react-icons/ci";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  // Menggunakan URL query sebagai initial state
  const [query, setQuery] = useState(urlQuery);

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      router.push("/products");
    } else {
      router.push(`/products?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-1/2 flex justify-center items-center rounded-full hover:bg-[#636CCB] bg-[#50589C] transition-colors duration-200"
    >
      <input
        // Menambahkan 'key' memaksa input mereset/menyinkronkan nilainya saat URL parameter 'q' berubah
        key={urlQuery}
        type="text"
        placeholder="Cari produk..."
        defaultValue={urlQuery}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full outline-none bg-transparent px-4 py-2 placeholder:text-blue-100 text-white"
      />
      <button
        type="submit"
        aria-label="Cari"
        className="p-2 text-2xl rounded-full bg-blue-800 hover:bg-blue-700 transition-colors"
      >
        <CiSearch />
      </button>
    </form>
  );
}
