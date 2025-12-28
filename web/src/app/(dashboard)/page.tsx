import { _auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await _auth();

  if (!session?.user) {
    redirect("/login");
  }

  redirect("/projects");
}
