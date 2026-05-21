# Specification Process

Specs define features through user stories, keeping development focused on user value. Each spec lives in a numbered directory and serves as documentation for agents and developers.

## Directory Structure

```
specs/
├── AGENTS.md              # This file
├── .templates/            # Template files
│   ├── spec.md
│   ├── plan.md
│   ├── quickstart.md
│   ├── tasks.md
│   └── research.md
└── ###-spec-slug/         # Individual specs
    ├── spec.md
    ├── plan.md
    ├── quickstart.md
    ├── tasks.md
    └── research*.md
```

## Spec Folder Contents

| File            | Purpose                                                                                 |
| --------------- | --------------------------------------------------------------------------------------- |
| `spec.md`       | User stories, functional requirements, success criteria. **No implementation details.** |
| `plan.md`       | Technical approach, code examples, data models, spike work.                             |
| `quickstart.md` | How to start developing the spec.                                                       |
| `tasks.md`      | Phased task breakdown. UI mocks before backend.                                         |
| `research*.md`  | Library comparisons, method evaluations. Keeps other docs terse.                        |

## Workflow

1. **spec.md** - Define user stories (P1/P2/P3), requirements (FR-###), success criteria (SC-###)
2. **plan.md** - Design implementation: schema, actions, components, spikes
3. **quickstart.md** - Document how to start developing
4. **tasks.md** - Break down into phases, UI-first approach

## Conventional Commits

Use the spec slug as the commit scope:

```
spec(user-auth): initial commit
spec(user-auth): add password reset user story
feat(user-auth): implement login form
fix(user-auth): handle session timeout
```

## Success Metrics

Every spec should define measurable success criteria:

```markdown
## Success Criteria

- **SC-001**: Users complete signup in < 2 minutes
- **SC-002**: Page load time < 500ms on 3G
- **SC-003**: Error rate < 0.1%
```

Metrics are measured as defined in `plan.md`.

## Quick Reference

### User Story Format

```markdown
### US-1: [Title] (P1)

[User journey description]

**Acceptance Criteria**:

1. **Given** [state], **When** [action], **Then** [outcome]
```

### Task Format

```markdown
- [ ] T001 [P] [US-1] Description with file path
```

- `[P]` = parallelizable (no dependencies)
- `[US-1]` = links to user story

### Creating a New Spec

```bash
mkdir specs/001-feature-name
cp specs/.templates/* specs/001-feature-name/
```

## Registering Specs

Specs must be referenced in the root `AGENTS.md` so agents are aware of active features without users needing to explain context.

Add to the "Active Specs" section in root AGENTS.md:

```markdown
### Active Specs

- [001-user-auth](specs/001-user-auth/) - User authentication and sessions
- [002-team-invites](specs/002-team-invites/) - Team invitation system
```

## Templates

Full templates with detailed guidance:

- [spec.md](.templates/spec.md) - User stories & requirements
- [plan.md](.templates/plan.md) - Implementation details
- [quickstart.md](.templates/quickstart.md) - Developer onboarding
- [tasks.md](.templates/tasks.md) - Phased task breakdown
- [research.md](.templates/research.md) - Library/method research

Based on [GitHub spec-kit](https://github.com/github/spec-kit/tree/main/templates).
