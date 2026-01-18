/**
 * @catalyst/react-vcs-components
 *
 * React components for VCS integration
 */

export { RepoSearch } from "./RepoSearch";
export type {
  RepoSearchProps,
  RepositoryWithConnections,
  RepositoryConnection,
  ReposData,
  VCSOrganization,
} from "./RepoSearch";

export { SpecViewer } from "./SpecViewer";
export type { SpecViewerProps, SpecFile } from "./SpecViewer";

export { SpecFilesSidebar } from "./SpecFilesSidebar";
export type { SpecFilesSidebarProps } from "./SpecFilesSidebar";

// Re-export VCS-agnostic types for convenience
export type { Repository } from "@catalyst/vcs-provider";
