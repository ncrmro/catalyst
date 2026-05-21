# MCP Tools Contract: Projects Management

**Feature Branch**: `009-projects`
**API Group**: Catalyst MCP Server (`/api/mcp`)

This document defines the MCP tool contracts for Projects Management following Principle 1 (Agentic-First Design).

## Tool Overview

| Tool Name              | Description                         | Priority |
| ---------------------- | ----------------------------------- | -------- |
| `create_project`       | Create a new project                | P1       |
| `list_projects`        | List projects for current user/team | P1       |
| `get_project`          | Get project details by slug or ID   | P1       |
| `update_project`       | Update project settings             | P1       |
| `archive_project`      | Archive/suspend a project           | P2       |
| `configure_agent`      | Enable/configure project agents     | P2       |
| `get_prioritized_work` | Get prioritized work items          | P1       |
| `list_project_specs`   | List indexed spec files             | P3       |
| `sync_project_specs`   | Trigger spec file sync              | P3       |

---

## Tool Definitions

### create_project

Creates a new project with repository links.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Project display name",
      "minLength": 1,
      "maxLength": 100
    },
    "slug": {
      "type": "string",
      "description": "URL-friendly slug (optional, auto-generated from name)",
      "pattern": "^[a-z0-9][a-z0-9-]*[a-z0-9]$"
    },
    "description": {
      "type": "string",
      "description": "Project description"
    },
    "teamId": {
      "type": "string",
      "description": "Team ID for ownership"
    },
    "repositoryIds": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Repository IDs to link",
      "minItems": 1
    },
    "primaryRepositoryId": {
      "type": "string",
      "description": "Primary repository ID (optional, defaults to first)"
    }
  },
  "required": ["name", "teamId", "repositoryIds"]
}
```

**Output Schema:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "project": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "slug": { "type": "string" },
        "fullName": { "type": "string" },
        "status": {
          "type": "string",
          "enum": ["active", "suspended", "archived"]
        },
        "createdAt": { "type": "string", "format": "date-time" }
      }
    },
    "error": { "type": "string" }
  }
}
```

**Example:**

```json
// Input
{
  "name": "Catalyst Web",
  "teamId": "team-123",
  "repositoryIds": ["repo-456", "repo-789"],
  "primaryRepositoryId": "repo-456"
}

// Output
{
  "success": true,
  "project": {
    "id": "proj-abc",
    "name": "Catalyst Web",
    "slug": "catalyst-web",
    "fullName": "ncrmro/catalyst-web",
    "status": "active",
    "createdAt": "2025-12-25T10:00:00Z"
  }
}
```

---

### list_projects

Lists projects accessible to the current user.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "teamId": {
      "type": "string",
      "description": "Filter by team (optional)"
    },
    "status": {
      "type": "string",
      "enum": ["active", "suspended", "archived", "all"],
      "default": "active",
      "description": "Filter by status"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20
    },
    "offset": {
      "type": "integer",
      "minimum": 0,
      "default": 0
    }
  }
}
```

**Output Schema:**

```json
{
  "type": "object",
  "properties": {
    "projects": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "slug": { "type": "string" },
          "description": { "type": "string" },
          "status": { "type": "string" },
          "teamName": { "type": "string" },
          "repositoryCount": { "type": "integer" },
          "openWorkItemCount": { "type": "integer" },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      }
    },
    "total": { "type": "integer" },
    "hasMore": { "type": "boolean" }
  }
}
```

---

### get_project

Gets detailed project information.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "description": "Project ID"
    },
    "slug": {
      "type": "string",
      "description": "Project slug (alternative to ID)"
    },
    "teamId": {
      "type": "string",
      "description": "Team ID (required if using slug)"
    },
    "includeRepositories": {
      "type": "boolean",
      "default": true
    },
    "includeAgents": {
      "type": "boolean",
      "default": true
    },
    "includeEnvironments": {
      "type": "boolean",
      "default": false
    }
  }
}
```

**Output Schema:**

```json
{
  "type": "object",
  "properties": {
    "project": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "slug": { "type": "string" },
        "fullName": { "type": "string" },
        "description": { "type": "string" },
        "status": { "type": "string" },
        "team": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" }
          }
        },
        "repositories": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "name": { "type": "string" },
              "fullName": { "type": "string" },
              "isPrimary": { "type": "boolean" },
              "connectionStatus": {
                "type": "string",
                "enum": ["connected", "disconnected"]
              }
            }
          }
        },
        "agents": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "agentType": { "type": "string" },
              "enabled": { "type": "boolean" },
              "lastRunAt": { "type": "string", "format": "date-time" }
            }
          }
        },
        "environments": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "environment": { "type": "string" },
              "latestDeployment": { "type": "string" }
            }
          }
        },
        "createdAt": { "type": "string", "format": "date-time" },
        "updatedAt": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

---

### update_project

Updates project settings.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "description": "Project ID"
    },
    "name": {
      "type": "string",
      "description": "New project name"
    },
    "description": {
      "type": "string",
      "description": "New description"
    },
    "addRepositoryIds": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Repository IDs to add"
    },
    "removeRepositoryIds": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Repository IDs to remove"
    },
    "primaryRepositoryId": {
      "type": "string",
      "description": "New primary repository"
    }
  },
  "required": ["projectId"]
}
```

**Output Schema:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "project": { "$ref": "#/definitions/Project" },
    "error": { "type": "string" }
  }
}
```

---

### archive_project

Archives or suspends a project.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "description": "Project ID"
    },
    "action": {
      "type": "string",
      "enum": ["suspend", "archive", "activate"],
      "description": "Lifecycle action"
    }
  },
  "required": ["projectId", "action"]
}
```

**Output Schema:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "project": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "status": { "type": "string" },
        "suspendedAt": { "type": "string", "format": "date-time" },
        "archivedAt": { "type": "string", "format": "date-time" }
      }
    },
    "error": { "type": "string" }
  }
}
```

---

### configure_agent

Enables and configures project agents.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "description": "Project ID"
    },
    "agentType": {
      "type": "string",
      "enum": ["platform", "project", "qa"],
      "description": "Agent type to configure"
    },
    "enabled": {
      "type": "boolean",
      "description": "Enable/disable agent"
    },
    "config": {
      "type": "object",
      "description": "Agent-specific configuration",
      "properties": {
        "testMaintenance": { "type": "boolean" },
        "dependencyUpdates": { "type": "boolean" },
        "ciImprovements": { "type": "boolean" },
        "conventionEnforcement": { "type": "boolean" },
        "prioritizationEnabled": { "type": "boolean" },
        "taskBreakdownEnabled": { "type": "boolean" },
        "smokeTestsEnabled": { "type": "boolean" },
        "testWritingEnabled": { "type": "boolean" }
      }
    },
    "maxExecutionsPerDay": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "dailyCostCapUsd": {
      "type": "string",
      "pattern": "^\\d+\\.\\d{2}$"
    }
  },
  "required": ["projectId", "agentType"]
}
```

**Output Schema:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "agent": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "agentType": { "type": "string" },
        "enabled": { "type": "boolean" },
        "config": { "type": "object" },
        "maxExecutionsPerDay": { "type": "integer" },
        "dailyCostCapUsd": { "type": "string" }
      }
    },
    "error": { "type": "string" }
  }
}
```

---

### get_prioritized_work

Gets prioritized work items for dashboard display.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "projectIds": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Filter by projects (optional, defaults to all accessible)"
    },
    "category": {
      "type": "string",
      "enum": ["feature", "platform", "bug", "docs", "all"],
      "default": "all",
      "description": "Filter by category"
    },
    "state": {
      "type": "string",
      "enum": ["open", "closed", "all"],
      "default": "open"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20
    },
    "offset": {
      "type": "integer",
      "minimum": 0,
      "default": 0
    },
    "sortBy": {
      "type": "string",
      "enum": ["priority", "created", "updated"],
      "default": "priority"
    }
  }
}
```

**Output Schema:**

```json
{
  "type": "object",
  "properties": {
    "workItems": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "itemType": {
            "type": "string",
            "enum": ["issue", "pull_request", "agent_task"]
          },
          "title": { "type": "string" },
          "description": { "type": "string" },
          "state": { "type": "string" },
          "status": { "type": "string" },
          "category": { "type": "string" },
          "labels": { "type": "array", "items": { "type": "string" } },
          "project": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "name": { "type": "string" },
              "slug": { "type": "string" }
            }
          },
          "repository": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "fullName": { "type": "string" }
            }
          },
          "externalUrl": { "type": "string" },
          "authorLogin": { "type": "string" },
          "assignees": { "type": "array", "items": { "type": "string" } },
          "priority": {
            "type": "object",
            "properties": {
              "score": { "type": "integer" },
              "factors": {
                "type": "object",
                "properties": {
                  "impact": { "type": "integer" },
                  "effort": { "type": "integer" },
                  "urgency": { "type": "integer" },
                  "alignment": { "type": "integer" },
                  "risk": { "type": "integer" }
                }
              },
              "appliedRules": { "type": "array", "items": { "type": "string" } }
            }
          },
          "createdAt": { "type": "string", "format": "date-time" },
          "updatedAt": { "type": "string", "format": "date-time" }
        }
      }
    },
    "summary": {
      "type": "object",
      "properties": {
        "totalOpen": { "type": "integer" },
        "byCategory": {
          "type": "object",
          "additionalProperties": { "type": "integer" }
        },
        "byProject": {
          "type": "object",
          "additionalProperties": { "type": "integer" }
        }
      }
    },
    "total": { "type": "integer" },
    "hasMore": { "type": "boolean" }
  }
}
```

---

### list_project_specs

Lists indexed specification files for a project.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "description": "Project ID"
    },
    "pattern": {
      "type": "string",
      "enum": ["RFC", "ADR", "SPEC", "PROPOSAL", "all"],
      "default": "all"
    },
    "specStatus": {
      "type": "string",
      "enum": ["draft", "review", "approved", "superseded", "all"],
      "default": "all"
    },
    "limit": {
      "type": "integer",
      "default": 50
    }
  },
  "required": ["projectId"]
}
```

**Output Schema:**

```json
{
  "type": "object",
  "properties": {
    "specs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "path": { "type": "string" },
          "name": { "type": "string" },
          "pattern": { "type": "string" },
          "title": { "type": "string" },
          "specStatus": { "type": "string" },
          "owner": { "type": "string" },
          "repository": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "fullName": { "type": "string" }
            }
          },
          "linkedIssues": { "type": "array", "items": { "type": "integer" } },
          "linkedPrs": { "type": "array", "items": { "type": "integer" } },
          "lastSyncedAt": { "type": "string", "format": "date-time" }
        }
      }
    },
    "total": { "type": "integer" }
  }
}
```

---

### sync_project_specs

Triggers a sync of spec files for a project.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "description": "Project ID"
    },
    "repositoryId": {
      "type": "string",
      "description": "Specific repository (optional, syncs all if not provided)"
    },
    "force": {
      "type": "boolean",
      "default": false,
      "description": "Force full rescan even if recently synced"
    }
  },
  "required": ["projectId"]
}
```

**Output Schema:**

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "syncResult": {
      "type": "object",
      "properties": {
        "specsFound": { "type": "integer" },
        "specsAdded": { "type": "integer" },
        "specsUpdated": { "type": "integer" },
        "specsRemoved": { "type": "integer" }
      }
    },
    "error": { "type": "string" }
  }
}
```

---

## Error Handling

All tools return errors in a consistent format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "errorCode": "ERROR_CODE",
  "details": {}
}
```

**Common Error Codes:**

| Code               | Description             |
| ------------------ | ----------------------- |
| `NOT_FOUND`        | Resource not found      |
| `UNAUTHORIZED`     | User lacks permission   |
| `VALIDATION_ERROR` | Invalid input           |
| `CONFLICT`         | Resource already exists |
| `RATE_LIMITED`     | Too many requests       |
| `EXTERNAL_ERROR`   | GitHub/GitLab API error |

## Authentication

All MCP tools require valid session authentication. The current user's team memberships determine accessible projects and operations.
