"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CiSearch } from "react-icons/ci";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      router.push("/products");
    } else {
      router.push(`/products?q=${encodeURIComponent(q)}`);
    }
    setQuery("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-1/2 flex justify-center items-center rounded-full hover:bg-[#636CCB] bg-[#50589C]"
    >
      <input
        type="text"
        placeholder="Cari produk..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full outline-none bg-transparent px-4 py-2 placeholder:text-blue-100 text-white"
      />
      <button
        type="submit"
        className="p-2 text-2xl rounded-full bg-blue-800 hover:bg-blue-700"
      >
        <CiSearch />
      </button>
    </form>
  );
}
