import { PreviewEnvironmentsList } from "./components/PreviewEnvironmentsList";
import { PreviewEnvironmentsSection } from "./components/PreviewEnvironmentsSection";

/**
 * Preview Environments page - shows user's active preview environments
 * Uses suspense for fast loading
 */
export default function PreviewEnvironmentsPage() {
  return (
    <div className="space-y-6">
      <PreviewEnvironmentsSection>
        <PreviewEnvironmentsList />
      </PreviewEnvironmentsSection>
    </div>
  );
}
