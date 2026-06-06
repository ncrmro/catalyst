import { getUserPrimaryTeamId } from "@/lib/team-auth";
import { ConnectionWizard } from "./_components/ConnectionWizard";
import { redirect } from "next/navigation";

export default async function ConnectCloudAccountPage() {
  const teamId = await getUserPrimaryTeamId();

  if (!teamId) {
    redirect("/platform/cloud-accounts");
  }

  return <ConnectionWizard teamId={teamId} />;
}
