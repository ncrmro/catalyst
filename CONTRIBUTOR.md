# Contributor guide

This guide applies to both humans and agents working in this repo.

## Branching and worktrees

- `main` is the default branch and stays the source of truth.
- Implementation happens in git worktrees at
  `~/repos/{owner}/worktrees/{repo}/{branch}/`; the main checkout stays on the
  default branch.

## Commits

Conventional Commits: `type(scope): subject` using `feat`, `fix`, `refactor`,
`chore`, `docs`, `test`, `ci`, `perf`, `build`. One logical change per commit.

## Pull requests

1. Open as a draft: `gh pr create --draft`.
2. Wait for CI green, then `gh pr ready <number>`.
3. Squash-merge: `gh pr merge <number> --auto --squash --delete-branch`.

PRs MUST link their originating issue (`Closes #N` or `Part of #N`).
