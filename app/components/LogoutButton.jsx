"use server";
import { RiLogoutBoxRLine } from "react-icons/ri";
import { auth, signOut } from "../auth";
export default async function LogoutButton({
  activeMenu,
  setActiveMenu,
  currentUser,
}) {
  const session = await auth();
  const currentUser = session?.user;

  const handleLogout = async () => {
    setActiveMenu("keluar");
    const confirmLogout = confirm("Apakah Anda yakin ingin keluar?");
    if (!confirmLogout) return;
    localStorage.removeItem("loginSessionDB");
    await signOut({ callbackUrl: "/" });
  };

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center mt-2 cursor-pointer p-2 rounded-lg w-[90%] transition-colors ${
        activeMenu === "keluar"
          ? "bg-blue-300 text-amber-950 border-gray-100"
          : "hover:bg-gray-100"
      } ${currentUser ? "" : "hidden"}`}
    >
      <RiLogoutBoxRLine size={30} className="text-amber-950" />
      <p className="ml-4 font-bold text-amber-950">Keluar</p>
    </button>
  );
}
