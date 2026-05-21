# Zero-Friction Onboarding Requirements Checklist

**Purpose**: Self-review checklist validating requirements quality for US-1 and FR-ENV-006
**Created**: 2026-01-01
**Focus**: Zero-friction development environments, automatic project detection
**Depth**: Lightweight (pre-implementation sanity check)

---

## Requirement Completeness

- [x] CHK001 - Are all supported project types explicitly enumerated in FR-ENV-006? [Completeness, Spec §FR-ENV-006]
  - **Addressed**: FR-ENV-006 table lists: package.json (dev/start), docker-compose, Dockerfile, Makefile, pyproject.toml, go.mod
- [x] CHK002 - Are detection priority/precedence rules defined when multiple indicators exist (e.g., both `docker-compose.yml` and `package.json`)? [Gap]
  - **Addressed**: FR-ENV-007 defines precedence: compose > Dockerfile > package.json(dev) > Makefile > package.json(start)
- [ ] CHK003 - Is the "2 minutes" SLA in US-1 AC3 defined with measurement criteria (from PR open? from webhook receipt?)? [Clarity, Spec §US-1]
  - **TODO**: Clarify measurement start point
- [x] CHK004 - Are requirements defined for what happens when NO project type is detected? [Gap, Edge Case]
  - **Addressed**: FR-ENV-008 defines fallback: generic container, UI prompt, manual config form, non-blocking creation

## Requirement Clarity

- [x] CHK005 - Is "standard project structure" in US-1 AC1 defined with specific examples beyond `package.json`? [Ambiguity, Spec §US-1]
  - **Addressed**: FR-ENV-006 table provides full list of indicators with inferred setup for each
- [x] CHK006 - Is "correct dev server command inferred" quantified—what makes it "correct"? [Clarity, Spec §US-1]
  - **Addressed**: FR-ENV-006 table maps each indicator to specific command (e.g., `npm run dev`, `docker compose up`)
- [x] CHK007 - Are lockfile detection rules explicit (e.g., does `pnpm-lock.yaml` require exact filename match)? [Clarity, Spec §FR-ENV-006]
  - **Addressed**: research.project-detection.md specifies exact filenames: pnpm-lock.yaml, yarn.lock, bun.lockb
- [ ] CHK008 - Is "Build and run container" for Dockerfile-only projects defined with specific commands/behavior? [Ambiguity, Spec §FR-ENV-006]
  - **TODO**: Specify exact build/run commands for Dockerfile-only projects

## Acceptance Criteria Quality

- [x] CHK009 - Can US-1 AC1 "no manual configuration required" be objectively verified? [Measurability, Spec §US-1]
  - **Addressed**: E2E test T057 verifies PR opened → environment created with detected command
- [ ] CHK010 - Is US-1 AC4 "immediately without additional authentication" measurable (what counts as "additional")? [Measurability, Spec §US-1]
  - **TODO**: Define what authentication steps are expected vs "additional"
- [x] CHK011 - Are success/failure criteria defined for project detection (confidence thresholds, fallback behavior)? [Gap]
  - **Addressed**: research.project-detection.md defines confidence levels (high/medium/low) and FR-ENV-008 defines fallback

## Scenario Coverage

- [x] CHK012 - Are requirements defined for monorepo scenarios (multiple `package.json` files)? [Coverage, Gap]
  - **Addressed**: FR-ENV-009 defines monorepo handling with `spec.workdir` and root precedence
- [x] CHK013 - Are requirements specified for nested project structures (e.g., `web/package.json`)? [Coverage, Gap]
  - **Addressed**: FR-ENV-009 lists common patterns: `web/`, `app/`, `frontend/`, `backend/`, `packages/*`
- [x] CHK014 - Is behavior defined when detected command fails on first run? [Coverage, Exception Flow]
  - **Addressed**: FR-ENV-010 defines `degraded` status, preserved shell access, retry action
- [ ] CHK015 - Are requirements defined for updating detection when repo structure changes mid-PR? [Coverage, Gap]
  - **Partial**: FR-ENV-011 states overrides preserved on PR update; re-detection on reset not specified

## Edge Case Coverage

- [ ] CHK016 - Is fallback behavior defined when `scripts.dev` exists but is empty or malformed? [Edge Case, Gap]
  - **TODO**: Add edge case handling for malformed package.json scripts
- [ ] CHK017 - Are requirements defined for projects with `Makefile` but no `dev` target? [Edge Case, Gap]
  - **TODO**: Specify behavior when Makefile exists but lacks `dev` target
- [ ] CHK018 - Is behavior specified for private npm registries requiring auth during detection? [Edge Case, Gap]
  - **N/A**: Detection only reads file content, doesn't execute npm commands

## Override & User Control

- [x] CHK019 - Is the override UI/API interaction pattern specified (where in flow, what fields)? [Completeness, Spec §US-1 AC2]
  - **Addressed**: US-1 AC2 specifies "override via UI or API"; research.project-detection.md shows UI component
- [x] CHK020 - Are requirements defined for persisting user overrides across PR updates? [Gap]
  - **Addressed**: FR-ENV-011 states "existing overrides are preserved unless user explicitly resets"
- [x] CHK021 - Is it specified whether overrides apply per-PR, per-branch, or per-project? [Clarity, Gap]
  - **Addressed**: FR-ENV-011 defines project-level default with per-environment override option

---

## Summary

| Category            | Items  | Focus                                |
| ------------------- | ------ | ------------------------------------ |
| Completeness        | 4      | Missing requirements for edge cases  |
| Clarity             | 4      | Ambiguous terms and thresholds       |
| Acceptance Criteria | 3      | Measurability of success criteria    |
| Scenario Coverage   | 4      | Monorepo, nested, failure scenarios  |
| Edge Cases          | 3      | Malformed configs, auth requirements |
| Override/Control    | 3      | User override persistence and scope  |
| **Total**           | **21** |                                      |
