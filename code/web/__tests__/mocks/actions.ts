import { vi } from "vitest";

/**
 * Mock server actions for Storybook stories
 *
 * These mocks allow stories to simulate server action behavior without
 * requiring authentication or actual server calls.
 */

/**
 * Creates a mock execCommand server action for testing terminal interactions
 *
 * Simulates realistic command execution with network latency and
 * appropriate responses for common shell commands.
 *
 * Usage in stories:
 *   const mockExec = createMockExecCommand();
 *   <Terminal onExec={mockExec} />
 *
 * Usage in tests:
 *   const mockExec = createMockExecCommand();
 *   expect(mockExec).toHaveBeenCalledWith('namespace', 'pod', 'ls', 'container');
 */
export function createMockExecCommand() {
  return vi.fn(
    async (
      _namespace: string,
      _podName: string,
      command: string,
      _containerName?: string,
    ): Promise<{ stdout: string; stderr: string }> => {
      // Simulate realistic network latency (300-1000ms)
      await new Promise((resolve) =>
        setTimeout(resolve, 300 + Math.random() * 700),
      );

      // Simulate common shell commands
      if (command.trim().startsWith("ls")) {
        return {
          stdout:
            "app\nnode_modules\npackage.json\npackage-lock.json\nsrc\nREADME.md\ntsconfig.json\n.next\n",
          stderr: "",
        };
      }

      if (command.trim().startsWith("pwd")) {
        return {
          stdout: "/workspace\n",
          stderr: "",
        };
      }

      if (command.trim().startsWith("whoami")) {
        return {
          stdout: "node\n",
          stderr: "",
        };
      }

      if (command.trim().startsWith("echo")) {
        const message = command.replace(/^echo\s+/, "").replace(/["']/g, "");
        return {
          stdout: `${message}\n`,
          stderr: "",
        };
      }

      if (command.trim().startsWith("cat")) {
        const filename = command.split(" ")[1];
        if (filename === "package.json") {
          return {
            stdout:
              JSON.stringify(
                {
                  name: "workspace",
                  version: "1.0.0",
                  description: "Preview environment workspace",
                  main: "index.js",
                  scripts: {
                    dev: "next dev",
                    build: "next build",
                    start: "next start",
                  },
                },
                null,
                2,
              ) + "\n",
            stderr: "",
          };
        }
        return {
          stdout: "",
          stderr: `cat: ${filename}: No such file or directory\n`,
        };
      }

      if (command.trim() === "env" || command.trim().startsWith("env ")) {
        return {
          stdout:
            "NODE_ENV=development\nAPI_URL=https://api.example.com\nLOG_LEVEL=info\nPORT=3000\n",
          stderr: "",
        };
      }

      if (command.trim().startsWith("node")) {
        if (command.includes("--version") || command.includes("-v")) {
          return {
            stdout: "v20.11.0\n",
            stderr: "",
          };
        }
        return {
          stdout:
            'Welcome to Node.js v20.11.0.\nType ".help" for more information.\n> ',
          stderr: "",
        };
      }

      if (command.trim().startsWith("npm")) {
        if (command.includes("--version") || command.includes("-v")) {
          return {
            stdout: "10.2.4\n",
            stderr: "",
          };
        }
        return {
          stdout: "",
          stderr:
            "npm error Usage: npm <command>\nnpm error See 'npm help' for more info\n",
        };
      }

      if (command.trim().startsWith("git status")) {
        return {
          stdout:
            "On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean\n",
          stderr: "",
        };
      }

      if (command.trim().startsWith("git")) {
        if (command.includes("--version") || command.includes("-v")) {
          return {
            stdout: "git version 2.43.0\n",
            stderr: "",
          };
        }
        return {
          stdout: "",
          stderr: "git: missing command\nSee 'git --help'\n",
        };
      }

      if (command.trim() === "help" || command.trim() === "--help") {
        return {
          stdout:
            "Available commands:\n  ls - list directory contents\n  pwd - print working directory\n  whoami - print effective user name\n  echo - display a line of text\n  cat - concatenate files and print\n  env - display environment variables\n  node - run Node.js\n  npm - package manager\n  git - version control\n",
          stderr: "",
        };
      }

      if (command.trim() === "exit" || command.trim() === "quit") {
        return {
          stdout: "Goodbye!\n",
          stderr: "",
        };
      }

      if (command.trim() === "clear" || command.trim() === "cls") {
        return {
          stdout: "\x1b[2J\x1b[H",
          stderr: "",
        };
      }

      // Simulate command not found for unknown commands
      const cmdName = command.trim().split(" ")[0];
      return {
        stdout: "",
        stderr: `bash: ${cmdName}: command not found\n`,
      };
    },
  );
}

/**
 * Creates a mock execCommand that always fails with authentication error
 *
 * Useful for testing error states in stories.
 *
 * Usage:
 *   const mockExec = createUnauthorizedExecCommand();
 *   <Terminal onExec={mockExec} />
 */
export function createUnauthorizedExecCommand() {
  return vi.fn(async () => {
    throw new Error("Not authenticated");
  });
}

/**
 * Creates a mock execCommand that simulates slow responses
 *
 * Useful for testing loading states and timeouts.
 *
 * Usage:
 *   const mockExec = createSlowExecCommand(5000); // 5 second delay
 *   <Terminal onExec={mockExec} />
 */
export function createSlowExecCommand(delayMs: number = 3000) {
  return vi.fn(
    async (
      _namespace: string,
      _podName: string,
      _command: string,
      _containerName?: string,
    ): Promise<{ stdout: string; stderr: string }> => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return {
        stdout: `Command executed after ${delayMs}ms delay\n`,
        stderr: "",
      };
    },
  );
}
