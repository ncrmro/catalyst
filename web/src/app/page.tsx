import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard-layout";
import DashboardContent from "@/components/dashboard-content";

export const metadata: Metadata = {
  title: "Catalyst - Dashboard",
  description: "Your Catalyst development platform dashboard with project insights and latest reports.",
};

export default async function Home() {
  const session = await auth();
  
  // If user is not authenticated, redirect to login
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardLayout user={session.user}>
      <DashboardContent />
    </DashboardLayout>
  );
}
