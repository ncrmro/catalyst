"use client";

import { useState } from "react";
import Link from "next/link";
import { EntityCard } from "@/components/ui/entity-card";
import { EntityCardTabSelector } from "@tetrastack/react-glass-components";
import { PRListItem } from "@/components/work-items/PRTasksSection";
import { IssueListItem } from "@/components/work-items/IssueListItem";
import type { Spec, PRsBySpec } from "@/lib/pr-spec-matching";
import type { IssuesBySpec } from "@/lib/issue-spec-matching";
import type { Issue } from "@/types/reports";
import { buildSpecUrl } from "@/lib/spec-url";

type TabValue = "specs" | "issues" | "prs";

interface TasksSectionCardProps {
  title: string;
  specs: Spec[];
  prsBySpec: PRsBySpec;
  issues: Issue[];
  projectSlug: string;
  repoSlug: string;
  /** Show all specs even if they have no items (default: true) */
  showAllSpecs?: boolean;
}

const TABS = [
  { value: "specs", label: "Specs" },
  { value: "issues", label: "Issues" },
  { value: "prs", label: "PRs" },
];

interface SpecGroupHeaderProps {
  specId: string;
  specName: string;
  itemCount: number;
  projectSlug: string;
  repoSlug: string;
  showAgentButton?: boolean;
}

function SpecGroupHeader({
  specId,
  specName,
  itemCount,
  projectSlug,
  repoSlug,
  showAgentButton = true,
}: SpecGroupHeaderProps) {
  const isNoSpec = specId === "no-spec";
  const specHref = isNoSpec
    ? undefined
    : buildSpecUrl(projectSlug, repoSlug, specId);
  const agentHref = isNoSpec
    ? undefined
    : buildSpecUrl(projectSlug, repoSlug, specId, { chat: true });

  return (
    <div className="flex items-center justify-between py-2 px-1">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {specHref ? (
          <Link
            href={specHref}
            className="text-sm font-medium text-on-surface hover:text-primary transition-colors truncate"
          >
            {specName}
          </Link>
        ) : (
          <span className="text-sm font-medium text-on-surface-variant truncate">
            {specName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-on-surface-variant">
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </span>
        {showAgentButton && agentHref && (
          <Link
            href={agentHref}
            className="p-1 rounded hover:bg-surface-variant transition-colors"
            title="Chat with spec agent"
          >
            <svg
              className="w-4 h-4 text-on-surface-variant hover:text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
              />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}

export function TasksSectionCard({
  title,
  specs,
  prsBySpec,
  issues,
  projectSlug,
  repoSlug,
  showAllSpecs = true,
}: TasksSectionCardProps) {
  // Get all PRs from prsBySpec
  const allPRs = [
    ...Object.values(prsBySpec.bySpec).flat(),
    ...prsBySpec.noSpec,
  ];

  /**
   * Tab Visibility and Default Selection Logic:
   *
   * Tab visibility (showAllSpecs affects which tabs are shown):
   * - When showAllSpecs=true (Feature Tasks): Always show all tabs
   * - When showAllSpecs=false (Platform Tasks): Hide "specs" tab if no specs have PRs
   *
   * Default tab selection:
   * - If specs tab is visible and has content: Default to "specs"
   * - If no specs to show but PRs exist: Default to "prs"
   * - Otherwise: Default to first available tab
   *
   * Card expansion:
   * - Collapsed by default when zero PRs AND zero issues (nothing actionable)
   * - Expanded when there are PRs or issues to show
   */
  const specsWithPRs = specs.filter((s) => prsBySpec.bySpec[s.id]?.length > 0);
  const hasSpecsToShow = showAllSpecs
    ? specs.length > 0
    : specsWithPRs.length > 0;

  // Hide specs tab for Platform Tasks (showAllSpecs=false) when no specs have PRs
  const showSpecsTab = showAllSpecs || hasSpecsToShow;

  const defaultTab: TabValue = hasSpecsToShow
    ? "specs"
    : allPRs.length > 0
      ? "prs"
      : showSpecsTab
        ? "specs"
        : "prs";

  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);

  // Collapse card when there are zero PRs and zero issues (nothing actionable to show)
  const hasActionableContent = allPRs.length > 0 || issues.length > 0;
  const defaultExpanded = hasActionableContent;

  // Group issues by spec
  const specIds = specs.map((s) => s.id);
  const issuesBySpec: IssuesBySpec = { bySpec: {}, noSpec: [] };
  issues.forEach((issue) => {
    const titleLower = issue.title.toLowerCase();
    let matched = false;
    for (const specId of specIds) {
      if (titleLower.includes(specId.toLowerCase())) {
        if (!issuesBySpec.bySpec[specId]) {
          issuesBySpec.bySpec[specId] = [];
        }
        issuesBySpec.bySpec[specId].push(issue);
        matched = true;
        break;
      }
    }
    if (!matched) {
      issuesBySpec.noSpec.push(issue);
    }
  });

  // Count specs based on showAllSpecs setting (specsWithPRs defined above for default tab logic)
  const specCount = showAllSpecs ? specs.length : specsWithPRs.length;
  const counts = {
    specs: specCount + (prsBySpec.noSpec.length > 0 ? 1 : 0),
    issues: issues.length,
    prs: allPRs.length,
  };

  const tabsWithCounts = TABS.map((tab) => ({
    ...tab,
    label: `${tab.label} (${counts[tab.value as TabValue]})`,
  }));

  // Always render the card, even with zero content
  // This ensures the Feature Tasks and Platform Tasks cards are always visible

  const specLookup = new Map(specs.map((s) => [s.id, s]));

  // Filter and sort specs
  // If showAllSpecs is true, show all specs; otherwise only show specs with PRs
  const specsToShow = showAllSpecs
    ? specs
    : specs.filter((s) => prsBySpec.bySpec[s.id]?.length > 0);
  const sortedSpecs = [...specsToShow].sort((a, b) => a.id.localeCompare(b.id));
  const sortedIssueSpecIds = Object.keys(issuesBySpec.bySpec).sort();

  // Filter tabs based on visibility rules (hide specs tab when showSpecsTab is false)
  const visibleTabs = tabsWithCounts.filter(
    (tab) => tab.value !== "specs" || showSpecsTab,
  );

  return (
    <EntityCard
      title={title}
      metadata={`${allPRs.length} PRs · ${issues.length} issues`}
      expandable
      expanded={defaultExpanded}
      className="!ring-0"
      trailingContent={
        <EntityCardTabSelector
          tabs={visibleTabs}
          activeTab={activeTab}
          onTabChange={(value) => setActiveTab(value as TabValue)}
        />
      }
      expandedContent={
        <div className="pt-2 space-y-4">
          {activeTab === "specs" && (
            <>
              {/* Render each spec with its associated PRs */}
              {sortedSpecs.map((spec) => {
                const prs = prsBySpec.bySpec[spec.id] || [];
                return (
                  <div key={spec.id}>
                    <SpecGroupHeader
                      specId={spec.id}
                      specName={spec.name}
                      itemCount={prs.length}
                      projectSlug={projectSlug}
                      repoSlug={repoSlug}
                    />
                    {prs.length > 0 && (
                      <div className="divide-y divide-outline/30">
                        {prs.map((pr) => (
                          <PRListItem
                            key={pr.id}
                            pr={pr}
                            projectSlug={projectSlug}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {/**
               * PRs Without Spec Association Display Logic:
               * - Always show PRs that don't match any spec (noSpec PRs)
               * - Only show "No Spec" header when there ARE specs being displayed
               *   (to distinguish unmatched PRs from spec-grouped ones)
               * - When zero specs exist, show PRs directly without the "No Spec" header
               *   (the PRs tab becomes the default in this case - see defaultTab logic above)
               */}
              {prsBySpec.noSpec.length > 0 && (
                <div>
                  {sortedSpecs.length > 0 && (
                    <SpecGroupHeader
                      specId="no-spec"
                      specName="No Spec"
                      itemCount={prsBySpec.noSpec.length}
                      projectSlug={projectSlug}
                      repoSlug={repoSlug}
                      showAgentButton={false}
                    />
                  )}
                  <div className="divide-y divide-outline/30">
                    {prsBySpec.noSpec.map((pr) => (
                      <PRListItem
                        key={pr.id}
                        pr={pr}
                        projectSlug={projectSlug}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "issues" && (
            <>
              {/* Render issues grouped by spec (issues with spec tokens in title) */}
              {sortedIssueSpecIds.map((specId) => {
                const spec = specLookup.get(specId) || {
                  id: specId,
                  name: specId,
                };
                const specIssues = issuesBySpec.bySpec[specId];
                return (
                  <div key={specId}>
                    <SpecGroupHeader
                      specId={specId}
                      specName={spec.name}
                      itemCount={specIssues.length}
                      projectSlug={projectSlug}
                      repoSlug={repoSlug}
                    />
                    <div className="divide-y divide-outline/30">
                      {specIssues.map((issue) => (
                        <IssueListItem key={issue.id} issue={issue} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {/**
               * Issues Without Spec Association Display Logic:
               * - Same pattern as PRs: show "No Spec" header only when specs exist
               * - When zero specs with issues, show issues directly without header
               */}
              {issuesBySpec.noSpec.length > 0 && (
                <div>
                  {sortedIssueSpecIds.length > 0 && (
                    <SpecGroupHeader
                      specId="no-spec"
                      specName="No Spec"
                      itemCount={issuesBySpec.noSpec.length}
                      projectSlug={projectSlug}
                      repoSlug={repoSlug}
                      showAgentButton={false}
                    />
                  )}
                  <div className="divide-y divide-outline/30">
                    {issuesBySpec.noSpec.map((issue) => (
                      <IssueListItem key={issue.id} issue={issue} />
                    ))}
                  </div>
                </div>
              )}
              {issues.length === 0 && (
                <p className="text-sm text-on-surface-variant py-4 text-center">
                  No issues
                </p>
              )}
            </>
          )}

          {activeTab === "prs" && (
            <>
              {allPRs.length > 0 ? (
                <div className="divide-y divide-outline/30">
                  {allPRs.map((pr) => (
                    <PRListItem key={pr.id} pr={pr} projectSlug={projectSlug} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant py-4 text-center">
                  No pull requests
                </p>
              )}
            </>
          )}
        </div>
      }
      size="sm"
    />
  );
}
