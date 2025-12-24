import { _auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await _auth();

  // Redirect authenticated users to projects
  if (session?.user) {
    redirect("/projects");
  }

  // Redirect unauthenticated users to login
  redirect("/login");
}
