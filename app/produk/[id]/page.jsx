"use server";

import ProdukDetail from "./ProdukDetailClient";

export default async function ProdukIdPage({ params }) {
  const { id } = await params;
  if (!id) return;

  return <ProdukDetail id={id} />;
}
