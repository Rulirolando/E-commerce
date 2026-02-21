"use server";
import { auth } from "../../auth";
import OrderPage from "./OrderDetailClient";
export default async function Profile({ params }) {
  const session = await auth();
  const resolvedParams = await params;
  const userId = resolvedParams.id;
  const currentUser = session;
  console.log("currentUser:", currentUser);
  console.log(userId);
  if (currentUser?.user?.id !== userId) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold">Profil tidak ditemukan</h1>
      </div>
    );
  }
  return <OrderPage userId={userId} currentUser={currentUser} />;
}
