# @catalyst/react-vcs-components

React components for Version Control System (VCS) integration in Catalyst.

**VCS-Agnostic Design**: These components use standardized types from `@catalyst/vcs-provider` to support multiple VCS providers (GitHub, GitLab, Bitbucket, etc.) without coupling to any specific implementation.

## Components

### RepoSearch

A searchable repository picker component that integrates with any VCS provider to display and select repositories.

**Features:**
- Search and filter repositories by name and description
- Shows user and organization repositories
- Displays repository metadata (private/public, connections)
- Handles various VCS connection states (loading, connected, not connected, not configured)
- **Provider-agnostic**: Works with GitHub, GitLab, and other VCS providers

**Usage:**
```tsx
import { RepoSearch } from '@catalyst/react-vcs-components';
import type { RepositoryWithConnections } from '@catalyst/react-vcs-components';

function MyComponent() {
  const handleSelect = (repo: RepositoryWithConnections) => {
    console.log('Selected repo:', repo.fullName);
  };

  return (
    <RepoSearch
      onSelect={handleSelect}
      repos={reposData}  // VCS-agnostic ReposData format
      isLoading={false}
      excludeUrls={['https://github.com/org/already-connected']}
      placeholder="Search repositories..."
    />
  );
}
```

### SpecViewer

A component for viewing specification documents from a VCS repository.

**Features:**
- Displays markdown content with syntax highlighting
- File navigation sidebar
- Supports multiple spec files (spec.md, plan.md, tasks.md, etc.)
- Supports client-side navigation via `Link` or state-based switching

**Usage:**
```tsx
import { SpecViewer } from '@catalyst/react-vcs-components';

function SpecPage() {
  return (
    <SpecViewer
      specFiles={[
        { name: 'spec.md', path: 'specs/001/spec.md', content: '# Spec...' },
        { name: 'plan.md', path: 'specs/001/plan.md', content: '# Plan...' }
      ]}
      activeFile="spec.md"
      onFileSelect={(fileName) => console.log('Selected:', fileName)}
    />
  );
}
```

### SpecFilesSidebar

A sidebar component for navigating between spec files.

**Usage:**
```tsx
import { SpecFilesSidebar } from '@catalyst/react-vcs-components';

function MyLayout() {
  return (
    <SpecFilesSidebar
      files={['spec.md', 'plan.md', 'tasks.md']}
      activeFile="spec.md"
      onFileSelect={(file) => console.log(file)}
      basePath="/projects/my-project/spec/001"
    />
  );
}
```

## Next.js App Router Integration

To implement a full-featured spec viewer in Next.js App Router that handles dynamic routing, optional file path navigation, and server-side rendering of Markdown content, follow this pattern:

### 1. Route Definition

Create a catch-all route `app/specs/[...slug]/page.tsx` to handle flexible URL segments:
- `/specs/[project]/[spec]` (Index/Tasks view)
- `/specs/[project]/[repo]/[spec]` (When project != repo)
- `/specs/[project]/[spec]/[file.md]` (File view)

### 2. Parsing Logic (Server Action / Utility)

Use a helper to parse the slug and detect if a specific file is requested.

```typescript
// lib/spec-url.ts
export function parseSpecSlug(slug: string[]) {
  const parts = [...slug];
  let fileName: string | undefined;

  // Heuristic: Check if last segment is a markdown file
  if (parts.length > 0 && parts[parts.length - 1].toLowerCase().endsWith(".md")) {
    fileName = parts.pop();
  }

  // Remaining parts can be:
  // - [project, spec] - when project and repo have same name (2 segments)
  // - [project, repo, spec] - when they differ (3 segments)
  // In the 2-part form, repoSlug defaults to projectSlug.
  if (parts.length === 2) {
    return {
      projectSlug: parts[0],
      repoSlug: parts[0], // Default to projectSlug
      specSlug: parts[1],
      fileName,
    };
  } else if (parts.length === 3) {
    return {
      projectSlug: parts[0],
      repoSlug: parts[1],
      specSlug: parts[2],
      fileName,
    };
  }
  // See actual implementation for additional validation / edge cases
  throw new Error("Invalid spec URL format");
}
```

### 3. Page Implementation

In `page.tsx`, route based on the presence of `fileName`.

```tsx
// app/specs/[...slug]/page.tsx
export default async function SpecPage({ params }: Props) {
  const { slug } = await params;
  const { projectSlug, specSlug, fileName } = parseSpecSlug(slug);

  if (fileName) {
    // User requested a specific file -> Render Spec Content
    return (
      <SpecContentTab
        projectSlug={projectSlug}
        specSlug={specSlug}
        fileName={fileName}
      />
    );
  }

  // No file requested -> Render Dashboard/Tasks Index
  return <SpecTasksTab ... />;
}
```

### 4. Spec Viewer & Server Rendering

Implement the content tab to fetch data and pre-render Markdown on the server. Passing the pre-rendered `ReactNode` to `SpecViewer` avoids passing functions to Client Components.

```tsx
// components/SpecContentTab.tsx (Server Component)
import { SpecViewer } from "@catalyst/react-vcs-components/SpecViewer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer"; // Your server-side renderer

export async function SpecContentTab({ fileName, ...props }) {
  // 1. List all files in spec directory (to populate sidebar)
  const files = await listDirectory(repo, `specs/${specSlug}`);
  
  // 2. Read content ONLY for the active file
  const activeContent = await readFile(repo, `specs/${specSlug}/${fileName}`);

  // 3. Pre-render Markdown on Server
  const renderedContent = <MarkdownRenderer content={activeContent} />;

  // 4. Construct SpecFile objects
  // Note: 'content' string is fallback; 'rendered' ReactNode is primary
  const specFiles = files.map(f => ({
    name: f.name,
    path: f.path,
    content: f.name === fileName ? activeContent : "", 
    rendered: f.name === fileName ? renderedContent : undefined
  }));

  // 5. Provide baseHref to enable Link-based navigation in SpecViewer
  return (
    <SpecViewer
      specFiles={specFiles}
      activeFile={fileName}
      baseHref={`/specs/${projectSlug}/${specSlug}`}
    />
  );
}
```

### 5. Required Server Actions

To power these components, your application must implement server actions for data fetching. The components are agnostic to *how* you fetch data (GitLab, GitHub, Bitbucket, filesystem, etc.), but the examples above assume the following interfaces:

```typescript
// actions/version-control-provider.ts
"use server";

export interface VCSEntry {
  name: string;
  path: string;
  type: "file" | "dir";
}

export interface VCSDirectoryResult {
  success: boolean;
  entries: VCSEntry[];
  error?: string;
}

export interface VCSFileResult {
  success: boolean;
  file: {
    name: string;
    path: string;
    content: string;
  } | null;
  error?: string;
}

/**
 * List files in a directory
 */
export async function listDirectory(
  repoFullName: string, 
  path: string, 
  ref?: string
): Promise<VCSDirectoryResult> {
  // Implementation (e.g. using @catalyst/vcs-provider or Octokit)
}

/**
 * Read content of a specific file
 */
export async function readFile(
  repoFullName: string, 
  path: string, 
  ref?: string
): Promise<VCSFileResult> {
  // Implementation
}
```

## Installation

This package is part of the Catalyst monorepo workspace and is automatically available to other packages in the workspace.

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test
```

## License

MIT