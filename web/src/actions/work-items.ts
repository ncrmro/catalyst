"use server";

/**
 * Server action to fetch and categorize work items (PRs and branches) for a project.
 */

import { auth } from "@/auth";
import { fetchProjectBySlug } from "@/actions/projects";
import { fetchProjectSpecs } from "@/actions/specs";
import { fetchPullRequests, fetchRecentBranches, fetchIssues } from "@/lib/vcs-providers";
import { 
  WorkItem, 
  WorkItemPR, 
  WorkItemBranch, 
  WorkItemIssue,
  categorizePR, 
  categorizeBranch 
} from "@/lib/work-categorization";

/**
 * Fetch and categorize work items for a project
 * 
 * @param projectSlug - The project slug
 * @returns Object with categorized feature and platform tasks
 */
export async function fetchProjectWorkItems(projectSlug: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { featureTasks: [], platformTasks: [], specs: [] };
  }

  const project = await fetchProjectBySlug(projectSlug);
  if (!project) {
    return { featureTasks: [], platformTasks: [], specs: [] };
  }

  // Assuming single repository for now as per MVP
  const repoRelation = project.repositories[0];
  if (!repoRelation || !repoRelation.repo) {
    return { featureTasks: [], platformTasks: [], specs: [] };
  }

  const repo = repoRelation.repo;

  // Fetch specs for matching
  const specs = await fetchProjectSpecs(project.id, projectSlug);
  const specIds = specs.map(s => s.id);

  try {
    // Fetch PRs, Branches and Issues in parallel
    const [prs, branches, issues] = await Promise.all([
      fetchPullRequests(userId, [repo.fullName]),
      fetchRecentBranches(userId, repo.ownerLogin, repo.name, 7), // Last 7 days
      fetchIssues(userId, [repo.fullName])
    ]);

    // Process PRs
    const workItemsPR: WorkItemPR[] = prs.map(pr => {
      const { category, specId } = categorizePR({ 
        title: pr.title, 
        headBranch: pr.headBranch || "" 
      }, specIds);

      return {
        kind: "pr",
        id: String(pr.id),
        number: pr.number,
        title: pr.title,
        author: pr.author,
        authorAvatar: pr.author_avatar,
        repository: pr.repository,
        url: pr.url,
        headBranch: pr.headBranch || "",
        status: pr.status as "draft" | "ready" | "changes_requested",
        updatedAt: pr.updated_at ? new Date(pr.updated_at) : new Date(),
        category,
        specId,
      };
    });

    // Filter branches that already have an open PR or is the default branch
    const openPRBranches = new Set(prs.map(pr => pr.headBranch).filter(Boolean));
    
    // Fallback to 'main' since defaultBranch is not in DB yet
    const defaultBranch = "main";
    
    const workItemsBranch: WorkItemBranch[] = branches
      .filter(branch => !openPRBranches.has(branch.name) && branch.name !== defaultBranch)
      .map(branch => {
        const { category, specId } = categorizeBranch({ 
          name: branch.name, 
          lastCommitMessage: branch.lastCommitMessage || "" 
        }, specIds);
        
        return {
          kind: "branch",
          id: branch.name,
          name: branch.name,
          repository: repo.name,
          url: `${repo.url}/tree/${branch.name}`,
          lastCommitMessage: branch.lastCommitMessage || "",
          lastCommitAuthor: branch.lastCommitAuthor || "unknown",
          lastCommitDate: branch.lastCommitDate ? new Date(branch.lastCommitDate) : new Date(),
          category,
          specId,
        };
      });

    // Process Issues
    const workItemsIssue: WorkItemIssue[] = issues.map(issue => {
      const { category, specId } = categorizePR({ 
        title: issue.title, 
        headBranch: "" // Issues don't have head branches
      }, specIds);

      return {
        kind: "issue",
        id: String(issue.id),
        number: issue.number,
        title: issue.title,
        repository: issue.repository,
        url: issue.url,
        state: issue.state as "open" | "closed",
        updatedAt: issue.updated_at ? new Date(issue.updated_at) : new Date(),
        category,
        specId,
      };
    });

    const allWorkItems: WorkItem[] = [...workItemsPR, ...workItemsBranch, ...workItemsIssue];

    const featureTasks = allWorkItems.filter(item => item.category === "feature");
    const platformTasks = allWorkItems.filter(item => item.category === "platform");

    // Sort by updated date (newest first)
    const sortByDate = (a: WorkItem, b: WorkItem) => {
      const dateA = a.kind === "pr" ? a.updatedAt : a.kind === "issue" ? a.updatedAt : a.lastCommitDate;
      const dateB = b.kind === "pr" ? b.updatedAt : b.kind === "issue" ? b.updatedAt : b.lastCommitDate;
      return dateB.getTime() - dateA.getTime();
    };

    return {
      featureTasks: featureTasks.sort(sortByDate),
      platformTasks: platformTasks.sort(sortByDate),
      specs,
    };
  } catch (error) {
    console.error("Error fetching project work items:", error);
    return { featureTasks: [], platformTasks: [], specs: [] };
  }
}
