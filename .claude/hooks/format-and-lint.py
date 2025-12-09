#!/usr/bin/env python3
"""
Format and lint code files after Write/Edit operations.
Runs prettier first, then eslint on relevant files.
"""
import json
import sys
import os
import subprocess

# File patterns that should be formatted
FORMAT_PATTERNS = ('.ts', '.tsx', '.js', '.jsx', '.md', '.json')

# File patterns that should be linted
LINT_PATTERNS = ('.ts', '.tsx', '.js', '.jsx')

def main():
    try:
        # Change to workspace directory if specified
        workspace_dir = os.environ.get('CLAUDE_WORKSPACE_DIR')
        if workspace_dir:
            os.chdir(workspace_dir)

        # Read JSON input from stdin
        input_data = json.load(sys.stdin)
        file_path = input_data.get('tool_input', {}).get('file_path', '')

        # If no file_path (e.g., Stop event), format all modified files
        if not file_path:
            # Get list of modified files using git
            result = subprocess.run(
                ['git', 'diff', '--name-only', 'HEAD'],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode != 0:
                sys.exit(0)

            modified_files = [
                f for f in result.stdout.strip().split('\n')
                if f and f.endswith(FORMAT_PATTERNS)
            ]

            if not modified_files:
                sys.exit(0)

            # Track failures
            has_failures = False

            # Format and lint all modified files
            for file_path in modified_files:
                if not os.path.exists(file_path):
                    continue

                should_lint = file_path.endswith(LINT_PATTERNS)

                # Run prettier
                try:
                    result = subprocess.run(
                        ['npx', 'prettier', '--write', file_path],
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                    if result.returncode == 0:
                        print(f"✓ Formatted {file_path}")
                    else:
                        print(f"⚠ Prettier failed for {file_path}: {result.stderr}", file=sys.stderr)
                        has_failures = True
                except subprocess.TimeoutExpired:
                    print(f"⚠ Prettier timed out for {file_path}", file=sys.stderr)
                    has_failures = True
                except Exception as e:
                    print(f"⚠ Prettier error for {file_path}: {e}", file=sys.stderr)
                    has_failures = True

                # Run eslint if applicable
                if should_lint:
                    try:
                        result = subprocess.run(
                            ['npx', 'eslint', '--fix', file_path],
                            capture_output=True,
                            text=True,
                            timeout=30
                        )
                        if result.returncode == 0:
                            print(f"✓ Linted {file_path}")
                        else:
                            if result.stdout:
                                print(f"ESLint failed for {file_path}:\n{result.stdout}", file=sys.stderr)
                            has_failures = True
                    except subprocess.TimeoutExpired:
                        print(f"⚠ ESLint timed out for {file_path}", file=sys.stderr)
                        has_failures = True
                    except Exception as e:
                        print(f"⚠ ESLint error for {file_path}: {e}", file=sys.stderr)
                        has_failures = True

            sys.exit(2 if has_failures else 0)

        # Check if file exists
        if not os.path.exists(file_path):
            sys.exit(0)

        # Check if file matches our patterns
        should_format = file_path.endswith(FORMAT_PATTERNS)
        should_lint = file_path.endswith(LINT_PATTERNS)

        if not should_format:
            sys.exit(0)

        # Track failures
        has_failures = False

        # Run prettier first
        try:
            result = subprocess.run(
                ['npx', 'prettier', '--write', file_path],
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode == 0:
                print(f"✓ Formatted {file_path}")
            else:
                print(f"⚠ Prettier failed for {file_path}: {result.stderr}", file=sys.stderr)
                has_failures = True
        except subprocess.TimeoutExpired:
            print(f"⚠ Prettier timed out for {file_path}", file=sys.stderr)
            has_failures = True
        except Exception as e:
            print(f"⚠ Prettier error for {file_path}: {e}", file=sys.stderr)
            has_failures = True

        # Run eslint if applicable
        if should_lint:
            try:
                result = subprocess.run(
                    ['npx', 'eslint', '--fix', file_path],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                if result.returncode == 0:
                    print(f"✓ Linted {file_path}")
                else:
                    if result.stdout:
                        print(f"ESLint failed for {file_path}:\n{result.stdout}", file=sys.stderr)
                    has_failures = True
            except subprocess.TimeoutExpired:
                print(f"⚠ ESLint timed out for {file_path}", file=sys.stderr)
                has_failures = True
            except Exception as e:
                print(f"⚠ ESLint error for {file_path}: {e}", file=sys.stderr)
                has_failures = True

        sys.exit(2 if has_failures else 0)

    except Exception as e:
        print(f"Error in format-and-lint hook: {e}", file=sys.stderr)
        sys.exit(2)

if __name__ == '__main__':
    main()
