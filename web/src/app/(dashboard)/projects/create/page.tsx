import type { Metadata } from "next";
import { CreateProjectPageClient } from "./client";

export const metadata: Metadata = {
	title: "Create Project - Catalyst",
	description: "Create a new project to manage deployments and environments.",
};

export default function CreateProjectPage() {
	return <CreateProjectPageClient />;
}
