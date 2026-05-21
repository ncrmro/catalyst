# Environment Configuration UX Improvement

**Date**: 2026-01-13
**Issue**: Current configuration UI shows too many options at once, lacks directory selection, and doesn't show detected files.

## Current Problems

1. ❌ **No directory selection** - Users can't specify search directory for monorepos
2. ❌ **No re-detection** - Changing directory doesn't trigger new detection
3. ❌ **No file visibility** - Users don't see _what files_ were detected
4. ❌ **Information overload** - Managed services and resources shown immediately
5. ❌ **No source manifest choice** - Users can't see/choose between multiple detected sources

## Proposed Solution: Progressive Disclosure

### Step 1: Detection & Source Selection (PRIMARY)

**Goal**: Auto-detect sources and let user pick or configure

```
┌─────────────────────────────────────────────────────┐
│ 🔍 Detect Project Configuration                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Search Directory:                                    │
│ ┌─────────────────────────────────┐ 🔄 Re-detect   │
│ │ /                               │                 │
│ └─────────────────────────────────┘                 │
│                                                      │
│ 📁 Detected Files:                                  │
│ ✓ docker-compose.yml                                │
│ ✓ Dockerfile                                        │
│ ✓ package.json (dev script: "next dev")            │
│ ✓ Makefile (dev target found)                       │
│                                                      │
│ 🎯 Recommended Configuration:                       │
│ ┌─────────────────────────────────────────┐         │
│ │ ✓ Docker Compose (Highest Priority)     │         │
│ │   - File: docker-compose.yml            │         │
│ │   - Dev command: docker compose up      │         │
│ │   - Confidence: High                    │         │
│ └─────────────────────────────────────────┘         │
│                                                      │
│ Other Options:                                       │
│ ○ Dockerfile                                        │
│ ○ Node.js (package.json dev script)                 │
│ ○ Manual configuration                              │
│                                                      │
│         [Continue with Docker Compose]              │
└─────────────────────────────────────────────────────┘
```

**Key Features**:

- ✅ **Directory input** with default "/"
- ✅ **Re-detect button** triggers new detection at specified path
- ✅ **File list** showing what was found
- ✅ **Radio selection** between detected options
- ✅ **Confidence badges** (High/Medium/Low)
- ✅ **Manual override** option

### Step 2: Basic Configuration (ESSENTIAL)

**Goal**: Only show essential deployment settings

```
┌─────────────────────────────────────────────────────┐
│ ⚙️  Deployment Configuration                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Source: docker-compose.yml                          │
│ Dev Command: docker compose up                      │
│                                                      │
│ Environment Variables:                              │
│ ┌─────────────────────────────────────────┐         │
│ │ + Add variable                          │         │
│ └─────────────────────────────────────────┘         │
│                                                      │
│ ▼ Advanced Options (Click to expand)               │
│                                                      │
│                   [Save Configuration]              │
└─────────────────────────────────────────────────────┘
```

### Step 3: Advanced Options (COLLAPSED BY DEFAULT)

**Goal**: Hide complexity until needed

```
┌─────────────────────────────────────────────────────┐
│ ▼ Advanced Options                                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│ ▶ Managed Services                                  │
│   (postgres, redis, opensearch)                     │
│                                                      │
│ ▶ Resource Limits                                   │
│   (CPU, memory, replicas)                           │
│                                                      │
│ ▶ Image Configuration                               │
│   (registry, build settings, tag pattern)           │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Detection Step Component

**File**: `web/src/app/(dashboard)/projects/[slug]/platform/_components/detection-step.tsx`

**Features**:

- Directory input field (default: "/")
- "Re-detect" button with loading state
- Detected files list with icons
- Radio buttons for detected sources
- Confidence badges
- "Manual configuration" option

**Server Action**:

```typescript
// web/src/actions/project-detection.ts
export async function reDetectProject(
  projectId: string,
  repoId: string,
  repoFullName: string,
  environmentName: string,
  workdir: string, // NEW: user-specified directory
): Promise<{
  success: boolean;
  config?: EnvironmentConfig;
  detectedFiles?: string[]; // NEW: list of files found
  error?: string;
}>;
```

### Phase 2: Collapsible Sections

**Refactor**: `deployment-config-form.tsx` and `development-config-form.tsx`

**Pattern**:

```typescript
<Collapsible defaultOpen={false}>
  <CollapsibleTrigger>
    ▶ Managed Services
  </CollapsibleTrigger>
  <CollapsibleContent>
    <ManagedServicesForm ... />
  </CollapsibleContent>
</Collapsible>
```

### Phase 3: Integration

**Update**: `detection-wrapper.tsx`

1. First render: Show `DetectionStep` with auto-detection results
2. User selects source or changes directory
3. On selection: Show basic config form with advanced sections collapsed

## User Flow

### Scenario 1: Monorepo - Frontend in /web

1. User opens Platform page
2. Detection runs on "/" (finds root package.json)
3. User changes directory to "/web"
4. Clicks "Re-detect"
5. New detection runs on "/web" directory
6. Shows web-specific files (Next.js detected)
7. User selects "Node.js" option
8. Proceeds to basic configuration

### Scenario 2: Multiple Options Available

1. Detection finds: `docker-compose.yml`, `Dockerfile`, `package.json`
2. System recommends: "Docker Compose (Highest Priority)"
3. User sees all 3 options with confidence levels
4. User can choose Dockerfile instead if preferred
5. Configuration updates based on selection

### Scenario 3: Nothing Detected

1. Detection finds no recognized patterns
2. Shows: "No configuration detected"
3. Lists files found for debugging
4. Offers "Manual configuration" button
5. User specifies deployment method manually

## Benefits

✅ **Reduced cognitive load** - One decision at a time
✅ **Transparent detection** - See what files were found
✅ **Flexible for monorepos** - Change search directory
✅ **Re-detection on demand** - Update when structure changes
✅ **Progressive disclosure** - Hide advanced options
✅ **Clear recommendations** - System guides user to best choice

## Success Metrics

- **Time to configure**: < 30 seconds for standard projects
- **Re-detection usage**: >40% of users change directory
- **Manual override rate**: <10% (most trust auto-detection)
- **Advanced options usage**: <25% expand advanced sections

## Implementation Checklist

- [ ] Create `DetectionStep` component with directory selector
- [ ] Add `reDetectProject` server action with `detectedFiles` return value
- [ ] Update `runProjectDetection` to return file list
- [ ] Add collapsible sections to config forms
- [ ] Refactor `DetectionWrapper` to show step-by-step flow
- [ ] Update `DeploymentConfigForm` to hide advanced sections
- [ ] Update `DevelopmentConfigForm` to match pattern
- [ ] Add loading states for re-detection
- [ ] Add validation for directory path
- [ ] Write tests for detection step interaction
