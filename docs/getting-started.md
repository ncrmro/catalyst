# Getting started

Catalyst is two pieces:

1. **The site** — an Astro app that runs on Cloudflare Workers. This repository.
2. **The operator** — a Kubernetes controller that runs in your cluster, authenticates to the site, and reconciles resources you declare.

This guide walks you through running the site and connecting an operator.

## 1. Deploy the site

### Locally

```sh
direnv allow            # or: nix develop
cd code/web
bun install
bun run dev
```

Open the URL Astro prints (default `http://localhost:4321`).

### To Cloudflare Workers

```sh
cd code/web
bun run build
bun run deploy          # wrangler deploy
```

You'll need a Cloudflare account and `wrangler login` first. Edit `code/web/wrangler.toml` to set your worker name and route.

## 2. Connect a Kubernetes operator

The operator lives in its own repository (see the [current milestone](./milestones/) for status). Once installed in your cluster, configure it with:

- The site URL (your deployed Worker, or `http://localhost:4321` for local dev)
- An auth token issued by the site

Resources you declare in the cluster are reconciled by the operator against state served by the site.

## 3. Contribute

See [CONTRIBUTOR.md](../CONTRIBUTOR.md) at the repo root.
