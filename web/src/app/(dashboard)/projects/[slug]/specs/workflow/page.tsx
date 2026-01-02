import { fetchProjectBySlug } from "@/actions/projects";
import { analyzeRepoForSpecs } from "@/actions/spec-workflow";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { SpecWorkflowClient } from "./SpecWorkflowClient";
import type { WorkflowStep } from "@/components/specs/workflow/SpecWorkflowLayout";

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

  // Check for existing specs to determine initial step
  let initialStep: WorkflowStep = "bootstrap";
  try {
    const analysis = await analyzeRepoForSpecs(project.id);
    // If specs folder exists and has content (implied by existingSpecs logic), we skip bootstrap
    if (analysis.existingSpecs) {
      initialStep = "distill";
    }
  } catch (e) {
    console.warn("Failed to analyze repo for specs on page load:", e);
  }

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
        initialStep={initialStep}
      />
    </div>
  );
}
