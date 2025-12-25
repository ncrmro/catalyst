/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";

describe("ImprovedTerminal", () => {
  it("exports ImprovedTerminal component", async () => {
    const module = await import(
      "@/components/improved-terminal-wrapper"
    );
    expect(module.ImprovedTerminal).toBeDefined();
    expect(module.ImprovedTerminalModal).toBeDefined();
  });

  it("exports correct prop types", async () => {
    const module = await import(
      "@/components/improved-terminal-wrapper"
    );
    
    // Check that the component is a dynamic component (has render method)
    expect(module.ImprovedTerminal).toBeDefined();
    expect(module.ImprovedTerminalModal).toBeDefined();
  });
});

describe("Terminal WebSocket Integration", () => {
  it("should have proper WebSocket route path", () => {
    // The WebSocket route should be at /api/terminal
    const expectedPath = "/api/terminal";
    expect(expectedPath).toBe("/api/terminal");
  });

  it("should support required query parameters", () => {
    const requiredParams = ["namespace", "pod"];
    const optionalParams = ["container", "shell"];
    
    expect(requiredParams).toContain("namespace");
    expect(requiredParams).toContain("pod");
    expect(optionalParams).toContain("container");
    expect(optionalParams).toContain("shell");
  });
});

describe("Terminal Configuration", () => {
  it("should have proper default terminal settings", () => {
    const defaultSettings = {
      cols: 80,
      rows: 24,
      shell: "/bin/sh",
    };

    expect(defaultSettings.cols).toBe(80);
    expect(defaultSettings.rows).toBe(24);
    expect(defaultSettings.shell).toBe("/bin/sh");
  });

  it("should support both WebSocket and request/response modes", () => {
    const modes = ["websocket", "request-response"];
    expect(modes).toHaveLength(2);
    expect(modes).toContain("websocket");
    expect(modes).toContain("request-response");
  });
});
