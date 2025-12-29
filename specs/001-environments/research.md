# Research: Local URL Testing

**Feature**: [FR-ENV-002] Local Development URL Testing
**Date**: 2025-12-28 (Updated: 2025-12-29)

## Decisions

### 1. Hostname-Based Routing via `*.localhost` for Local Development

**Decision**: Use NGINX Ingress with hostname-based routing using `*.localhost` subdomains (e.g., `http://namespace.localhost:8080/`) for local development environments.

**Rationale**:

- **Rootless & Offline**: Modern browsers automatically resolve `*.localhost` to `127.0.0.1` without requiring `/etc/hosts` modifications or public DNS.
- **Production Parity**: Uses the same hostname-based routing pattern as production, just with `.localhost` instead of `.preview.catalyst.dev`.
- **No Path Prefix Issues**: Applications don't need to handle base path configurations—URLs work exactly like production.
- **Agent Accessible**: Agents running inside the cluster or on the host can access the URL deterministically via the namespace hostname.
- **Zero Config**: No additional setup required for developers (unlike `dnsmasq` or `cloudflared`).

**Previous Approach (Deprecated)**:
Path-based routing (`http://localhost:8080/namespace/`) was initially considered but rejected because Next.js and other frameworks don't automatically handle sub-path deployments without explicit `basePath` configuration. Hardcoded redirects (e.g., `redirect("/projects")`) lose the path prefix, causing 404 errors.

**Alternatives Considered**:

- **Path-based routing**: Rejected due to framework compatibility issues with redirects and basePath.
- **nip.io / sslip.io**: Rejected as the _default_ because it requires internet access and wildcard DNS resolution, which can be flaky or blocked. Kept as an optional alternative.
- **Hosts file**: Rejected because it requires root privileges and manual updates per environment.
- **Cloudflare Tunnel**: Rejected for local dev due to external dependency, latency, and "exposing local to public" security implications for general dev work (though good for demos).

## References

- Full analysis in [research.local-url-testing.md](./research.local-url-testing.md)
