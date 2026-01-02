// Split into separate client and server components to fix the "use client" + metadata issue

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { configureProjectEnvironments } from "@/actions/environments";
import { fetchProjectBySlug } from "@/actions/projects";
import { EnvironmentsForm } from "./client";

interface EnvironmentsPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export async function generateMetadata({
	params,
}: EnvironmentsPageProps): Promise<Metadata> {
	const { slug } = await params;
	const project = await fetchProjectBySlug(slug);

	return {
		title: project
			? `${project.fullName} - Environments - Catalyst`
			: "Project Environments - Catalyst",
		description: project
			? `Configure environments for ${project.fullName}`
			: "Configure project environments in Catalyst.",
	};
}

export default async function EnvironmentsPage({
	params,
}: EnvironmentsPageProps) {
	const { slug } = await params;

	let project;
	try {
		project = await fetchProjectBySlug(slug);
	} catch (err) {
		console.error("Error fetching project:", err);
		notFound();
	}

	if (!project) {
		notFound();
	}

	return (
		<EnvironmentsForm
			project={project}
			onSubmit={configureProjectEnvironments}
		/>
	);
}
