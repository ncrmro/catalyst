"use client";

import { useState } from "react";
import { CommitTimelineFilters as FilterValues } from "@/actions/commits";

interface CommitTimelineFiltersProps {
  authors: string[];
  repositories: string[];
  onFilterChange: (filters: FilterValues) => void;
}

export function CommitTimelineFilters({
  authors,
  repositories,
  onFilterChange,
}: CommitTimelineFiltersProps) {
  const [selectedAuthor, setSelectedAuthor] = useState<string>("");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">(
    "30d",
  );

  const handleFilterChange = (
    author?: string,
    repo?: string,
    range?: string,
  ) => {
    const filters: FilterValues = {};

    if (author && author !== "all") {
      filters.author = author;
    }

    if (repo && repo !== "all") {
      filters.repoFullName = repo;
    }

    // Calculate date range
    const now = new Date();
    const rangeValue = range || dateRange;
    if (rangeValue !== "all") {
      const days = parseInt(rangeValue);
      const since = new Date(now);
      since.setDate(since.getDate() - days);
      filters.since = since;
    }

    onFilterChange(filters);
  };

  const handleAuthorChange = (value: string) => {
    setSelectedAuthor(value);
    handleFilterChange(value, selectedRepo, dateRange);
  };

  const handleRepoChange = (value: string) => {
    setSelectedRepo(value);
    handleFilterChange(selectedAuthor, value, dateRange);
  };

  const handleDateRangeChange = (value: "7d" | "30d" | "90d" | "all") => {
    setDateRange(value);
    handleFilterChange(selectedAuthor, selectedRepo, value);
  };

  return (
    <div className="bg-surface border border-outline/50 rounded-lg p-4">
      <div className="flex flex-wrap gap-4">
        {/* Author Filter */}
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="author-filter"
            className="block text-sm font-medium text-on-surface mb-2"
          >
            Author
          </label>
          <select
            id="author-filter"
            value={selectedAuthor}
            onChange={(e) => handleAuthorChange(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-outline rounded-md text-on-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">All authors</option>
            {authors.map((author) => (
              <option key={author} value={author}>
                {author}
              </option>
            ))}
          </select>
        </div>

        {/* Repository Filter */}
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="repo-filter"
            className="block text-sm font-medium text-on-surface mb-2"
          >
            Repository
          </label>
          <select
            id="repo-filter"
            value={selectedRepo}
            onChange={(e) => handleRepoChange(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-outline rounded-md text-on-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">All repositories</option>
            {repositories.map((repo) => (
              <option key={repo} value={repo}>
                {repo}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-on-surface mb-2">
            Time Range
          </label>
          <div className="flex gap-2">
            {[
              { value: "7d", label: "7 days" },
              { value: "30d", label: "30 days" },
              { value: "90d", label: "90 days" },
              { value: "all", label: "All time" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() =>
                  handleDateRangeChange(value as "7d" | "30d" | "90d" | "all")
                }
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  dateRange === value
                    ? "bg-primary text-on-primary"
                    : "bg-surface-variant text-on-surface-variant hover:bg-primary/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
