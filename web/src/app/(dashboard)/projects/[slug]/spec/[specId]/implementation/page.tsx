import { fetchProjectBySlug } from "@/actions/projects";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { GlassCard } from "@tetrastack/react-glass-components";
import Link from "next/link";
import { ImplementationOverview } from "@/components/specs/implementation/ImplementationOverview";

interface ImplementationPageProps {
  params: Promise<{
    slug: string;
    specId: string;
  }>;
}

export async function generateMetadata({
  params,
}: ImplementationPageProps): Promise<Metadata> {
  const { slug, specId } = await params;
  const project = await fetchProjectBySlug(slug);

  return {
    title: project
      ? `Implementation - ${specId} - ${project.fullName}`
      : "Implementation - Catalyst",
  };
}

export default async function ImplementationPage({
  params,
}: ImplementationPageProps) {
  const { slug, specId } = await params;
  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Implementation: {specId}
          </h1>
          <p className="text-on-surface-variant mt-1">
            Track progress and manage pull requests for this specification.
          </p>
        </div>
        <Link
          href={`/projects/${slug}/spec/${specId}`}
          className="text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          &larr; Back to Spec
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Progress and Dependencies */}
        <div className="lg:col-span-2 space-y-6">
          <ImplementationOverview specId={specId} />
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-on-surface mb-4">PR Dependency Graph</h3>
            <div className="aspect-video bg-surface-variant/10 rounded-lg flex items-center justify-center border border-outline/20">
              <p className="text-on-surface-variant italic">Visualization Coming Soon</p>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Review Priority and Q&A */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-on-surface mb-4">Review Priority</h3>
            <div className="space-y-2">
              <p className="text-sm text-on-surface-variant italic">No pending reviews.</p>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-on-surface mb-4">Spec Q&A</h3>
            <div className="space-y-4">
              <p className="text-sm text-on-surface-variant">Ask a clarification question about this spec.</p>
              <button className="w-full py-2 bg-surface-variant/30 text-on-surface border border-outline/30 rounded-lg hover:bg-surface-variant/50 transition-colors text-sm font-medium">
                Ask Question
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
