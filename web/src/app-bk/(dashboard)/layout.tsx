import { _auth } from "@/auth";
import DashboardLayout from "@/components/dashboard-layout";
import { redirect } from "next/navigation";

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await _auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardLayout user={session.user}>
      {children}
    </DashboardLayout>
  );
}
