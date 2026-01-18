import { getEnvironmentCR } from "@/lib/k8s-operator";
import { KubeResourceNotFound } from "@/components/kube/resource-not-found";
import { getEnvironmentByName } from "@/models/environments";
import { listPodsInNamespace, type PodInfo } from "@/lib/k8s-pods";
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

  // Fetch the environment CR from Kubernetes
  // Assuming CRs are in "default" namespace based on current implementation context
  const environment = await getEnvironmentCR("default", envSlug);

  if (!environment) {
    return (
      <KubeResourceNotFound resourceType="Environment" resourceName={envSlug} />
    );
  }

  // Fetch environment config from database
  const dbEnvironment = await getEnvironmentByName(slug, envSlug);

  // Calculate target namespace matching operator logic
  // operator/internal/controller/environment_controller.go:104
  // targetNamespace := fmt.Sprintf("%s-%s", env.Spec.ProjectRef.Name, env.Name)
  const targetNamespace = `${environment.spec.projectRef.name}-${environment.metadata.name}`;

  // Helper to generate workspace pod name matching the operator logic
  // operator/internal/controller/build.go: workspacePodName
  const commitPart =
    environment.spec.sources?.[0]?.commitSha.substring(0, 7) || "unknown";
  const podName = `workspace-${environment.spec.projectRef.name}-${commitPart.toLowerCase()}`;

  // Fetch pods from the target namespace
  let pods: PodInfo[] = [];
  try {
    pods = await listPodsInNamespace(targetNamespace);
  } catch (error) {
    console.error(
      `Failed to fetch pods for namespace ${targetNamespace}:`,
      error,
    );
    // Continue with empty pods array - UI will show empty state
  }

  return (
    <EnvironmentDetailView
      environment={environment}
      targetNamespace={targetNamespace}
      podName={podName}
      environmentId={dbEnvironment?.id}
      environmentConfig={dbEnvironment?.config}
      pods={pods}
    />
  );
}
