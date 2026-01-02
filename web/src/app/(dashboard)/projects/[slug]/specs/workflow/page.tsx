import { fetchProjectBySlug } from "@/actions/projects";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { SpecWorkflowClient } from "./SpecWorkflowClient";

interface SpecWorkflowPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: SpecWorkflowPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchProjectBySlug(slug);

  return {
    title: project
      ? `Spec Workflow - ${project.fullName} - Catalyst`
      : "Spec Workflow - Catalyst",
    description: "Adopt spec-driven development for your project",
  };
}

export default async function SpecWorkflowPage({
  params,
}: SpecWorkflowPageProps) {
  const { slug } = await params;
  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const repo = project.repositories[0]?.repo;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Spec-Driven Development
          </h1>
          <p className="text-on-surface-variant mt-1">
            Bootstrap, create, and manage specifications for {project.fullName}
          </p>
        </div>
        <Link
          href={`/projects/${slug}`}
          className="text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          &larr; Back to Project
        </Link>
      </div>

      <SpecWorkflowClient 
        projectId={project.id} 
        projectSlug={project.slug}
        repoFullName={repo?.fullName} 
      />
    </div>
  );
}