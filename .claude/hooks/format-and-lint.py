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
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)
        file_path = input_data.get('tool_input', {}).get('file_path', '')

        if not file_path:
            sys.exit(0)

        # Check if file exists
        if not os.path.exists(file_path):
            sys.exit(0)

        # Check if file matches our patterns
        should_format = file_path.endswith(FORMAT_PATTERNS)
        should_lint = file_path.endswith(LINT_PATTERNS)

        if not should_format:
            sys.exit(0)

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
                print(f"⚠ Prettier warning for {file_path}: {result.stderr}", file=sys.stderr)
        except subprocess.TimeoutExpired:
            print(f"⚠ Prettier timed out for {file_path}", file=sys.stderr)
        except Exception as e:
            print(f"⚠ Prettier error for {file_path}: {e}", file=sys.stderr)

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
                    # ESLint returns non-zero for warnings/errors, but that's okay
                    if result.stdout:
                        print(f"ESLint output for {file_path}:\n{result.stdout}")
            except subprocess.TimeoutExpired:
                print(f"⚠ ESLint timed out for {file_path}", file=sys.stderr)
            except Exception as e:
                print(f"⚠ ESLint error for {file_path}: {e}", file=sys.stderr)

        sys.exit(0)

    except Exception as e:
        print(f"Error in format-and-lint hook: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
