import { notFound } from "next/navigation";
import { db, projects, projectEnvironments } from "@/db";
import { eq, and } from "drizzle-orm";
import { ProjectConfigForm } from "./project-config-form";

interface ConfigurePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ConfigurePage({ params }: ConfigurePageProps) {
  const { slug } = await params;

  // Get project with its primary repository
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

  // Get the development environment config for this project
  // Development environment serves as the template for PR preview environments
  const [developmentEnv] = await db
    .select({
      id: projectEnvironments.id,
      config: projectEnvironments.config,
      repoId: projectEnvironments.repoId,
    })
    .from(projectEnvironments)
    .where(
      and(
        eq(projectEnvironments.projectId, project.id),
        eq(projectEnvironments.environment, "development"),
      ),
    )
    .limit(1);

  return (
    <div className="container mx-auto py-8">
      <ProjectConfigForm
        projectId={project.id}
        initialConfig={project.projectConfig}
        developmentEnvironment={
          developmentEnv
            ? {
                id: developmentEnv.id,
                config: developmentEnv.config,
              }
            : undefined
        }
      />
    </div>
  );
}
