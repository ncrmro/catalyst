import { Suspense } from "react";
import { PreviewEnvironmentsList } from "./components/PreviewEnvironmentsList";
import { PreviewEnvironmentsLoading } from "./components/PreviewEnvironmentsLoading";
import { PreviewEnvironmentsHeader } from "./components/PreviewEnvironmentsHeader";

/**
 * Preview Environments page - shows user's active preview environments
 * Uses suspense for fast loading
 */
export default function PreviewEnvironmentsPage() {
  return (
    <div className="space-y-6">
      <PreviewEnvironmentsHeader />

      <Suspense fallback={<PreviewEnvironmentsLoading />}>
        <PreviewEnvironmentsList />
      </Suspense>
    </div>
  );
}
