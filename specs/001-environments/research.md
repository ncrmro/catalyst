# Research: Local URL Testing

**Feature**: [FR-ENV-002] Local Development URL Testing
**Date**: 2025-12-28

## Decisions

### 1. Path-Based Routing for Local Development

**Decision**: Use NGINX Ingress `rewrite-target` annotation to support path-based routing (e.g., `http://localhost:8080/env-preview-123/`) for local development environments.

**Rationale**:
- **Rootless & Offline**: Works without modifying `/etc/hosts` or requiring public DNS (nip.io).
- **Agent Accessible**: Agents running inside the cluster or on the host can access the URL deterministically via `localhost` and the known port.
- **Zero Config**: No additional setup required for developers (unlike `dnsmasq` or `cloudflared`).

**Alternatives Considered**:
- **nip.io / sslip.io**: Rejected as the *default* because it requires internet access and wildcard DNS resolution, which can be flaky or blocked. Kept as an optional alternative.
- **Hosts file**: Rejected because it requires root privileges and manual updates per environment.
- **Cloudflare Tunnel**: Rejected for local dev due to external dependency, latency, and "exposing local to public" security implications for general dev work (though good for demos).

## References

- Full analysis in [research.local-url-testing.md](./research.local-url-testing.md)