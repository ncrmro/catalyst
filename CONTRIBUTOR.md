# Contributing to Catalyst

Welcome. This guide gets you from clone to running site in a few commands.

## Prerequisites

- [Nix](https://nixos.org/download) with flakes enabled
- [direnv](https://direnv.net/) (optional but recommended)

Everything else (Bun, Node, Wrangler) is provided by the Nix dev shell — do not install them globally.

## Enter the dev shell

With direnv:

```sh
direnv allow
```

Without direnv:

```sh
nix develop
```

## Run the site locally

```sh
cd code/web
bun install
bun run dev
```

The Astro dev server prints a local URL (default `http://localhost:4321`).

## Test, lint, format

```sh
cd code/web
bun test          # run tests
bun run lint      # lint
bun run format    # format
```

## Deploy to Cloudflare Workers

```sh
cd code/web
bun run build     # produces a Workers bundle in dist/
bun run deploy    # wrangler deploy
```

`wrangler deploy --dry-run` works without auth and is useful for CI / verification.

## Connect a local Catalyst operator

The Kubernetes operator lives in its own repository (TBD — tracked in [docs/milestones/](./docs/milestones/)). The site exposes an authenticated endpoint the operator polls/watches for declared resources. Protocol details are sketched in the current milestone doc.

## Commit conventions

Use Conventional Commits: `type(scope): subject`.

Valid types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `ci`, `perf`, `build`. One logical change per commit.

## Code style

- Comments explain **why**, not what.
- Don't reference the current PR or session in source comments — that context lives in the commit message.
- See [docs/milestones/](./docs/milestones/) for current scope; don't pull features out of [archive/](./archive/) without an open issue.
