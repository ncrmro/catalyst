import { Suspense } from "react";
import { PreviewEnvironmentsContent } from "./PreviewEnvironmentsContent";
import { PreviewEnvironmentsLoading } from "./PreviewEnvironmentsLoading";

/**
 * Server component wrapper that handles suspense for preview environments
 */
export function PreviewEnvironmentsList() {
	return (
		<Suspense fallback={<PreviewEnvironmentsLoading />}>
			<PreviewEnvironmentsContent />
		</Suspense>
	);
}
