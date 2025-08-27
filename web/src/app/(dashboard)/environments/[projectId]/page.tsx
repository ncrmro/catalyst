'use server';

import { configureProjectEnvironments } from '@/actions/environments';
import { fetchProjectById } from '@/actions/projects';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface EnvironmentsPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export async function generateMetadata({ params }: EnvironmentsPageProps): Promise<Metadata> {
  const { projectId } = await params;
  const project = await fetchProjectById(projectId);
  
  return {
    title: project ? `${project.full_name} - Environments - Catalyst` : 'Project Environments - Catalyst',
    description: project ? `Configure environments for ${project.full_name}` : 'Configure project environments in Catalyst.',
  };
}

export default async function EnvironmentsPage({ params }: EnvironmentsPageProps) {
  const { projectId } = await params;
  
  let project;
  try {
    project = await fetchProjectById(projectId);
  } catch (err) {
    console.error('Error fetching project:', err);
    notFound();
  }

  if (!project) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-primary hover:opacity-80 mb-4"
        >
          ← Back to {project.name}
        </Link>
        <h1 className="text-3xl font-bold text-on-background mb-4">Configure Environments</h1>
        <p className="text-lg text-on-surface-variant mb-6">
          Set up deployment environments for <span className="font-semibold">{project.full_name}</span>. 
          We recommend starting with a preview environment which will create pull requests for your changes.
        </p>
      </div>

      {/* Environment Configuration Form */}
      <div className="bg-surface border border-outline rounded-lg p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-on-surface mb-6">Choose Your First Environment</h2>
        
        <form action={configureProjectEnvironments}>
          <input type="hidden" name="projectId" value={projectId} />
          
          <div className="space-y-4 mb-8">
            {/* Preview Environment */}
            <label className="flex items-start gap-4 p-6 border-2 border-primary rounded-lg cursor-pointer bg-primary-container/20 hover:bg-primary-container/30 transition-colors">
              <input
                type="radio"
                name="environmentType"
                value="preview"
                defaultChecked
                className="mt-2 w-4 h-4 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="font-semibold text-on-surface text-lg mb-2">Preview Environment</div>
                <div className="text-on-surface-variant text-sm mb-3">
                  Perfect for getting started! When you create a pull request, we&apos;ll automatically create a preview 
                  environment for testing your changes. The preview environment is cleaned up after the PR is merged or closed.
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-success-container text-on-success-container px-2 py-1 rounded-full">
                    ✓ Recommended First Step
                  </span>
                  <span className="bg-primary-container text-on-primary-container px-2 py-1 rounded-full">
                    🔄 Auto PR Creation
                  </span>
                  <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full">
                    🚀 Auto Deploy on Merge
                  </span>
                </div>
              </div>
            </label>

            {/* Production Environment */}
            <label className="flex items-start gap-4 p-6 border border-outline rounded-lg cursor-pointer hover:bg-secondary-container/20 transition-colors">
              <input
                type="radio"
                name="environmentType"
                value="production"
                className="mt-2 w-4 h-4 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="font-semibold text-on-surface text-lg mb-2">Production Environment</div>
                <div className="text-on-surface-variant text-sm mb-3">
                  Your live, customer-facing environment. Deployments are triggered manually or through 
                  automated releases when code is merged to your main branch. This environment should 
                  be configured after you have tested your deployment process with preview environments.
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-warning-container text-on-warning-container px-2 py-1 rounded-full">
                    ⚠️ Set up later
                  </span>
                  <span className="bg-error-container text-on-error-container px-2 py-1 rounded-full">
                    🔒 Manual Deploy
                  </span>
                  <span className="bg-tertiary-container text-on-tertiary-container px-2 py-1 rounded-full">
                    📈 Live Traffic
                  </span>
                </div>
              </div>
            </label>

            {/* Staging Environment */}
            <label className="flex items-start gap-4 p-6 border border-outline rounded-lg cursor-pointer hover:bg-tertiary-container/20 transition-colors">
              <input
                type="radio"
                name="environmentType"
                value="staging"
                className="mt-2 w-4 h-4 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="font-semibold text-on-surface text-lg mb-2">Staging Environment</div>
                <div className="text-on-surface-variant text-sm mb-3">
                  A production-like environment for final testing before release. Ideal for QA testing, 
                  performance validation, and stakeholder reviews. Typically mirrors your production 
                  setup but with test data and may have different scaling configurations.
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full">
                    🧪 QA Testing
                  </span>
                  <span className="bg-tertiary-container text-on-tertiary-container px-2 py-1 rounded-full">
                    📊 Performance Testing
                  </span>
                  <span className="bg-warning-container text-on-warning-container px-2 py-1 rounded-full">
                    👥 Stakeholder Review
                  </span>
                </div>
              </div>
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-6 border-t border-outline">
            <Link
              href={`/projects/${projectId}`}
              className="px-4 py-2 text-sm font-medium text-on-surface bg-surface border border-outline rounded-md hover:bg-secondary-container hover:text-on-secondary-container transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Cancel
            </Link>
            
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium text-on-primary bg-primary border border-transparent rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Configure Environment
            </button>
          </div>
        </form>
      </div>

      {/* Additional Information */}
      <div className="mt-8 bg-secondary-container/10 border border-secondary rounded-lg p-6">
        <h3 className="font-semibold text-on-surface mb-3">💡 Getting Started Tip</h3>
        <p className="text-on-surface-variant text-sm">
          We strongly recommend starting with the <strong>Preview Environment</strong>. This will help you 
          understand the deployment process and ensure your application works correctly before setting up 
          production environments. You can always add more environments later from your project settings.
        </p>
      </div>
    </div>
  );
}