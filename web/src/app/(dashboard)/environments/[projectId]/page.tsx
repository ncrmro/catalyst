
// Split into separate client and server components to fix the "use client" + metadata issue

import { fetchProjectById } from '@/actions/projects';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { EnvironmentsForm } from './client';

interface EnvironmentsPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export async function generateMetadata({ params }: EnvironmentsPageProps): Promise<Metadata> {
  const { projectId } = await params;
  const project = await fetchProjectById(projectId);
  
  return {
    title: project ? `${project.fullName} - Environments - Catalyst` : 'Project Environments - Catalyst',
    description: project ? `Configure environments for ${project.fullName}` : 'Configure project environments in Catalyst.',
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

  return <EnvironmentsForm project={project} />;
}