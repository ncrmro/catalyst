#!/usr/bin/env python3
"""
Run TypeScript type checking on Stop event, but only if .ts/.tsx files were modified.
Uses git to detect changed files.
"""
import sys
import subprocess
import os

def main():
    try:
        # Change to workspace directory if specified
        workspace_dir = os.environ.get('CLAUDE_WORKSPACE_DIR')
        if workspace_dir:
            os.chdir(workspace_dir)
        # Get list of modified files using git
        result = subprocess.run(
            ['git', 'diff', '--name-only', 'HEAD'],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode != 0:
            # If git command fails, skip type checking
            print("⚠ Could not check git status, skipping type check", file=sys.stderr)
            sys.exit(0)

        # Check if any TypeScript files were modified
        modified_files = result.stdout.strip().split('\n')
        has_ts_files = any(
            f.endswith(('.ts', '.tsx'))
            for f in modified_files
            if f  # Skip empty strings
        )

        if not has_ts_files:
            # No TypeScript files modified, skip type checking
            sys.exit(0)

        # Run TypeScript type checking
        print("TypeScript files modified, running type check...")
        result = subprocess.run(
            ['npx', 'tsc', '--noEmit'],
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode == 0:
            print("✓ Type check passed")
            sys.exit(0)
        else:
            # Type errors found
            print("Type check failed:", file=sys.stderr)
            print(result.stdout, file=sys.stderr)
            if result.stderr:
                print(result.stderr, file=sys.stderr)
            sys.exit(2)

    except subprocess.TimeoutExpired:
        print("⚠ Type check timed out", file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print(f"Error in typecheck-on-stop hook: {e}", file=sys.stderr)
        sys.exit(2)

if __name__ == '__main__':
    main()
