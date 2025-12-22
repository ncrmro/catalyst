# Tasks: Project Slug Implementation

**Feature Branch**: `001-project-slugs`
**Generated**: 2025-12-22
**Input**: Design documents from `/specs/001-projects/`

## Format: `- [ ] [ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)

---

## Phase 1: Database Schema

**Purpose**: Add slug column and unique constraint

- [x] T001 Add `slug` column to `projects` table in `web/src/db/schema.ts` (text, not null)
- [x] T002 Add unique index on `(slug, team_id)` in `web/src/db/schema.ts`
- [x] T003 Generate database migration with `npm run db:generate`
- [x] T004 Create data migration script to generate slugs from existing project names (lowercase, replace spaces/special chars with hyphens)
- [ ] T005 Apply migrations with `npm run db:migrate`

---

## Phase 2: Validation

**Purpose**: Add slug validation at application layer

- [x] T006 [P] Create `generateSlug()` helper function in `web/src/lib/slug.ts` to convert names to valid slugs
- [x] T007 [P] Create `validateSlug()` function in `web/src/lib/slug.ts` with DNS-1123 label validation (Zod schema)

---

## Phase 3: Models Layer

**Purpose**: Update project queries and mutations to use slug

- [x] T008 Update `getProjects()` function in `web/src/models/projects.ts` to support `slugs` filter
- [x] T009 Update project creation logic to generate and validate slug from name
- [x] T010 Add slug uniqueness check before project creation (within team scope)

---

## Phase 4: Actions Layer

**Purpose**: Update server actions to support slug-based lookups

- [x] T011 [P] Add `fetchProjectBySlug()` action in `web/src/actions/projects.ts`
- [x] T012 [P] Update project creation action to include slug generation

---

## Phase 5: UI Routes

**Purpose**: Update routes to use slug in URLs

- [x] T013 Update `web/src/app/(dashboard)/projects/[projectId]/` to `[slug]/` route parameter
- [x] T014 Update all project links in UI to use slug instead of ID
- [x] T015 Update project detail page to fetch by slug
- [x] T016 Update `web/src/app/(dashboard)/environments/[projectId]/` to `[slug]/` route parameter

---

## Phase 6: Test Fixtures

**Purpose**: Update test fixtures to use slugs

- [x] T017 Update `web/__tests__/factories/project.factory.ts` with slug support
- [x] T018 Update `web/__tests__/e2e/fixtures/environments-fixture.ts` with slug support

---

## Phase 7: Polish

**Purpose**: Final validation and cleanup

- [ ] T019 Run linting with `npm run lint`
- [x] T020 Run type checking with `npm run typecheck`
- [ ] T021 Run build verification with `npm run build`
- [ ] T022 Verify existing tests pass

---

## Task Summary

- **Total Tasks**: 22
- **Completed**: 18
- **Remaining**: 4 (T005, T019, T021, T022)
