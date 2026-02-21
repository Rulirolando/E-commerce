"use client";
import Link from "next/link";
import { SlBasket } from "react-icons/sl";
import SearchBar from "../components/SearchBar";
import { useRouter } from "next/navigation";
export default function Navbar({ className = "", currentUser }) {
  const router = useRouter();
  function capitalizeFirst(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  return (
    <div
      className={`w-full h-20 bg-[#3C467B] flex justify-between items-center px-10 text-white ${className}`}
    >
      <h1
        className="text-4xl font-semibold cursor-pointer"
        onClick={() => router.push("/")}
      >
        Rulshop
      </h1>

      {/* Search bar */}
      <SearchBar />

      <Link href="/keranjang">
        <SlBasket />
      </Link>

      {currentUser && <Link href="/sell">Sell</Link>}

      <div className="flex gap-6 text-sm">
        {currentUser ? (
          <>
            <Link href={`/order/${currentUser.user.id}`}>Kelola pesanan</Link>
            <Link href={`/profile/${currentUser.user.id}`}>
              {" "}
              <p>{capitalizeFirst(currentUser.user.name)}</p>
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="text-blue-200 hover:text-blue-300"
            >
              Login
            </Link>
            <Link
              href="/auth/daftar"
              className="text-blue-200 hover:text-blue-300"
            >
              Daftar
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
