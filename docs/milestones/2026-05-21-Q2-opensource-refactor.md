# 2026-Q2 — Open-source refactor

**Authored:** 2026-05-21
**Status:** in progress

## Why

The previous Catalyst was a tightly coupled platform: a Next.js app, a Go operator, Helm charts, Crossplane configs, and K3s VM tooling all developed together as a single managed service. That shape made the platform hard to fork, hard to self-host, and hard to reason about as an outside contributor.

This milestone pivots to an **open-source, Railway-like shape**:

- The site is a stateless **Astro app on Cloudflare Workers**. Anyone can deploy their own copy with `wrangler deploy`.
- The compute lives in the user's own Kubernetes cluster, managed by a separate **Catalyst operator** that connects to the site.
- The operator deploys resources on behalf of the site; the site never holds infra credentials.

The previous codebase is preserved at [`/archive/`](../../archive/) for reference. We are not migrating features wholesale — each port is a deliberate decision driven by a follow-up issue.

## In scope for this milestone

- `code/web/` Astro skeleton with `@astrojs/cloudflare` adapter, deployable via `wrangler deploy`.
- Nix dev shell at the repo root scoped to the new stack (Bun, Node, Wrangler) — no Go, no Helm, no K3s.
- Contributor onboarding: `CONTRIBUTOR.md` at the repo root, thin `AGENTS.md` pointing into it, marketing-focused `README.md` linking to `docs/getting-started.md`.
- This milestone document.
- Sketch of the operator ↔ site contract (interface only, no implementation).

## Out of scope (explicit non-goals)

- Porting features from `archive/web` into `code/web`.
- Rewriting the Go operator. Operator work happens in a separate repository.
- Multi-tenant SaaS surface, billing, team management.
- CI for the new stack — added in a follow-up.

## Operator integration sketch

- Operator runs in the user's Kubernetes cluster.
- On start, it exchanges a long-lived token (issued by the site UI) for a short-lived session.
- It watches a small set of CRDs (e.g. `CatalystResource`) in its namespace and reconciles them against the site's declared state.
- The site itself stays stateless on Cloudflare Workers; persistence (where needed) is in a Workers KV / D1 / R2 binding, or in the user's own database — TBD.
- The site never holds cluster credentials. All cluster mutations happen inside the operator's process.

Full protocol design is a follow-up.

## Definition of done

- [ ] `direnv allow` (or `nix develop`) opens a working dev shell.
- [ ] `cd code/web && bun install && bun run dev` boots the Astro dev server and serves the placeholder landing page.
- [ ] `bun run build` produces a Cloudflare Workers bundle under `code/web/dist/`.
- [ ] `wrangler deploy --dry-run` succeeds inside the dev shell.
- [ ] `README.md` is marketing-only and links to `docs/getting-started.md`.
- [ ] `AGENTS.md` is thin and points to `CONTRIBUTOR.md` + this milestone.
- [ ] `CONTRIBUTOR.md` documents the full local dev loop.

## Tracking

- [ ] Open follow-up issue: restore root `LICENSE`.
- [ ] Open follow-up issue: stand up the operator repository.
- [ ] Open follow-up issue: design the site ↔ operator API.
- [ ] Open follow-up issue: CI workflows for Bun + Astro + Wrangler.
