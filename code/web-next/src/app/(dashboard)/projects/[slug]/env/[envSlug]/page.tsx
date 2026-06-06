import { getEnvironmentDetail } from "@/actions/environments";
import { KubeResourceNotFound } from "@/components/kube/resource-not-found";
import EnvironmentDetailView from "./environment-detail";

interface EnvironmentPageProps {
  params: Promise<{
    slug: string;
    envSlug: string;
  }>;
}

export default async function EnvironmentPage({
  params,
}: EnvironmentPageProps) {
  const { slug, envSlug } = await params;

  const detail = await getEnvironmentDetail(slug, envSlug);

  if (!detail) {
    return (
      <KubeResourceNotFound resourceType="Environment" resourceName={envSlug} />
    );
  }

  return (
    <EnvironmentDetailView
      environment={detail.environment}
      targetNamespace={detail.targetNamespace}
      podName={detail.podName}
      environmentId={detail.environmentId}
      environmentConfig={detail.environmentConfig}
      pods={detail.pods}
      teamId={detail.teamId}
      projectId={detail.projectId}
      environmentType={detail.environmentType}
    />
  );
}
