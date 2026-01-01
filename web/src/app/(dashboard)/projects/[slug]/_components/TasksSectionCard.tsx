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

type TabValue = "specs" | "issues" | "prs";

interface TasksSectionCardProps {
  title: string;
  specs: Spec[];
  prsBySpec: PRsBySpec;
  issues: Issue[];
  projectSlug: string;
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
}

function SpecGroupHeader({
  specId,
  specName,
  itemCount,
  projectSlug,
}: SpecGroupHeaderProps) {
  const isNoSpec = specId === "no-spec";
  const href = isNoSpec
    ? undefined
    : `/projects/${projectSlug}/spec/${encodeURIComponent(specId)}`;

  return (
    <div className="flex items-center justify-between py-2 px-1">
      {href ? (
        <Link
          href={href}
          className="text-sm font-medium text-on-surface hover:text-primary transition-colors"
        >
          {specName}
        </Link>
      ) : (
        <span className="text-sm font-medium text-on-surface-variant">
          {specName}
        </span>
      )}
      <span className="text-xs text-on-surface-variant">
        {itemCount} item{itemCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

export function TasksSectionCard({
  title,
  specs,
  prsBySpec,
  issues,
  projectSlug,
}: TasksSectionCardProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("specs");

  // Get all PRs from prsBySpec
  const allPRs = [
    ...Object.values(prsBySpec.bySpec).flat(),
    ...prsBySpec.noSpec,
  ];

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

  const counts = {
    specs:
      Object.keys(prsBySpec.bySpec).length +
      (prsBySpec.noSpec.length > 0 ? 1 : 0),
    issues: issues.length,
    prs: allPRs.length,
  };

  const tabsWithCounts = TABS.map((tab) => ({
    ...tab,
    label: `${tab.label} (${counts[tab.value as TabValue]})`,
  }));

  // Don't render if no content
  const totalItems = allPRs.length + issues.length;
  if (totalItems === 0) return null;

  const specLookup = new Map(specs.map((s) => [s.id, s]));

  // Sort spec IDs alphabetically (which also sorts by number prefix like 001, 002, 009)
  const sortedPRSpecIds = Object.keys(prsBySpec.bySpec).sort();
  const sortedIssueSpecIds = Object.keys(issuesBySpec.bySpec).sort();

  return (
    <EntityCard
      title={title}
      metadata={`${allPRs.length} PRs · ${issues.length} issues`}
      expandable
      expanded
      className="!ring-0"
      trailingContent={
        <EntityCardTabSelector
          tabs={tabsWithCounts}
          activeTab={activeTab}
          onTabChange={(value) => setActiveTab(value as TabValue)}
        />
      }
      expandedContent={
        <div className="pt-2 space-y-4">
          {activeTab === "specs" && (
            <>
              {sortedPRSpecIds.map((specId) => {
                const spec = specLookup.get(specId) || {
                  id: specId,
                  name: specId,
                };
                const prs = prsBySpec.bySpec[specId];
                return (
                  <div key={specId}>
                    <SpecGroupHeader
                      specId={specId}
                      specName={spec.name}
                      itemCount={prs.length}
                      projectSlug={projectSlug}
                    />
                    <div className="divide-y divide-outline/30">
                      {prs.map((pr) => (
                        <PRListItem
                          key={pr.id}
                          pr={pr}
                          projectSlug={projectSlug}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {prsBySpec.noSpec.length > 0 && (
                <div>
                  <SpecGroupHeader
                    specId="no-spec"
                    specName="No Spec"
                    itemCount={prsBySpec.noSpec.length}
                    projectSlug={projectSlug}
                  />
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
              {Object.keys(prsBySpec.bySpec).length === 0 &&
                prsBySpec.noSpec.length === 0 && (
                  <p className="text-sm text-on-surface-variant py-4 text-center">
                    No specs with PRs
                  </p>
                )}
            </>
          )}

          {activeTab === "issues" && (
            <>
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
                    />
                    <div className="divide-y divide-outline/30">
                      {specIssues.map((issue) => (
                        <IssueListItem key={issue.id} issue={issue} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {issuesBySpec.noSpec.length > 0 && (
                <div>
                  <SpecGroupHeader
                    specId="no-spec"
                    specName="No Spec"
                    itemCount={issuesBySpec.noSpec.length}
                    projectSlug={projectSlug}
                  />
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
