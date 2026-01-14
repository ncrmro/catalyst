# @catalyst/react-vcs-components

React components for Version Control System (VCS) integration in Catalyst.

## Components

### RepoSearch

A searchable repository picker component that integrates with GitHub to display and select repositories.

**Features:**
- Search and filter repositories by name and description
- Shows user and organization repositories
- Displays repository metadata (private/public, connections)
- Handles various VCS connection states (loading, connected, not connected, not configured)

**Usage:**
```tsx
import { RepoSearch } from '@catalyst/react-vcs-components';

function MyComponent() {
  const handleSelect = (repo) => {
    console.log('Selected repo:', repo);
  };

  return (
    <RepoSearch
      onSelect={handleSelect}
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
