# Quickstart: Projects Management

**Feature Branch**: `009-projects`
**Date**: 2025-12-25

This guide provides step-by-step instructions for implementing the Projects Management feature.

## Prerequisites

Before starting implementation:

1. **Environment Setup**

   ```bash
   cd web
   npm install
   cp .env.example .env  # Configure DATABASE_URL
   ```

2. **Database Running**

   ```bash
   make up  # Starts PostgreSQL via Docker
   ```

3. **Existing Features**
   - Teams and team memberships (existing)
   - Repositories (existing)
   - Project environments (existing)
   - GitHub App integration (existing)

## Implementation Order

Follow this order to build incrementally with testable milestones:

### Phase 1: Database Schema (Day 1)

**Goal**: Extend schema with new entities.

1. **Add status field to projects table**

   ```typescript
   // src/db/schema.ts - modify existing projects table
   status: text("status")
     .notNull()
     .default("active")
     .$type<"active" | "suspended" | "archived">(),
   suspendedAt: timestamp("suspended_at", { mode: "date" }),
   archivedAt: timestamp("archived_at", { mode: "date" }),
   ```

2. **Add new tables** (see data-model.md for full definitions):
   - `project_agents`
   - `project_agent_tasks`
   - `project_specs`
   - `work_items`
   - `work_item_scores`
   - `project_prioritization_rules`
   - `project_agent_approval_policies`

3. **Generate migration**

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Verify**
   ```bash
   npm run db:studio  # Inspect tables in browser
   ```

### Phase 2: Models Layer (Day 2-3)

**Goal**: Implement business logic for projects and work items.

1. **Create/extend model files**:

   ```
   src/models/
   ├── projects.ts           # Extend with status operations
   ├── project-agents.ts     # New: agent CRUD and task management
   ├── project-specs.ts      # New: spec detection and sync
   ├── work-items.ts         # New: unified work item aggregation
   └── prioritization.ts     # New: priority scoring algorithms
   ```

2. **Implement prioritization algorithm**:

   ```typescript
   // src/lib/prioritization.ts
   export function calculatePriorityScore(
     workItem: WorkItem,
     rules: PrioritizationRule[],
   ): PriorityResult {
     // Calculate factor scores
     const factors = {
       impact: calculateImpactScore(workItem),
       effort: calculateEffortScore(workItem),
       urgency: calculateUrgencyScore(workItem),
       alignment: calculateAlignmentScore(workItem),
       risk: calculateRiskScore(workItem),
     };

     // Apply rules
     const applicableRules = rules.filter((r) =>
       matchesCondition(workItem, r.condition),
     );
     const weights = resolveWeights(applicableRules);

     // Calculate final score
     const finalScore = weightedAverage(factors, weights);

     return { factors, finalScore, appliedRules };
   }
   ```

3. **Write unit tests**:
   ```bash
   npm run test:unit -- --grep "prioritization"
   ```

### Phase 3: Actions Layer (Day 4)

**Goal**: Create server actions for React components.

1. **Create action files**:

   ```
   src/actions/
   ├── projects.ts           # Extend existing
   ├── project-agents.ts     # New
   ├── project-specs.ts      # New
   └── dashboard.ts          # New
   ```

2. **Follow action pattern**:

   ```typescript
   // src/actions/project-agents.ts
   "use server";

   import { auth } from "@/lib/auth";
   import { configureAgent } from "@/models/project-agents";

   export async function configureProjectAgent(data: ConfigureAgentInput) {
     const session = await auth();
     if (!session?.user) {
       return { success: false, error: "Unauthorized" };
     }

     try {
       const agent = await configureAgent(data);
       return { success: true, data: agent };
     } catch (error) {
       return { success: false, error: "Failed to configure agent" };
     }
   }
   ```

3. **Write integration tests**:
   ```bash
   npm run test:integration -- --grep "project-agents"
   ```

### Phase 4: UI Components (Day 5-6)

**Goal**: Build dashboard and project management pages.

1. **Create page structure**:

   ```
   src/app/
   ├── dashboard/
   │   ├── page.tsx
   │   └── _components/
   │       ├── WorkItemList.tsx
   │       ├── PlatformWorkSection.tsx
   │       └── PriorityFilters.tsx
   └── projects/
       ├── new/page.tsx
       └── [slug]/
           ├── page.tsx
           └── settings/
               └── agents/page.tsx
   ```

2. **Build components in Storybook**:

   ```bash
   npm run storybook
   ```

3. **Implement pages with server components**:

   ```typescript
   // src/app/dashboard/page.tsx
   import { getPrioritizedWork } from "@/actions/dashboard";
   import { WorkItemList } from "./_components/WorkItemList";

   export default async function DashboardPage() {
     const result = await getPrioritizedWork({ category: "all" });

     if (!result.success) {
       return <div>Error loading dashboard</div>;
     }

     return (
       <div>
         <h1>Prioritized Work</h1>
         <WorkItemList workItems={result.data.workItems} />
       </div>
     );
   }
   ```

### Phase 5: MCP Tools (Day 7)

**Goal**: Expose features via MCP for agent access.

1. **Extend MCP route**:

   ```typescript
   // src/app/api/mcp/route.ts
   import { createProject, getProjects } from "@/actions/projects";
   import { getPrioritizedWork } from "@/actions/dashboard";

   const tools = {
     create_project: {
       handler: createProject,
       schema: createProjectSchema,
     },
     list_projects: {
       handler: getProjects,
       schema: listProjectsSchema,
     },
     get_prioritized_work: {
       handler: getPrioritizedWork,
       schema: getPrioritizedWorkSchema,
     },
     // ... more tools
   };
   ```

2. **Test with MCP client**:
   ```bash
   # Use MCP client to verify tools work
   ```

### Phase 6: AI Agents (Day 8-9)

**Goal**: Implement Platform, Project, and QA agents.

1. **Create agent implementations**:

   ```
   src/agents/
   ├── platform-agent.ts     # Test fixes, dependency updates
   ├── project-agent.ts      # Prioritization, task breakdown
   └── qa-agent.ts           # Smoke tests with Playwright
   ```

2. **Platform Agent example**:

   ```typescript
   // src/agents/platform-agent.ts
   import { generateObject } from "ai";
   import { anthropic } from "@ai-sdk/anthropic";

   export class PlatformAgent {
     async analyzeMaintenance(project: Project) {
       // Fetch repository state
       const repoState = await fetchRepoState(project);

       // Generate maintenance recommendations
       const result = await generateObject({
         model: anthropic("claude-sonnet-4-20250514"),
         schema: maintenanceRecommendationsSchema,
         prompt: `Analyze this repository and suggest maintenance tasks: ${JSON.stringify(repoState)}`,
       });

       return result.object;
     }
   }
   ```

### Phase 7: E2E Tests (Day 10)

**Goal**: Verify complete user workflows.

1. **Write E2E tests**:

   ```typescript
   // __tests__/e2e/project-creation.spec.ts
   test("User can create a project with repository", async ({ page }) => {
     await page.goto("/projects/new");
     await page.fill('[name="name"]', "My Project");
     await page.click('[data-testid="repo-select"]');
     await page.click('[data-testid="repo-option-catalyst"]');
     await page.click('button[type="submit"]');

     await expect(page).toHaveURL(/\/projects\/my-project/);
   });
   ```

2. **Run E2E suite**:
   ```bash
   npm run test:e2e
   ```

## Verification Checklist

After implementation, verify:

- [ ] Project creation with repository linking works
- [ ] Project status transitions (active ↔ suspended ↔ archived) work
- [ ] Agent configuration UI saves settings
- [ ] Dashboard displays prioritized work items
- [ ] Priority scores update when labels change
- [ ] Spec files are detected on push webhook
- [ ] MCP tools respond correctly
- [ ] Platform Agent can analyze a repository
- [ ] E2E tests pass

## Common Issues

### Migration Conflicts

If migration fails:

```bash
npm run db:push  # Force push (dev only)
# Or reset database
make destroy && make up
npm run db:migrate
```

### Agent Task Failures

Check agent task logs:

```sql
SELECT * FROM project_agent_tasks
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Priority Score Not Updating

Verify recalculation is triggered:

```typescript
// After webhook event
await recalculateWorkItemPriority(workItemId, "label_changed");
```

## Next Steps

After completing Phase 7:

1. Run `/speckit.tasks` to generate implementation tasks
2. Create GitHub issues for each task
3. Begin iterative implementation with TDD
