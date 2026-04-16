"use client";
import { useSearchParams } from "next/navigation";
import SearchProduk from "../components/Products";
import Navbar from "../components/navbar";
import Footer from "../components/Footer";
import { useSession } from "next-auth/react";
import { Suspense } from "react";

function ProductsContent() {
  const searchParams = useSearchParams();
  const cari = searchParams.get("q") || "";
  const { data: session } = useSession();
  const currentUser = session;

  return (
    <>
      <Navbar currentUser={currentUser} />
      <SearchProduk cari={cari} />
      <Footer />
    </>
  );
}

export default function Products() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
