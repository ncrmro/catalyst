import { AccountDetail } from "./_components/AccountDetail";
import { getCloudAccount } from "@/actions/cloud-accounts";
import { listManagedClusters } from "@/actions/managed-clusters";
import { getUserPrimaryTeamId } from "@/lib/team-auth";
import { notFound } from "next/navigation";

export default async function CloudAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = await getUserPrimaryTeamId();

  if (!teamId) {
    notFound();
  }

  const [accountResult, clustersResult] = await Promise.all([
    getCloudAccount(teamId, id),
    listManagedClusters(teamId, id),
  ]);

  if (!accountResult.success) {
    if (accountResult.error === "Cloud account not found") {
      notFound();
    }
    return (
      <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error">
        <h3 className="font-semibold">Error loading cloud account</h3>
        <p className="text-sm">{accountResult.error}</p>
      </div>
    );
  }

  const account = accountResult.data;
  const clusters = clustersResult.success ? clustersResult.data : [];

  return (
    <AccountDetail
      teamId={teamId}
      id={account.id}
      provider={account.provider}
      alias={account.name}
      accountId={account.externalAccountId}
      status={account.status}
      region="us-east-1" // Default for now
      roleArn={account.credentialType === "iam_role" ? "arn:aws:iam::" + account.externalAccountId + ":role/..." : "N/A"}
      externalId="N/A" // Should come from model if needed
      resourcePrefix={account.resourcePrefix || "N/A"}
      clusters={clusters}
    />
  );
}
