import { auth } from "@/auth";
import DashboardLayout from "@/components/dashboard-layout";

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <DashboardLayout user={session?.user}>
      {children}
    </DashboardLayout>
  );
}