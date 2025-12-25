import { CommitWithRepo } from "@/actions/commits";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface CommitCardProps {
  commit: CommitWithRepo;
}

export function CommitCard({ commit }: CommitCardProps) {
  // Split commit message into title and body
  const [title, ...bodyLines] = commit.message.split("\n");
  const body = bodyLines.join("\n").trim();

  // Format relative time
  const timeAgo = formatDistanceToNow(commit.date, { addSuffix: true });

  // Short SHA for display
  const shortSha = commit.sha.substring(0, 7);

  return (
    <div className="border border-outline/50 rounded-lg p-4 hover:border-outline transition-colors bg-surface">
      <div className="flex items-start gap-3">
        {/* Author Avatar */}
        <div className="flex-shrink-0">
          {commit.authorAvatarUrl ? (
            <img
              src={commit.authorAvatarUrl}
              alt={commit.author}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {commit.author.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Commit Info */}
        <div className="flex-1 min-w-0">
          {/* Commit Title */}
          <Link
            href={commit.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-on-surface hover:text-primary transition-colors block"
          >
            {title}
          </Link>

          {/* Commit Body (if exists) */}
          {body && (
            <p className="mt-1 text-sm text-on-surface-variant whitespace-pre-wrap line-clamp-3">
              {body}
            </p>
          )}

          {/* Metadata */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-surface-variant">
            {/* Author */}
            <span>
              <span className="font-medium text-on-surface">
                {commit.author}
              </span>
            </span>

            {/* Repository */}
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              {commit.repositoryFullName}
            </span>

            {/* Project Name */}
            {commit.projectName && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                {commit.projectName}
              </span>
            )}

            {/* Time */}
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {timeAgo}
            </span>

            {/* SHA */}
            <Link
              href={commit.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs bg-surface-variant px-2 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {shortSha}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
