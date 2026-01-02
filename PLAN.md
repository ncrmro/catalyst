# Current Plan: 001-environments

**Branch**: `001-environments`
**Date**: 2026-01-01
**Focus**: Zero-Friction Development Environments (US-1, FR-ENV-006 through FR-ENV-011)

## Context

The latest commit (`c590aa1`) added zero-friction onboarding requirements for automatic project type detection. This enables PR preview environments to be created without manual configuration by inferring dev commands from repository structure.

## Current State

| Phase                   | Total  | Complete | Remaining | Status           |
| ----------------------- | ------ | -------- | --------- | ---------------- |
| Phase 0-3 (Local URL)   | 23     | 20       | 3         | Near complete    |
| Phase 4 (Polish)        | 3      | 0        | 3         | Pending          |
| Phase 5 (Self-Deploy)   | 17     | 0        | 17        | Not started      |
| Phase 6 (MVP No DB)     | 21     | 14       | 7         | In progress      |
| **Phase 7 (Detection)** | **28** | **0**    | **28**    | **Active focus** |
| **Total**               | **92** | **31**   | **61**    | 34% complete     |

## Goals

1. **Implement automatic project detection** (Phase 7) - Enable zero-config preview environments
2. **Complete checklist review** - Validate requirements quality for US-1
3. **Start T046** - Create `web/src/lib/project-detection.ts` with detection heuristics

## Completed This Session

- [x] Created `research.project-detection.md` with implementation details
- [x] Updated `plan.md` to reference project detection research
- [x] Updated `spec.md` research links
- [x] Updated `checklists/zero-friction.md` - marked 14/21 items addressed

## Remaining Checklist Items (TODOs)

- CHK003: Define "2 minutes" SLA measurement criteria
- CHK008: Specify Dockerfile-only build/run commands
- CHK010: Define "additional authentication" measurement
- CHK015: Specify re-detection behavior on repo structure change
- CHK016: Handle malformed package.json scripts
- CHK017: Handle Makefile without `dev` target

## Next Steps

### Immediate (Phase 7a - Detection Logic)

1. **T046** - Create `web/src/lib/project-detection.ts`
   - Implement `detectProjectType()` function
   - Support: docker-compose, Dockerfile, package.json, Makefile
   - Return `ProjectDetectionResult` with devCommand and confidence

2. **T047** - Add unit tests with fixture files

3. **T048** - Create `ProjectDetectionResult` type

4. **T058** - Implement precedence rules (FR-ENV-007)

### Then (Phase 7d - CRD Integration)

5. **T049** - Add `spec.devCommand` to Environment CRD
6. **T050** - Regenerate CRD manifests
7. **T051** - Update operator to use `spec.devCommand`

## Critical Path

```
T046 (detection) → T058 (precedence) → T049 (CRD) → T051 (operator) → T052 (webhook) → T057 (E2E)
```

## Key Files

- `specs/001-environments/spec.md` - Requirements (FR-ENV-006 through FR-ENV-011)
- `specs/001-environments/tasks.md` - Task breakdown (Phase 7: T046-T073)
- `specs/001-environments/research.project-detection.md` - Implementation design
- `specs/001-environments/checklists/zero-friction.md` - Requirements validation
