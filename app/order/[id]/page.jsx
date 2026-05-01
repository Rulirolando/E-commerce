"use server";
import { auth } from "../../auth";
import OrderPage from "./OrderDetailClient";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  return {
    title: `Kelola pesanan saya `,
    description: `Kelola pesanan ${id}`,
  };
}

export default async function Profile({ params }) {
  const session = await auth();
  const resolvedParams = await params;
  const userId = resolvedParams.id;
  const currentUser = session;
  console.log("currentUser:", currentUser);
  if (currentUser?.user?.id !== userId) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold">Profil tidak ditemukan</h1>
      </div>
    );
  }
  return <OrderPage currentUser={currentUser} />;
}
