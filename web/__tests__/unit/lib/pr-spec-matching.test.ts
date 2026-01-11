import { describe, it, expect } from "vitest";
import {
  tokenizeSpecName,
  matchPRToSpec,
  isPRChore,
  groupPRsBySpecAndType,
} from "@/lib/pr-spec-matching";
import type { PullRequest } from "@/types/reports";

describe("tokenizeSpecName", () => {
  it("splits spec name on hyphens", () => {
    const tokens = tokenizeSpecName("009-projects");
    expect(tokens).toContain("009");
    expect(tokens).toContain("projects");
  });

  it("handles multiple hyphens", () => {
    const tokens = tokenizeSpecName("001-auth-system");
    expect(tokens).toContain("001");
    expect(tokens).toContain("auth");
    expect(tokens).toContain("system");
  });

  it("filters out single character tokens", () => {
    const tokens = tokenizeSpecName("001-a-feature");
    expect(tokens).toContain("001");
    expect(tokens).toContain("feature");
    expect(tokens).not.toContain("a");
  });

  it("handles spec names without hyphens", () => {
    const tokens = tokenizeSpecName("projects");
    expect(tokens).toContain("projects");
  });

  it("generates singular variants by removing trailing 's'", () => {
    const tokens = tokenizeSpecName("009-projects");
    expect(tokens).toContain("projects");
    expect(tokens).toContain("project");
  });

  it("generates singular variants for multiple tokens", () => {
    const tokens = tokenizeSpecName("001-environments");
    expect(tokens).toContain("environments");
    expect(tokens).toContain("environment");
  });

  it("does not remove trailing 's' from 2-character tokens", () => {
    const tokens = tokenizeSpecName("001-as");
    // "as" should remain as-is, not become "a" (single char)
    expect(tokens).toContain("001");
    expect(tokens).toContain("as");
    expect(tokens).not.toContain("a");
  });

  it("handles tokens that don't end in 's'", () => {
    const tokens = tokenizeSpecName("001-auth-system");
    expect(tokens).toContain("auth");
    expect(tokens).toContain("system");
    // These don't have singular variants added
    expect(tokens.filter((t) => t === "auth")).toHaveLength(1);
  });
});

describe("matchPRToSpec (FR-022)", () => {
  const specIds = ["009-projects", "001-auth-system", "002-recipes"];

  describe("exact spec ID matching (highest priority)", () => {
    it("matches exact spec ID in conventional commit format", () => {
      expect(matchPRToSpec("feat(009-projects): add dashboard", specIds)).toBe(
        "009-projects",
      );
    });

    it("matches exact spec ID in bracket format", () => {
      expect(matchPRToSpec("[001-auth-system] fix login", specIds)).toBe(
        "001-auth-system",
      );
    });

    it("matches exact spec ID anywhere in title", () => {
      expect(matchPRToSpec("Add feature for 002-recipes", specIds)).toBe(
        "002-recipes",
      );
    });
  });

  describe("tokenized matching", () => {
    it("matches by spec number token", () => {
      expect(matchPRToSpec("feat: 009 dashboard improvements", specIds)).toBe(
        "009-projects",
      );
    });

    it("matches by spec name token", () => {
      expect(matchPRToSpec("Add projects listing page", specIds)).toBe(
        "009-projects",
      );
    });

    it("matches by any token in multi-word spec", () => {
      expect(matchPRToSpec("Fix auth timeout issue", specIds)).toBe(
        "001-auth-system",
      );
      expect(matchPRToSpec("Update system settings", specIds)).toBe(
        "001-auth-system",
      );
    });

    it("matches case-insensitively", () => {
      expect(matchPRToSpec("Add RECIPES page", specIds)).toBe("002-recipes");
      expect(matchPRToSpec("PROJECTS management", specIds)).toBe(
        "009-projects",
      );
    });

    it("matches singular form when spec has plural", () => {
      expect(matchPRToSpec("Add project configuration", specIds)).toBe(
        "009-projects",
      );
      expect(matchPRToSpec("Fix recipe display", specIds)).toBe("002-recipes");
    });

    it("matches singular form for environments spec", () => {
      const specsWithEnv = ["001-environments", "002-recipes"];
      expect(matchPRToSpec("Add environment variable", specsWithEnv)).toBe(
        "001-environments",
      );
      expect(matchPRToSpec("Update environment config", specsWithEnv)).toBe(
        "001-environments",
      );
    });
  });

  describe("word boundary matching", () => {
    it("does not match partial numbers", () => {
      // "10001" should not match "001"
      expect(matchPRToSpec("Fix issue #10001", specIds)).toBeNull();
    });

    it("does not match partial words", () => {
      // "authoring" should not match "auth"
      expect(matchPRToSpec("Add authoring tools", specIds)).toBeNull();
    });

    it("matches at word boundaries", () => {
      expect(matchPRToSpec("auth: fix session", specIds)).toBe(
        "001-auth-system",
      );
      expect(matchPRToSpec("fix auth bug", specIds)).toBe("001-auth-system");
    });
  });

  describe("no match scenarios", () => {
    it("returns null when no spec matches", () => {
      expect(matchPRToSpec("Update README", specIds)).toBeNull();
    });

    it("returns null for empty title", () => {
      expect(matchPRToSpec("", specIds)).toBeNull();
    });

    it("returns null for empty spec list", () => {
      expect(matchPRToSpec("feat(009-projects): add feature", [])).toBeNull();
    });
  });
});

describe("isPRChore", () => {
  it("identifies chore prefixes", () => {
    expect(isPRChore("chore: update dependencies")).toBe(true);
    expect(isPRChore("ci: fix workflow")).toBe(true);
    expect(isPRChore("build: update webpack")).toBe(true);
    expect(isPRChore("refactor: clean up code")).toBe(true);
    expect(isPRChore("style: fix formatting")).toBe(true);
    expect(isPRChore("docs: update readme")).toBe(true);
  });

  it("identifies feature prefixes as not chore", () => {
    expect(isPRChore("feat: add new feature")).toBe(false);
    expect(isPRChore("fix: resolve bug")).toBe(false);
  });

  it("handles non-conventional commit titles", () => {
    expect(isPRChore("Add new feature")).toBe(false);
    expect(isPRChore("Update dependencies")).toBe(false);
  });
});

describe("groupPRsBySpecAndType", () => {
  const specs = [
    { id: "009-projects", name: "009-projects", href: "/spec/009-projects" },
    { id: "001-auth", name: "001-auth", href: "/spec/001-auth" },
  ];

  const createPR = (id: number, title: string): PullRequest => ({
    id,
    title,
    number: id,
    author: "test",
    author_avatar: "",
    repository: "test/repo",
    url: `https://github.com/test/repo/pull/${id}`,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    comments_count: 0,
    priority: "medium",
    status: "ready",
  });

  it("groups feature PRs by spec", () => {
    const prs = [
      createPR(1, "feat(009-projects): add dashboard"),
      createPR(2, "fix: auth timeout issue"),
    ];

    const result = groupPRsBySpecAndType(prs, specs);

    expect(result.featurePRs.bySpec["009-projects"]).toHaveLength(1);
    expect(result.featurePRs.bySpec["001-auth"]).toHaveLength(1);
    expect(result.featurePRs.noSpec).toHaveLength(0);
  });

  it("groups platform PRs by spec", () => {
    const prs = [
      createPR(1, "chore(009-projects): cleanup"),
      createPR(2, "ci: update workflow"),
    ];

    const result = groupPRsBySpecAndType(prs, specs);

    expect(result.platformPRs.bySpec["009-projects"]).toHaveLength(1);
    expect(result.platformPRs.noSpec).toHaveLength(1);
    expect(result.featurePRs.bySpec).toEqual({});
  });

  it("handles PRs that match no spec", () => {
    const prs = [
      createPR(1, "feat: random feature"),
      createPR(2, "chore: update readme"),
    ];

    const result = groupPRsBySpecAndType(prs, specs);

    expect(result.featurePRs.noSpec).toHaveLength(1);
    expect(result.platformPRs.noSpec).toHaveLength(1);
  });
});
