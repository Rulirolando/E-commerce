import type { Metadata } from "next";
import Keranjang from "./keranjangClient";
export const metadata: Metadata = {
  title: "Keranjang",
  description: "Keranjang - Belanja Online Terlengkap dan Terpercaya",
};

export default function KeranjangPage() {
  return <Keranjang />;
}
