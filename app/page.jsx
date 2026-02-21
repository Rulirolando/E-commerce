"use server";
import { auth } from "./auth";
import Homeclient from "./components/homeClient";
export default async function Home() {
  const currentUser = await auth();
  return <Homeclient currentUser={currentUser} />;
}
