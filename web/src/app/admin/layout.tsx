import { redirect } from "next/navigation";
import { signOutAction } from "@/actions/auth";
import { auth } from "@/auth";
import DashboardLayout from "@/components/dashboard-layout";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth();

	// Check if user is authenticated and is an admin
	if (!session?.user?.admin) {
		// Redirect non-admin users to the main dashboard
		redirect("/");
	}

	return (
		<DashboardLayout user={session?.user} onSignOut={signOutAction}>
			<div className="space-y-6">
				<div className="border-b border-outline pb-4">
					<h1 className="text-2xl font-bold text-on-surface">Admin Panel</h1>
					<p className="text-sm text-on-surface-variant mt-1">
						Administrative functions and system management
					</p>
				</div>
				{children}
			</div>
		</DashboardLayout>
	);
}
