import { Metadata } from "next";
import { CreatePullRequestPageClient } from "./client";

export const metadata: Metadata = {
  title: "Create Pull Request - Catalyst",
  description: "Create a new pull request in a repository.",
};

export default function CreatePullRequestPage() {
  return <CreatePullRequestPageClient />;
}
