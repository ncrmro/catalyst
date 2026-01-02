import { notFound } from "next/navigation";
import { db, projects } from "@/db";
import { eq } from "drizzle-orm";
import { ProjectConfigForm } from "./project-config-form";

interface ConfigurePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ConfigurePage({ params }: ConfigurePageProps) {
  const { slug } = await params;

  const [project] = await db
    .select({
      id: projects.id,
      projectConfig: projects.projectConfig,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);

  if (!project) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <ProjectConfigForm
        projectId={project.id}
        initialConfig={project.projectConfig}
      />
    </div>
  );
}
