import { getUserPrimaryTeamId } from "@/lib/team-auth";
import { ConnectionWizard } from "./_components/ConnectionWizard";
import { redirect } from "next/navigation";
import crypto from "crypto";

/**
 * Generate a stable, team-scoped External ID for the AWS sts:AssumeRole call.
 * Using a deterministic HMAC-SHA256 derived value means the same team always
 * gets the same External ID — important for idempotent re-onboarding — while
 * remaining unpredictable to third parties (confused-deputy protection).
 *
 * Requires NEXTAUTH_SECRET to be set. Without it the HMAC provides no security.
 */
function generateExternalId(teamId: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required to generate a secure External ID for AWS AssumeRole");
  }
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`external-id:${teamId}`);
  return `catalyst-${hmac.digest("hex").slice(0, 16)}`;
}

export default async function ConnectCloudAccountPage() {
  const teamId = await getUserPrimaryTeamId();

  if (!teamId) {
    redirect("/platform/cloud-accounts");
  }

  const externalId = generateExternalId(teamId);

  return <ConnectionWizard teamId={teamId} externalId={externalId} />;
}
