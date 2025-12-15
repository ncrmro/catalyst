import { Metadata } from "next";
import { _auth } from "@/auth";
import PeriodicReportGenerator from "@/components/periodic-report-generator";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard - Catalyst",
  description: "Your Catalyst development platform dashboard with latest project insights.",
};

export default async function Home() {
  const session = await _auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-on-background mb-2">
          Welcome back, {session.user.name || session.user.email?.split('@')[0]}!
        </h1>
        <p className="text-sm md:text-base text-on-surface-variant">
          Here&apos;s your latest project overview and insights.
        </p>
      </div>

      {/* Latest Report Section */}
      <PeriodicReportGenerator />
    </div>
  );
}
