import { KubeResourceNotFound } from "@/components/kube/resource-not-found";
import { getEnvironmentCR } from "@/lib/k8s-operator";
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
	const { envSlug } = await params;

	// Fetch the environment CR from Kubernetes
	// Assuming CRs are in "default" namespace based on current implementation context
	const environment = await getEnvironmentCR("default", envSlug);

	if (!environment) {
		return (
			<KubeResourceNotFound resourceType="Environment" resourceName={envSlug} />
		);
	}

	// Calculate target namespace and pod name as per operator logic
	const targetNamespace = `env-${environment.metadata.name}`;

	// Helper to generate workspace pod name matching the operator logic
	// operator/internal/controller/build.go: workspacePodName
	const commitPart = environment.spec.source.commitSha.substring(0, 7);
	const podName = `workspace-${environment.spec.projectRef.name}-${commitPart.toLowerCase()}`;

	return (
		<EnvironmentDetailView
			environment={environment}
			targetNamespace={targetNamespace}
			podName={podName}
		/>
	);
}
