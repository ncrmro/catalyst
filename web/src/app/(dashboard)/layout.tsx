import { _auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await _auth();

  // Redirect unauthenticated users to login
  if (!session?.user) {
    redirect("/login");
  }

  return <>{children}</>;
}
