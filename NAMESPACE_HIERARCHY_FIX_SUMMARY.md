# Namespace Hierarchy Fix Summary

## Problem

Projects were being created in the `"default"` namespace instead of team namespaces, and Environments were being created in `"default"` instead of project namespaces. This violated the namespace hierarchy specification from commit 06934a4.

## Solution

Updated three key files to properly implement the namespace hierarchy:

### 1. Project Creation (`web/src/lib/sync-project-cr.ts`)

**Changes**:
- Fetch team information from project database record
- Generate team namespace: `generateTeamNamespace(teamName)`
- Ensure team namespace exists before creating Project CR
- Create Project CR in team namespace with hierarchy labels

**Labels Added**:
```typescript
{
  "catalyst.dev/team": teamName,
  "catalyst.dev/project": projectName,
}
```

**Example**:
- Team: `acme-corp`
- Project: `web-app`
- **Project CR created in**: `acme-corp` namespace
- **Project CR name**: `web-app`

### 2. Environment Creation from Actions (`web/src/actions/environments.ts`)

**Changes**:
- Fetch team information from project database record
- Generate project namespace: `generateProjectNamespace(teamName, projectName)`
- Ensure project namespace exists before creating Environment CR
- Create Environment CR in project namespace with hierarchy labels

**Labels Added**:
```typescript
{
  "catalyst.dev/team": teamName,
  "catalyst.dev/project": projectName,
  "catalyst.dev/environment": environmentName,
}
```

**Example**:
- Team: `acme-corp`
- Project: `web-app`
- Environment: `production`
- **Environment CR created in**: `acme-corp-web-app` namespace
- **Environment CR name**: `production`
- **Workloads deployed to**: `acme-corp-web-app-production` namespace (managed by operator)

### 3. Preview Deployments (`web/src/models/preview-environments.ts`)

**Changes**:
- Fetch team information from pull request database record
- Generate project namespace when team info is available
- Ensure project namespace exists before creating Environment CR
- Add hierarchy labels when team context is available
- Gracefully fallback to `"default"` if team info unavailable

**Labels Added** (when team context available):
```typescript
{
  "catalyst.dev/team": teamName,
  "catalyst.dev/project": projectName,
  "catalyst.dev/environment": crName,
}
```

**Example**:
- Team: `acme-corp`
- Repo: `web-app`
- PR: `#123`
- **Environment CR created in**: `acme-corp-web-app` namespace (or `default` if no team context)
- **Environment CR name**: `preview-123`
- **Workloads deployed to**: `acme-corp-web-app-preview-123` namespace (managed by operator)

## Namespace Hierarchy

The complete hierarchy now works as specified:

```
Team Namespace (e.g., "acme-corp")
├── Project CR: web-app
│   └── labels:
│       ├── catalyst.dev/team: acme-corp
│       └── catalyst.dev/project: web-app
│
└── Project Namespace (e.g., "acme-corp-web-app")
    ├── Environment CR: production
    │   └── labels:
    │       ├── catalyst.dev/team: acme-corp
    │       ├── catalyst.dev/project: web-app
    │       └── catalyst.dev/environment: production
    │
    ├── Environment CR: staging
    │   └── labels: [same structure]
    │
    └── Environment CR: preview-123
        └── labels: [same structure]

Environment Namespaces (created by operator):
├── acme-corp-web-app-production (workloads)
├── acme-corp-web-app-staging (workloads)
└── acme-corp-web-app-preview-123 (workloads)
```

## Benefits

1. **Proper Isolation**: Projects are isolated per team, environments per project
2. **Permission Boundaries**: RBAC can be applied at team or project level
3. **Resource Quotas**: Can be set at team or project namespace level
4. **Observability**: Team-based monitoring and metrics collection
5. **Compliance**: Follows FR-ENV-020 namespace hierarchy specification
6. **DNS-1123 Compliant**: All namespaces respect 63-char limit with hash truncation

## Backward Compatibility

- Existing CRs in "default" namespace continue to work
- Operator has fallback logic for CRs without hierarchy labels
- No migration required
- New deployments automatically use proper hierarchy

## Testing

- ✅ TypeScript compilation passes
- ✅ All unit tests pass (213 tests)
- ✅ Linting passes
- ✅ Integration tests run (2 pre-existing failures documented)

## Files Changed

1. `web/src/lib/sync-project-cr.ts` - Project CR creation
2. `web/src/actions/environments.ts` - Environment action
3. `web/src/models/preview-environments.ts` - Preview deployments
4. `web/src/lib/k8s-operator.ts` - Added labels parameter
5. `web/docs/kind-cluster-issues.md` - Documented test failures

## Related Specifications

- **FR-ENV-020**: Namespace Hierarchy
- **FR-ENV-021**: 63-Character Limit Handling
- Commit: 06934a4 - feat(environmnets): use proper team/project/environment/namespacing

## Next Steps

1. Monitor production deployments to ensure proper namespace usage
2. Consider migrating existing CRs to proper namespaces (optional)
3. Address Kind cluster integration test issues (separate task)
4. Update monitoring/alerting to leverage namespace hierarchy
