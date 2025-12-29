# AI Agent Iteration Loop Configuration

This document defines how a project repository can configure its iteration loop for AI-assisted development. The iteration loop describes the workflow an AI agent follows when implementing features, from reading tasks to validating visual changes.

## Overview

An iteration loop consists of:

1. **Task Discovery** - Reading tasks from a defined file
2. **Context Loading** - Loading relevant specifications, stories, and research
3. **Implementation Strategy** - Determining the approach (story-first, test-first, etc.)
4. **Implementation** - Making code changes
5. **Validation** - Running tests, visual inspection, screenshots
6. **Completion** - Marking tasks done, committing changes

## Configuration File

Projects define their iteration loop in `.claude/iteration-loop.json` (or `.iteration-loop.json` at root).

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catalyst.dev/schemas/iteration-loop.json",
  "title": "Iteration Loop Configuration",
  "description": "Configuration for AI agent development iteration loops",
  "type": "object",
  "properties": {
    "version": {
      "type": "string",
      "description": "Schema version",
      "enum": ["1.0"]
    },
    "tasks": {
      "$ref": "#/$defs/tasksConfig"
    },
    "context": {
      "$ref": "#/$defs/contextConfig"
    },
    "strategy": {
      "$ref": "#/$defs/strategyConfig"
    },
    "validation": {
      "$ref": "#/$defs/validationConfig"
    },
    "workflow": {
      "$ref": "#/$defs/workflowConfig"
    }
  },
  "required": ["version", "tasks"],
  "$defs": {
    "tasksConfig": {
      "type": "object",
      "description": "Configuration for task discovery and parsing",
      "properties": {
        "source": {
          "type": "string",
          "description": "Path to tasks file (supports glob patterns)",
          "examples": ["specs/**/tasks.md", "TODO.md", ".tasks/current.md"]
        },
        "format": {
          "type": "string",
          "description": "Task file format",
          "enum": ["markdown-checklist", "json", "yaml"],
          "default": "markdown-checklist"
        },
        "taskPattern": {
          "type": "string",
          "description": "Regex pattern to extract task details",
          "default": "^- \\[([ xX])\\] (T\\d+)\\s*(?:\\[P\\])?\\s*(?:\\[(US-?\\d+)\\])?\\s*(.+)$"
        },
        "phasePattern": {
          "type": "string",
          "description": "Regex pattern to identify phase headers",
          "default": "^## Phase \\d+:"
        },
        "parallelMarker": {
          "type": "string",
          "description": "Marker indicating task can run in parallel",
          "default": "[P]"
        },
        "storyRefPattern": {
          "type": "string",
          "description": "Pattern to extract user story references",
          "default": "\\[(US-?\\d+)\\]"
        }
      },
      "required": ["source"]
    },
    "contextConfig": {
      "type": "object",
      "description": "Configuration for loading implementation context",
      "properties": {
        "specsDir": {
          "type": "string",
          "description": "Directory containing feature specifications",
          "default": "specs/"
        },
        "requiredDocs": {
          "type": "array",
          "description": "Documents that must be read before implementation",
          "items": {
            "type": "string"
          },
          "examples": [["spec.md", "plan.md", "tasks.md"]]
        },
        "optionalDocs": {
          "type": "array",
          "description": "Documents to read if they exist",
          "items": {
            "type": "string"
          },
          "examples": [["research.md", "data-model.md", "contracts/*.md"]]
        },
        "storiesDir": {
          "type": "string",
          "description": "Directory containing user stories (for story-first approach)",
          "examples": ["specs/**/stories/", "stories/"]
        },
        "fixturesDir": {
          "type": "string",
          "description": "Directory containing test fixtures/mock data",
          "examples": ["__tests__/fixtures/", "src/mocks/"]
        }
      }
    },
    "strategyConfig": {
      "type": "object",
      "description": "Implementation strategy configuration",
      "properties": {
        "approach": {
          "type": "string",
          "description": "Primary implementation approach",
          "enum": [
            "test-first",
            "story-first",
            "implementation-first",
            "adaptive"
          ],
          "default": "adaptive"
        },
        "featureClassification": {
          "type": "object",
          "description": "Rules for classifying features to determine approach",
          "properties": {
            "uxFeatures": {
              "type": "object",
              "description": "Config for UX/visual features",
              "properties": {
                "patterns": {
                  "type": "array",
                  "description": "Patterns indicating UX feature (in task description or file paths)",
                  "items": { "type": "string" },
                  "default": [
                    "component",
                    "page",
                    "ui",
                    "form",
                    "modal",
                    "button",
                    "layout"
                  ]
                },
                "approach": {
                  "type": "string",
                  "enum": ["story-first", "test-first"],
                  "default": "story-first"
                },
                "requiresVisualValidation": {
                  "type": "boolean",
                  "default": true
                }
              }
            },
            "apiFeatures": {
              "type": "object",
              "description": "Config for API/backend features",
              "properties": {
                "patterns": {
                  "type": "array",
                  "items": { "type": "string" },
                  "default": [
                    "api",
                    "endpoint",
                    "action",
                    "model",
                    "service",
                    "middleware"
                  ]
                },
                "approach": {
                  "type": "string",
                  "enum": ["test-first", "contract-first"],
                  "default": "test-first"
                }
              }
            },
            "dataFeatures": {
              "type": "object",
              "description": "Config for database/data layer features",
              "properties": {
                "patterns": {
                  "type": "array",
                  "items": { "type": "string" },
                  "default": [
                    "schema",
                    "migration",
                    "database",
                    "table",
                    "column"
                  ]
                },
                "approach": {
                  "type": "string",
                  "enum": ["schema-first", "migration-first"],
                  "default": "schema-first"
                }
              }
            }
          }
        },
        "storyFirst": {
          "type": "object",
          "description": "Configuration for story-first approach",
          "properties": {
            "enabled": {
              "type": "boolean",
              "description": "Enable story-first for UX features",
              "default": true
            },
            "storyFilePattern": {
              "type": "string",
              "description": "Pattern to find story files",
              "default": "*.stories.{ts,tsx,js,jsx}"
            },
            "mockDataFirst": {
              "type": "boolean",
              "description": "Create mock/fixture data before implementation",
              "default": true
            },
            "validateInStorybook": {
              "type": "boolean",
              "description": "Validate components in Storybook before integration",
              "default": true
            }
          }
        },
        "testFirst": {
          "type": "object",
          "description": "Configuration for test-first approach",
          "properties": {
            "enabled": {
              "type": "boolean",
              "default": true
            },
            "testTypes": {
              "type": "array",
              "description": "Order of test types to write",
              "items": {
                "type": "string",
                "enum": ["e2e", "integration", "unit", "component"]
              },
              "default": ["e2e", "integration", "unit"]
            },
            "e2eMatchesStory": {
              "type": "boolean",
              "description": "E2E tests should match user story acceptance criteria",
              "default": true
            }
          }
        }
      }
    },
    "validationConfig": {
      "type": "object",
      "description": "Validation and verification configuration",
      "properties": {
        "commands": {
          "type": "object",
          "description": "Commands to run for validation",
          "properties": {
            "typecheck": {
              "type": "string",
              "default": "npm run typecheck"
            },
            "lint": {
              "type": "string",
              "default": "npm run lint"
            },
            "unitTests": {
              "type": "string",
              "default": "npm run test:unit"
            },
            "integrationTests": {
              "type": "string",
              "default": "npm run test:integration"
            },
            "e2eTests": {
              "type": "string",
              "default": "npm run test:e2e"
            },
            "build": {
              "type": "string",
              "default": "npm run build"
            }
          }
        },
        "runAfterEachTask": {
          "type": "array",
          "description": "Validations to run after completing each task",
          "items": { "type": "string" },
          "default": ["typecheck"]
        },
        "runAfterPhase": {
          "type": "array",
          "description": "Validations to run after completing a phase",
          "items": { "type": "string" },
          "default": ["typecheck", "lint", "unitTests"]
        },
        "runBeforeCommit": {
          "type": "array",
          "description": "Validations required before committing",
          "items": { "type": "string" },
          "default": ["typecheck", "lint", "unitTests", "integrationTests"]
        },
        "visual": {
          "type": "object",
          "description": "Visual validation configuration",
          "properties": {
            "enabled": {
              "type": "boolean",
              "description": "Enable visual validation for UI changes",
              "default": true
            },
            "screenshotOnChange": {
              "type": "boolean",
              "description": "Take screenshots when UI components change",
              "default": true
            },
            "screenshotDir": {
              "type": "string",
              "description": "Directory to store screenshots",
              "default": "__tests__/screenshots/"
            },
            "viewports": {
              "type": "array",
              "description": "Viewports to capture",
              "items": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" },
                  "width": { "type": "integer" },
                  "height": { "type": "integer" }
                }
              },
              "default": [
                { "name": "mobile", "width": 375, "height": 667 },
                { "name": "desktop", "width": 1280, "height": 720 }
              ]
            },
            "compareWithBaseline": {
              "type": "boolean",
              "description": "Compare screenshots against baseline images",
              "default": false
            },
            "pages": {
              "type": "array",
              "description": "Specific pages/routes to screenshot",
              "items": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" },
                  "path": { "type": "string" },
                  "waitFor": { "type": "string" }
                }
              }
            }
          }
        }
      }
    },
    "workflowConfig": {
      "type": "object",
      "description": "Workflow and process configuration",
      "properties": {
        "phaseCheckpoints": {
          "type": "boolean",
          "description": "Require checkpoint validation between phases",
          "default": true
        },
        "autoMarkComplete": {
          "type": "boolean",
          "description": "Automatically mark tasks complete in tasks file",
          "default": true
        },
        "commitAfterPhase": {
          "type": "boolean",
          "description": "Create git commit after completing each phase",
          "default": true
        },
        "commitMessageFormat": {
          "type": "string",
          "description": "Format for commit messages",
          "default": "{type}({scope}): {description}\n\nTasks: {taskIds}"
        },
        "branchNaming": {
          "type": "string",
          "description": "Branch naming pattern",
          "default": "feature/{spec-id}-{description}"
        },
        "prTemplate": {
          "type": "string",
          "description": "Path to PR template",
          "default": ".github/PULL_REQUEST_TEMPLATE.md"
        }
      }
    }
  }
}
```

## Example Configuration

### Full Example

```json
{
  "version": "1.0",
  "tasks": {
    "source": "specs/**/tasks.md",
    "format": "markdown-checklist",
    "parallelMarker": "[P]"
  },
  "context": {
    "specsDir": "specs/",
    "requiredDocs": ["spec.md", "plan.md", "tasks.md"],
    "optionalDocs": ["research.md", "data-model.md", "contracts/*.md"],
    "storiesDir": "specs/**/stories/",
    "fixturesDir": "web/__tests__/fixtures/"
  },
  "strategy": {
    "approach": "adaptive",
    "featureClassification": {
      "uxFeatures": {
        "patterns": ["component", "page", "ui", "form"],
        "approach": "story-first",
        "requiresVisualValidation": true
      },
      "apiFeatures": {
        "patterns": ["action", "model", "api"],
        "approach": "test-first"
      }
    },
    "storyFirst": {
      "enabled": true,
      "mockDataFirst": true,
      "validateInStorybook": true
    },
    "testFirst": {
      "enabled": true,
      "testTypes": ["e2e", "integration", "unit"],
      "e2eMatchesStory": true
    }
  },
  "validation": {
    "commands": {
      "typecheck": "npm run typecheck",
      "lint": "npm run lint",
      "unitTests": "npm run test:unit",
      "e2eTests": "npm run test:e2e"
    },
    "runAfterEachTask": ["typecheck"],
    "runAfterPhase": ["typecheck", "lint", "unitTests"],
    "visual": {
      "enabled": true,
      "screenshotOnChange": true,
      "screenshotDir": "__tests__/screenshots/",
      "viewports": [
        { "name": "mobile", "width": 375, "height": 667 },
        { "name": "desktop", "width": 1280, "height": 720 }
      ]
    }
  },
  "workflow": {
    "phaseCheckpoints": true,
    "autoMarkComplete": true,
    "commitAfterPhase": true,
    "commitMessageFormat": "feat({scope}): {description}"
  }
}
```

### Minimal Example

```json
{
  "version": "1.0",
  "tasks": {
    "source": "TODO.md"
  }
}
```

## Implementation Strategies

### Adaptive Strategy (Default)

The agent automatically determines the best approach based on the task:

1. **Classify the task** using `featureClassification` patterns
2. **UX Features** → Story-first approach
3. **API Features** → Test-first approach
4. **Data Features** → Schema-first approach

### Story-First Approach

For UX and visual features:

```
1. Read user story from spec.md (US-X)
2. Create/update Storybook story with fixture data
3. Implement component with mock data
4. Validate in Storybook (visual inspection)
5. Take screenshot for documentation
6. Write E2E test matching acceptance criteria
7. Connect to real data/backend
8. Run E2E test to validate
```

**When to use:**

- New UI components
- Page layouts
- Forms and interactive elements
- Any task with visual output

### Test-First Approach

For API and business logic:

```
1. Read acceptance criteria from spec.md
2. Write E2E test matching the story
3. Write integration test for the action/endpoint
4. Write unit tests for edge cases
5. Implement the feature
6. Run tests (should pass)
7. Refactor if needed
```

**When to use:**

- Server actions
- API endpoints
- Business logic in models
- Data transformations

## Visual Validation

For tasks that affect the UI, the agent should take screenshots to validate changes:

### Screenshot Workflow

```
1. Identify affected pages/components
2. Start dev server (if not running)
3. Navigate to affected routes
4. Wait for page to be ready (specific element, not networkidle)
5. Capture screenshots at configured viewports
6. Store in screenshotDir with descriptive names
7. Include in commit or PR for review
```

### Screenshot Naming Convention

```
{task-id}_{page-name}_{viewport}_{timestamp}.png

Examples:
T020_pr-list-page_desktop_1703847200.png
T021_pr-item-component_mobile_1703847200.png
```

### Playwright Screenshot Integration

```typescript
// In E2E test or validation script
await page.goto("/projects/my-project/work");
await page.getByRole("heading", { name: "Pull Requests" }).waitFor();

await page.screenshot({
  path: `__tests__/screenshots/T020_pr-list_desktop.png`,
  fullPage: true,
});
```

## Task File Format

The default format is markdown checklists:

```markdown
## Phase 1: Setup

- [ ] T001 Create database migration for new table
- [ ] T002 [P] Add TypeScript types in src/lib/types/
- [ ] T003 [P] Create model file structure

**Checkpoint**: `npm run typecheck` passes

---

## Phase 2: US1 - User Story Title (P1)

**Goal**: Users can [accomplish something]

### Backend

- [ ] T004 [US1] Implement model layer in src/models/
- [ ] T005 [US1] Implement server actions in src/actions/

### UI

- [ ] T006 [US1] Create component with Storybook story
- [ ] T007 [US1] Connect UI to server actions

### Tests

- [ ] T008 [P] [US1] E2E test for happy path
- [ ] T009 [P] [US1] Unit tests for model layer

**Checkpoint**: US1 independently testable
```

### Task ID Format

- `T###` - Sequential task identifier
- `[P]` - Can run in parallel with other [P] tasks
- `[US#]` - References user story from spec.md

## Integration with SpecKit

This configuration integrates with the SpecKit workflow:

1. `/speckit.specify` → Creates spec.md with user stories
2. `/speckit.plan` → Creates plan.md with architecture
3. `/speckit.tasks` → Creates tasks.md following this schema
4. `/speckit.implement` → Reads iteration-loop.json to execute tasks

## Checkpoints

Phases should include checkpoints that validate progress:

```markdown
**Checkpoint**: npm run typecheck passes
**Checkpoint**: All unit tests passing
**Checkpoint**: E2E test for US1 passes
**Checkpoint**: Visual review complete in Storybook
```

The agent should pause at checkpoints and verify before proceeding.

## Error Handling

When a task fails:

1. **Non-parallel task fails** → Stop execution, report error
2. **Parallel task fails** → Continue with other parallel tasks, report at end
3. **Checkpoint fails** → Do not proceed to next phase

## Best Practices

1. **Keep tasks atomic** - Each task should be completable independently
2. **Clear dependencies** - Use phases to order dependent work
3. **Meaningful IDs** - Task IDs enable progress tracking
4. **Story references** - Link tasks to user stories for traceability
5. **Checkpoints** - Validate before moving between phases
6. **Visual validation** - Screenshot UI changes for review
7. **Test coverage** - E2E tests should match acceptance criteria
