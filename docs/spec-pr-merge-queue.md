# Process: Spec Branch to PR Merge Queue

**Purpose**: To decompose a large "Spec Branch" (a long-lived feature branch implementing a complex Specification) into a series of atomic, reviewable, and testable Pull Requests that can be queued for merge.

**Goal**: Avoid "Big Bang" merges while maintaining the velocity of working on a unified context during development.

## The Workflow

### 1. Development (The Spec Branch)
*   Development happens on a single feature branch (e.g., `feature/001-environments`).
*   This branch is the "source of truth" for the ongoing implementation of a Spec.
*   Commits are frequent and may be granular.
*   Tests are added and pass in this branch.

### 2. Decomposition Strategy
Once the implementation of a logical phase or the entire spec is complete, the branch is analyzed to identify **logical units of work**.

**Criteria for a Unit (PR):**
1.  **Atomic**: It delivers one clear piece of value (e.g., "Add API field", "Implement Interface", "Add Test").
2.  **Testable**: It must pass CI on its own. If it relies on future code to pass tests, those tests should be part of the future PR (or mocked).
3.  **No Dead Code**: Ideally, it shouldn't introduce code that is unreachable, though foundational library code is acceptable.
4.  **Feature Flagged (Optional)**: If the feature is risky, it should be behind a flag or hidden until the final PR.

### 3. The Chain (Merge Queue)
We create a chain of dependencies:
`PR1` -> `PR2` (depends on PR1) -> `PR3` (depends on PR2)

*   **PR 1**: Targets `main`.
*   **PR 2**: Targets `PR 1` branch (or `main` if stacked patches).
*   **PR 3**: Targets `PR 2` branch.

**Modern Approach (Stacked PRs)**:
Ideally, each PR targets `main` but is built *on top* of the previous one. GitHub's "Merge Queue" or tools like `gh stack` handle this.
For manual management:
*   Branch `pr/01-foundation` created from `main`. Cherry-pick commits.
*   Branch `pr/02-implementation` created from `pr/01-foundation`. Cherry-pick commits.

### 4. Execution Steps

1.  **Freeze**: Stop adding new features to the Spec Branch.
2.  **Audit**: Run `git log` to review the commit history.
3.  **Plan**: Draft a plan (like this document) defining the PRs.
4.  **Cherry-Pick**:
    ```bash
    # PR 1
    git checkout -b pr/001-feat-name-foundation main
    git cherry-pick <commits...>
    git push origin pr/001-feat-name-foundation
    
    # PR 2
    git checkout -b pr/001-feat-name-implementation pr/001-feat-name-foundation
    git cherry-pick <commits...>
    git push origin pr/001-feat-name-implementation
    ```
5.  **Create PRs**: Open PRs in GitHub. PR 2 should indicate it depends on PR 1.

### 5. Automation (Agent)
The Agent can generate the "Plan" by analyzing the file changes and commit messages, grouping them by domain (e.g., "API changes", "Controller Logic", "UI").

### 6. Worktree Strategy (Parallel Review Handling)

To efficiently handle review feedback on multiple dependent PRs simultaneously without constant branch switching, create a dedicated git worktree for each PR in the chain.

**Setup Structure:**
```text
/project-root/          # Main worktree (main)
/project-root/worktrees/
  ├── pr-01-foundation/
  ├── pr-02-implementation/
  └── pr-03-tests/
```

**Workflow:**
1.  **Create Worktrees**:
    ```bash
    git worktree add ../worktrees/pr-01-foundation pr/001-feat-name-foundation
    git worktree add ../worktrees/pr-02-implementation pr/001-feat-name-implementation
    ```
2.  **Apply Fixes**:
    *   If PR 1 gets feedback, go to `cd ../worktrees/pr-01-foundation`.
    *   Make changes, commit, and push.
3.  **Rebase Downstream**:
    *   Go to `cd ../pr-02-implementation`.
    *   `git rebase pr/001-feat-name-foundation`.
    *   Resolve conflicts if any (rare if boundaries are clean).
    *   `git push --force-with-lease`.

This ensures you can fix the foundation while keeping the implementation based on the latest foundation code.

### 7. PR Creation Workflow (Functional Requirements)

**FR-PR-001**: PRs MUST be opened in sequential order of dependency.
**FR-PR-002**: Each PR description MUST link to the "Tracking Issue" (Release Plan).
**FR-PR-003**: Each PR (except the first) MUST explicitly state its "Base Branch" if it's not `main` (for stacked reviews) or note that it depends on the previous PR.
**FR-PR-004**: The title format MUST be `feat(scope): title` or `chore(scope): title`.
<<<<<<< HEAD
**FR-PR-005**: Branch names MUST follow the convention `<spec-id>-<spec-name>/<description>` (e.g., `001-environments/foundation`) for consistency.
**FR-PR-006**: All PRs in the chain EXCEPT the first one MUST be opened as **Draft** until the preceding PR is merged or stable. This prevents premature review/merging of dependent code.

**Execution Example:**
```bash
# PR 1 (Ready for Review)
gh pr create --base main --head 001-environments/foundation --title "feat(foundation): setup" --body "Part 1 of #ISSUE"

# PR 2 (Draft, Depends on PR 1)
gh pr create --draft --base main --head 001-environments/impl --title "feat(impl): logic" --body "Part 2 of #ISSUE. Depends on PR #<PR1>"
```
```

## Example Breakdown

**Source**: `feature/001-environments`

1.  **PR 1: API & Scaffolding**
    *   `api/v1alpha1/*`
    *   `config/crd/*`
    *   *Why*: Establishes the contract. Safe to merge.
2.  **PR 2: Shared Libraries**
    *   `pkg/git/*`, `pkg/docker/*`
    *   *Why*: Utility functions needed by controllers.
3.  **PR 3: Controller Implementation**
    *   `internal/controller/*`
    *   *Why*: The core logic. Tested by unit tests.
4.  **PR 4: Integration Tests**
    *   `test/e2e/*`, `.github/workflows/*`
    *   *Why*: Verifies the whole stack.
