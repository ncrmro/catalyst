import {
  fetchProjectBySlug,
  fetchProjectDashboardData,
} from "@/actions/projects";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ProjectPageContent } from "./project-page-content";
import { ProjectPageSkeleton } from "./_components/project-page-skeleton";
import { Suspense } from "react";

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

  // Start fetching dashboard data in background (don't await)
  const dashboardPromise = fetchProjectDashboardData(project.id, slug);

  return (
    <Suspense fallback={<ProjectPageSkeleton />}>
      <ProjectPageContent
        project={{
          id: project.id,
          slug: project.slug,
          name: project.name,
          fullName: project.fullName,
        }}
        dashboardPromise={dashboardPromise}
      />
    </Suspense>
  );
}