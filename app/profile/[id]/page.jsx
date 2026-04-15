import { auth } from "../../auth";
import ProfilePage from "./profileClientPage";
export default async function Profile({ params }) {
  const session = await auth();
  const resolvedParams = await params;
  console.log("resolvedParams:", resolvedParams);
  const userId = resolvedParams.id;
  console.log("userId:", userId);
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
  return <ProfilePage userId={userId} currentUser={currentUser} />;
}
