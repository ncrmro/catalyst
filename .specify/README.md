# .specify - Catalyst Specification System

This directory contains the Catalyst project's specification and governance system powered by SpecKit.

## Structure

```
.specify/
├── memory/
│   └── constitution.md          # Project constitution (principles, governance)
├── templates/
│   ├── plan-template.md         # Implementation planning template
│   ├── spec-template.md         # Feature specification template
│   ├── tasks-template.md        # Task breakdown template
│   └── commands/                # SpecKit slash command definitions
│       ├── speckit.analyze.md
│       ├── speckit.checklist.md
│       ├── speckit.clarify.md
│       ├── speckit.constitution.md
│       ├── speckit.implement.md
│       ├── speckit.plan.md
│       ├── speckit.specify.md
│       └── speckit.tasks.md
└── README.md                    # This file
```

## Constitution

The **constitution.md** file establishes the foundational principles and governance rules for Catalyst. All features, architectural decisions, and code changes must align with these principles:

1. **Agentic-First Design:** AI agents are first-class users
2. **Fast Feedback Loops:** CI/CD speed is paramount
3. **Deployment Portability:** Open standards, no vendor lock-in
4. **Security by Default:** Encryption, OAuth, RBAC built-in
5. **Test-Driven Quality:** >80% coverage mandatory
6. **Layered Architecture Discipline:** Actions/Models/Database separation

Read the full constitution: [memory/constitution.md](memory/constitution.md)

## Templates

Templates ensure consistent, high-quality specifications across the project.

### Spec Template

Use for defining new features with constitutional alignment checks, user stories, API design, and success metrics.

**When to use:** Before implementing any new feature
**Location:** `templates/spec-template.md`

### Plan Template

Use for breaking down implementation into phases with constitution checks, architecture changes, testing strategy, and rollout plan.

**When to use:** After spec approval, before coding
**Location:** `templates/plan-template.md`

### Tasks Template

Use for dependency-ordered task lists organized by layer (Database, Models, Actions, MCP, UI, Testing, Docs, Deployment).

**When to use:** During implementation to track progress
**Location:** `templates/tasks-template.md`

## SpecKit Slash Commands

SpecKit provides slash commands for working with specifications:

- `/speckit.constitution` - Create/update project constitution
- `/speckit.specify` - Create feature specification from description
- `/speckit.plan` - Generate implementation plan from spec
- `/speckit.tasks` - Generate task breakdown from plan/spec
- `/speckit.analyze` - Cross-artifact consistency analysis
- `/speckit.clarify` - Identify underspecified areas, ask questions
- `/speckit.implement` - Execute tasks from tasks.md
- `/speckit.checklist` - Generate custom checklists

**Usage:** Type `/speckit.<command>` in Claude Code

## Workflow

### 1. Constitutional Alignment

Before any feature work, ensure alignment with constitutional principles:

```bash
# Review constitution
cat .specify/memory/constitution.md
```

### 2. Feature Specification

```bash
# Create spec using SpecKit
/speckit.specify "Add deployment rollback capability"
```

This generates `spec.md` with:
- Problem statement
- Constitutional alignment
- User stories
- Requirements
- API design
- Testing requirements

### 3. Implementation Planning

```bash
# Generate plan from spec
/speckit.plan
```

This generates `plan.md` with:
- Phased implementation
- Architecture changes
- Testing strategy
- Rollout plan

### 4. Task Breakdown

```bash
# Generate tasks from plan
/speckit.tasks
```

This generates `tasks.md` with:
- Dependency-ordered tasks
- Layer-based organization
- Estimates
- Progress tracking

### 5. Implementation

```bash
# Execute tasks
/speckit.implement
```

SpecKit processes tasks, writes code, runs tests, updates docs.

### 6. Consistency Validation

```bash
# Validate spec/plan/tasks alignment
/speckit.analyze
```

Checks for:
- Cross-artifact consistency
- Constitutional compliance
- Missing requirements

## Amending the Constitution

The constitution evolves with the project. To propose amendments:

1. **Identify Need:** Determine if a principle needs addition, modification, or removal
2. **Draft Amendment:** Use `/speckit.constitution` with your proposed changes
3. **Version Bump:** System automatically increments version (MAJOR/MINOR/PATCH)
4. **Template Sync:** System updates dependent templates (plan, spec, tasks)
5. **Pull Request:** Submit PR with rationale
6. **Review & Approval:** Maintainer approval required
7. **Merge:** Constitution and templates updated together

**Versioning Rules:**
- **MAJOR:** Backward-incompatible changes (principle removal, redefinition)
- **MINOR:** New principles or material expansions
- **PATCH:** Clarifications, wording fixes

## Best Practices

### For Feature Developers

1. **Always start with the spec** - Don't code first, specify first
2. **Check constitutional alignment** - Every feature must uphold principles
3. **Use layer boundaries** - Respect Actions/Models/Database separation
4. **Write tests first** - >80% coverage is not negotiable
5. **Update docs** - README updates are part of the feature

### For Reviewers

1. **Verify constitutional compliance** - Check alignment section in spec
2. **Validate layer boundaries** - Ensure Actions don't contain business logic
3. **Check test coverage** - Require >80% before merge
4. **Review MCP accessibility** - Agents must be able to use the feature

### For AI Agents

1. **Read constitution first** - Understand project principles
2. **Use MCP tools** - All features should be accessible via MCP
3. **Follow templates** - Spec/plan/tasks templates ensure quality
4. **Validate alignment** - Run `/speckit.analyze` before PR

## Integration with Claude Code

Claude Code (claude.ai/code) reads the constitution and templates automatically. When working on Catalyst:

1. Claude checks constitutional alignment
2. Claude uses templates for specs/plans/tasks
3. Claude enforces layer boundaries
4. Claude validates test coverage

This ensures AI-generated code follows project standards.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-08 | Initial constitution with 6 core principles |

---

**Questions?** Read the [constitution](memory/constitution.md) or ask in project discussions.
