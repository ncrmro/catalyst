import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard-layout";
import DashboardContent from "@/components/dashboard-content";
import { getDevAuthUser } from "@/lib/dev-auth";

export const metadata: Metadata = {
  title: "Catalyst - Dashboard",
  description: "Your Catalyst development platform dashboard with project insights and latest reports.",
};

export default async function Home() {
  const session = await auth();
  const devUser = await getDevAuthUser();
  
  const user = session?.user || devUser;
  
  // If user is not authenticated, redirect to login
  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardLayout user={user}>
      <DashboardContent />
    </DashboardLayout>
  );
}
