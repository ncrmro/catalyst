import { PageHeader } from "@/components/ui/page-header";
import { PlatformNav } from "./_components/platform-nav";

interface PlatformLayoutProps {
  children: React.ReactNode;
}

export default function PlatformLayout({ children }: PlatformLayoutProps) {
  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: "Platform" }]}>
        <PlatformNav />
      </PageHeader>
      {children}
    </div>
  );
}
