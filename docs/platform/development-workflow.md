# Development Workflow

This document describes the development workflow, including code quality checks, pre-commit hooks, and AI agent integration.

## Functional Specification

### Purpose

Provide unified code quality checks across all development entry points (Git commits, Claude Code sessions, Gemini CLI sessions) using a single central script.

### Requirements

1. **Central Script** (`bin/precommit`):
   - Run code formatting and linting
   - Run static type checking
   - Run unit tests
   - Exit with non-zero status if any check fails
   - Resolve symlinks to work when called via symlink

2. **Git Pre-commit Hook** (`web/.husky/pre-commit`):
   - Symlink to `../../bin/precommit`
   - Block commits if checks fail

3. **Claude Code Stop Hook** (`.claude/hooks/pre-commit-on-stop.sh`):
   - Symlink to `../../bin/precommit`
   - Run when Claude session ends
   - 180 second timeout

4. **Gemini CLI Stop Hook** (`.gemini/hooks/pre-commit-on-stop.sh`):
   - Symlink to `../../bin/precommit`
   - Run when Gemini session ends
   - 180 second timeout

5. **Biome Configuration** (`web/biome.json`):
   - Include only: `src/**`, `packages/**`, `__tests__/**`
   - Use VCS ignore file integration
   - Tab indentation, double quotes

### Non-Requirements

- No per-file formatting during editing (removed format-and-lint.py)
- No separate linting step (Biome handles both formatting and linting)

## Overview

The project uses a unified approach to code quality:

- **Biome** handles both code formatting and linting
- **Husky** manages Git pre-commit hooks
- **TypeScript** provides type safety
- **Unit tests** verify functionality
- **Claude Code** and **Gemini CLI** hooks ensure comprehensive checks when sessions end

All three paths (Git pre-commit, Claude stop hook, Gemini stop hook) delegate to a central `bin/precommit` script, ensuring consistent quality checks across all entry points.

## Git Pre-commit Hook

**Location**: `web/.husky/pre-commit`

**Purpose**: Ensure code quality before commits are saved to Git.

**What runs**: Delegates to `bin/precommit` which executes:
1. Biome formatting and linting (`biome check --apply`)
2. TypeScript type checking (`tsc --noEmit`)
3. Unit tests (`npm run test:unit`)

**How to bypass**: Use `git commit --no-verify` (use cautiously - bypasses all quality checks)

## Central Pre-commit Script

**Location**: `bin/precommit`

**Purpose**: Shared entry point for all pre-commit checks (Git, Claude Code, Gemini CLI)

**What runs**:
```bash
cd web
npx biome check --apply .    # Format and lint all files
npx tsc --noEmit             # Type checking
npm run test:unit            # Unit tests
```

**Why centralized**: Single source of truth ensures Git, Claude, and Gemini all run identical checks. This eliminates drift between different entry points and guarantees consistent code quality standards.

## Claude Code Hooks

### Post-Tool Hook (Deprecated)

Previously, we had a post-tool hook (`format-and-lint.py`) that ran after file edits. This has been removed since:
- Immediate feedback during editing is less critical than comprehensive checks at session end
- The central `bin/precommit` script handles formatting at stop time
- Reduces complexity and redundancy

### Stop Hook

**Location**: `.claude/hooks/pre-commit-on-stop.sh` (symlink to `../../bin/precommit`)

**Event**: Fires when a Claude Code session ends

**Purpose**: Run comprehensive code quality checks before session concludes

**What runs**: Delegates to `bin/precommit`:
- Biome formatting and linting
- TypeScript type checking
- Unit tests

**Input**: No arguments passed to stop hooks

**Timeout**: 180 seconds

**Configuration**: Defined in `/.claude/settings.json`

**Hook Documentation**: https://code.claude.com/docs/en/hooks-guide

## Gemini CLI Hooks

### Stop Hook

**Location**: `.gemini/hooks/pre-commit-on-stop.sh` (symlink to `../../bin/precommit`)

**Event**: Fires when a Gemini CLI session ends

**Purpose**: Ensure consistent code quality standards when using Gemini

**What runs**: Same as Claude stop hook (Biome + TypeScript + unit tests)

**Input**: Gemini may pass different event arguments than Claude - see official documentation for specifics

**Timeout**: 180 seconds (same as Claude)

**Note**: Both Claude and Gemini hooks are symlinks to the same `bin/precommit` script, guaranteeing identical behavior

**Hook Documentation**: https://geminicli.com/docs/hooks/reference/

## Hook Arguments and Event Data

### Claude Code Hooks

Claude hooks receive JSON input via stdin containing tool context:
- **PostToolUse events**: Receive `file_path` and operation type from the triggering tool
- **Stop events**: May receive minimal or no event-specific data

See https://code.claude.com/docs/en/hooks-guide for complete argument specification and event schemas.

### Gemini CLI Hooks

Gemini hooks may receive different arguments and event metadata than Claude hooks. The exact format depends on the specific hook event type and Gemini CLI version.

**Important**: Verify the official Gemini CLI documentation at https://geminicli.com/docs/hooks/reference/ for what arguments are passed to stop hooks and how to access them.

## Functionality Changes

### What We Gained

**Old Claude Stop Hook** (`typecheck-on-stop.py`):
- Ran: TypeScript type checking only

**New Unified Stop Hook** (both Claude and Gemini):
- Runs: Full Biome formatting and linting + TypeScript type checking + unit tests
- Benefit: Comprehensive validation before session ends

### What Stays the Same

- TypeScript type checking is still performed (critical for type safety)
- Type checking runs before unit tests (faster feedback on syntax/type errors)

## Manual Commands

If you need to run these checks manually:

```bash
# Format and lint with Biome (single file or directory)
cd web
npx biome check --apply .

# Type check with TypeScript
npm run typecheck

# Run unit tests
npm run test:unit

# Run full pre-commit pipeline
../bin/precommit
```

## Biome Configuration

**Location**: `web/biome.json`

**Scope**: Provides both formatting and linting rules for TypeScript, JavaScript, JSON, and Markdown files

**Ignored paths**:
- `.storybook/` - Storybook configuration and stories
- `.next/` - Next.js build output
- `dist/`, `build/` - Build artifacts
- `node_modules/` - Dependencies
- `.git/` - Git metadata
- `.venv/` - Python virtual environment
- `coverage/` - Test coverage reports
- `.cache/` - Cache directories
- `drizzle/` - Database migrations metadata
- `fixtures/` - Test fixtures

## Troubleshooting

### Hook Fails with Biome Error

1. Run `cd web && npx biome check --apply .` to see full error output
2. Common issues:
   - File encoding problems (ensure UTF-8)
   - Syntax errors in code
   - Configuration conflicts (check `biome.json`)
3. Fix the issues and commit again

### Hook Fails with TypeScript Error

1. Run `npm run typecheck` to see full TypeScript diagnostics
2. Address type errors in the code
3. Commit again after fixes

### Hook Fails with Test Error

1. Run `npm run test:unit` to see which tests fail
2. Either fix the code or update tests as appropriate
3. Run hook again or commit with `--no-verify` if you need to bypass (not recommended)

### Hook Not Running

**Claude Code**:
- Check that `.claude/settings.json` contains the Stop hook configuration
- Verify the hook file exists at `.claude/hooks/pre-commit-on-stop.sh`
- Review https://code.claude.com/docs/en/hooks-guide for hook configuration

**Gemini CLI**:
- Check that Gemini is configured to run hooks
- Verify the symlink `.claude/hooks/gemini-stop.sh` points to `pre-commit-on-stop.sh`
- Review https://geminicli.com/docs/hooks/reference/ for Gemini-specific hook setup

### Resuming After Hook Failure

Option 1: Fix the issues and try again (recommended)
```bash
# Fix issues in your code
# Then either:
git commit -m "your message"      # Re-run hooks automatically
# Or:
git commit --no-verify -m "..."   # Skip hooks (use cautiously)
```

Option 2: Use `--no-verify` to bypass hooks temporarily
```bash
git commit --no-verify -m "your message"
```

**Note**: Bypassing hooks should only be done in exceptional cases. It's better to fix the underlying issues.

## Development Tips

- **Run tests frequently**: Use `npm run test:watch` during development for quick feedback
- **Use TypeScript**: Lean on type checking to catch errors early
- **Check formatting locally**: Run `npx biome check --apply .` before committing
- **Review hook output**: Pay attention to hook output messages when they run

## See Also

- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide)
- [Gemini CLI Hooks Reference](https://geminicli.com/docs/hooks/reference/)
- [Biome Documentation](https://biomejs.dev/)
- `CLAUDE.md` - Project-wide development guidance
- `web/CLAUDE.md` - Web application specific guidance
