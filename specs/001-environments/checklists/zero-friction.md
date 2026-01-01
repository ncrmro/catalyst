# Zero-Friction Onboarding Requirements Checklist

**Purpose**: Self-review checklist validating requirements quality for US-1 and FR-ENV-006
**Created**: 2026-01-01
**Focus**: Zero-friction development environments, automatic project detection
**Depth**: Lightweight (pre-implementation sanity check)

---

## Requirement Completeness

- [ ] CHK001 - Are all supported project types explicitly enumerated in FR-ENV-006? [Completeness, Spec §FR-ENV-006]
- [ ] CHK002 - Are detection priority/precedence rules defined when multiple indicators exist (e.g., both `docker-compose.yml` and `package.json`)? [Gap]
- [ ] CHK003 - Is the "2 minutes" SLA in US-1 AC3 defined with measurement criteria (from PR open? from webhook receipt?)? [Clarity, Spec §US-1]
- [ ] CHK004 - Are requirements defined for what happens when NO project type is detected? [Gap, Edge Case]

## Requirement Clarity

- [ ] CHK005 - Is "standard project structure" in US-1 AC1 defined with specific examples beyond `package.json`? [Ambiguity, Spec §US-1]
- [ ] CHK006 - Is "correct dev server command inferred" quantified—what makes it "correct"? [Clarity, Spec §US-1]
- [ ] CHK007 - Are lockfile detection rules explicit (e.g., does `pnpm-lock.yaml` require exact filename match)? [Clarity, Spec §FR-ENV-006]
- [ ] CHK008 - Is "Build and run container" for Dockerfile-only projects defined with specific commands/behavior? [Ambiguity, Spec §FR-ENV-006]

## Acceptance Criteria Quality

- [ ] CHK009 - Can US-1 AC1 "no manual configuration required" be objectively verified? [Measurability, Spec §US-1]
- [ ] CHK010 - Is US-1 AC4 "immediately without additional authentication" measurable (what counts as "additional")? [Measurability, Spec §US-1]
- [ ] CHK011 - Are success/failure criteria defined for project detection (confidence thresholds, fallback behavior)? [Gap]

## Scenario Coverage

- [ ] CHK012 - Are requirements defined for monorepo scenarios (multiple `package.json` files)? [Coverage, Gap]
- [ ] CHK013 - Are requirements specified for nested project structures (e.g., `web/package.json`)? [Coverage, Gap]
- [ ] CHK014 - Is behavior defined when detected command fails on first run? [Coverage, Exception Flow]
- [ ] CHK015 - Are requirements defined for updating detection when repo structure changes mid-PR? [Coverage, Gap]

## Edge Case Coverage

- [ ] CHK016 - Is fallback behavior defined when `scripts.dev` exists but is empty or malformed? [Edge Case, Gap]
- [ ] CHK017 - Are requirements defined for projects with `Makefile` but no `dev` target? [Edge Case, Gap]
- [ ] CHK018 - Is behavior specified for private npm registries requiring auth during detection? [Edge Case, Gap]

## Override & User Control

- [ ] CHK019 - Is the override UI/API interaction pattern specified (where in flow, what fields)? [Completeness, Spec §US-1 AC2]
- [ ] CHK020 - Are requirements defined for persisting user overrides across PR updates? [Gap]
- [ ] CHK021 - Is it specified whether overrides apply per-PR, per-branch, or per-project? [Clarity, Gap]

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
