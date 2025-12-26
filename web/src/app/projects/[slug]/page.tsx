import { fetchProjectBySlug } from "@/actions/projects";
import { listDirectory, VCSEntry } from "@/actions/version-control-provider";
import { listEnvironmentCRs } from "@/lib/k8s-operator";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ProjectPageContent } from "./project-page-content";

interface SpecDirectory {
  name: string;
  path: string;
  files: VCSEntry[];
}

interface ProjectPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchProjectBySlug(slug);

  return {
    title: project ? `${project.fullName} - Catalyst` : "Project - Catalyst",
    description: project?.description || "Project overview and environments.",
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;

  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  // Get environments from K8s
  const sanitizedProjectName = project.name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

  const k8sEnvironments = await listEnvironmentCRs("default");
  const environments = k8sEnvironments.filter(
    (env) => env.spec.projectRef.name === sanitizedProjectName,
  );

  const deploymentEnvironments = environments.filter(
    (env) => env.spec.type === "deployment",
  );
  const developmentEnvironments = environments.filter(
    (env) => env.spec.type === "development",
  );

  // Get specs from the repository's specs/ directory
  let specs: SpecDirectory[] = [];
  const repo = project.repositories[0]?.repo;

  console.log("[ProjectPage] Project:", project.fullName);
  console.log("[ProjectPage] Repo:", repo?.fullName ?? "NO REPO");

  if (repo) {
    const specsResult = await listDirectory(repo.fullName, "specs");
    console.log("[ProjectPage] Specs result:", specsResult);

    if (specsResult.success && specsResult.entries.length > 0) {
      // Each subdirectory in specs/ is a spec
      const specDirs = specsResult.entries.filter((e) => e.type === "dir");

      // Fetch files for each spec directory
      specs = await Promise.all(
        specDirs.map(async (dir) => {
          const filesResult = await listDirectory(repo.fullName, dir.path);
          return {
            name: dir.name,
            path: dir.path,
            files: filesResult.success ? filesResult.entries : [],
          };
        }),
      );
    }
  }

  return (
    <ProjectPageContent
      project={{
        slug: project.slug,
        name: project.name,
        fullName: project.fullName,
      }}
      deploymentEnvironments={deploymentEnvironments}
      developmentEnvironments={developmentEnvironments}
      specs={specs}
      hasRepo={!!repo}
    />
  );
}
