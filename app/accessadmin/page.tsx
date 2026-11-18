import { auth } from "@/app/auth";
import { redirect } from "next/navigation";
import AccessAdminClient from "./AccessAdminClient";
export default async function AccessAdminPage() {
  const session = await auth();
  const isVerified = Boolean(
    (session?.user as { isOtpVerified?: boolean } | undefined)?.isOtpVerified,
  );
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Jika bukan ADMIN (misal USER biasa), lempar ke beranda
  if (session.user.role !== "ADMIN" || !isVerified) {
    redirect("/");
  }

  // 3. Jika lolos (role benar-benar ADMIN), tampilkan halaman dashboard admin
  return <AccessAdminClient />;
}
