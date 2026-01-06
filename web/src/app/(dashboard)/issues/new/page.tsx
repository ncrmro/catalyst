import { Metadata } from "next";
import { CreateIssuePageClient } from "./client";

export const metadata: Metadata = {
  title: "Create Issue - Catalyst",
  description: "Create a new issue in a repository.",
};

export default function CreateIssuePage() {
  return <CreateIssuePageClient />;
}
