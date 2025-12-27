import { fetchProjectBySlug } from "@/actions/projects";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ProjectPageContent } from "./project-page-content";

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

  return (
    <ProjectPageContent
      project={{
        slug: project.slug,
        name: project.name,
        fullName: project.fullName,
      }}
    />
  );
}
