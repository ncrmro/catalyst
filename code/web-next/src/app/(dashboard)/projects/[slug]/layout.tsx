import { fetchProjectBySlug } from "@/actions/projects";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectNav } from "./project-nav";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { slug } = await params;

  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header Card with Breadcrumb */}
      <PageHeader
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: project.name },
        ]}
      >
        <ProjectNav slug={slug} />
      </PageHeader>

      {/* Page Content */}
      {children}
    </div>
  );
}
