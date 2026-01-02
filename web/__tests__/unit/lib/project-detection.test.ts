import { describe, it, expect, vi } from "vitest";
import {
  detectProjectType,
  type FileSystemAdapter,
} from "@/lib/project-detection";

class MockFileSystem implements FileSystemAdapter {
  files: Record<string, string> = {};

  constructor(files: Record<string, string> = {}) {
    this.files = files;
  }

  async exists(path: string): Promise<boolean> {
    return path in this.files;
  }

  async read(path: string): Promise<string | null> {
    return this.files[path] || null;
  }
}

describe("detectProjectType", () => {
  it("detects Docker Compose projects", async () => {
    const fs = new MockFileSystem({
      "docker-compose.yml": "services: ...",
    });
    const result = await detectProjectType(fs);
    expect(result.type).toBe("docker");
    expect(result.devCommand).toBe("docker compose up");
    expect(result.confidence).toBe(1.0);
  });

  it("detects Node.js npm projects with dev script", async () => {
    const fs = new MockFileSystem({
      "package.json": JSON.stringify({ scripts: { dev: "next dev" } }),
      "package-lock.json": "...",
    });
    const result = await detectProjectType(fs);
    expect(result.type).toBe("node");
    expect(result.devCommand).toBe("npm run dev");
    expect(result.confidence).toBe(0.9);
  });

  it("detects Node.js pnpm projects with start script", async () => {
    const fs = new MockFileSystem({
      "package.json": JSON.stringify({ scripts: { start: "node server.js" } }),
      "pnpm-lock.yaml": "...",
    });
    const result = await detectProjectType(fs);
    expect(result.type).toBe("node");
    expect(result.devCommand).toBe("pnpm start");
  });

  it("detects Go projects", async () => {
    const fs = new MockFileSystem({
      "go.mod": "module github.com/foo/bar",
    });
    const result = await detectProjectType(fs);
    expect(result.type).toBe("go");
    expect(result.devCommand).toBe("go run .");
  });

  it("detects Python projects", async () => {
    const fs = new MockFileSystem({
      "requirements.txt": "flask",
    });
    const result = await detectProjectType(fs);
    expect(result.type).toBe("python");
    // devCommand is undefined for python
  });

  it("handles monorepos with workdir", async () => {
    const fs = new MockFileSystem({
      "apps/web/package.json": JSON.stringify({ scripts: { dev: "next dev" } }),
    });
    const result = await detectProjectType(fs, "apps/web");
    expect(result.type).toBe("node");
    expect(result.devCommand).toBe("npm run dev");
  });

  it("returns unknown when no indicators found", async () => {
    const fs = new MockFileSystem({
      "README.md": "# Hello",
    });
    const result = await detectProjectType(fs);
    expect(result.type).toBe("unknown");
    expect(result.confidence).toBe(0.0);
  });
});
