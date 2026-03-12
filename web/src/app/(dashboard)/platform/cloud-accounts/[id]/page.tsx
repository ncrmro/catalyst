import { AccountDetail } from "./_components/AccountDetail";

// Mock account data — replace with real DB lookup later
const mockAccount = {
  id: "aws-123456",
  provider: "aws",
  alias: "Production",
  accountId: "123456789012",
  status: "connected" as const,
  region: "us-east-1",
  roleArn: "arn:aws:iam::123456789012:role/CatalystCrossAccountRole",
  externalId: "catalyst-a1b2c3d4-e5f6",
  resourcePrefix: "catalyst-prod",
};

export default async function CloudAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AccountDetail {...mockAccount} id={id} />;
}
