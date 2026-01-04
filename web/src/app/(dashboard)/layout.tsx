import { checkGitHubAppInstallation } from "@/actions/account";
import { _auth } from "@/auth";
import { GitHubAppBanner } from "@/components/github-app-banner";
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

  // Check GitHub App installation status
  const installationStatus = await checkGitHubAppInstallation();
  const showBanner =
    installationStatus.connected && !installationStatus.hasAppInstalled;

  return (
    <>
      {showBanner && <GitHubAppBanner />}
      {children}
    </>
  );
}
