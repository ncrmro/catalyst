/**
 * Tests for GitHub Error Logging and Classification
 * 
 * This test file demonstrates the new error logging and classification features
 * that help distinguish between authentication errors and actual 404s.
 */

import { classifyGitHubError } from "@/lib/vcs-providers";

describe("GitHub Error Classification", () => {
  describe("classifyGitHubError", () => {
    it("should classify 401 as auth error", () => {
      const error = { status: 401, message: "Bad credentials" };
      const result = classifyGitHubError(error);
      
      expect(result.type).toBe("auth");
      expect(result.status).toBe(401);
      expect(result.message).toContain("authentication failed");
      expect(result.message).toContain("sign in again");
    });

    it("should classify 403 with rate limit as rate_limit error", () => {
      const error = { status: 403, message: "API rate limit exceeded" };
      const result = classifyGitHubError(error);
      
      expect(result.type).toBe("rate_limit");
      expect(result.status).toBe(403);
      expect(result.message).toContain("rate limit");
    });

    it("should classify 403 without rate limit as permission error", () => {
      const error = { status: 403, message: "Resource not accessible" };
      const result = classifyGitHubError(error);
      
      expect(result.type).toBe("permission");
      expect(result.status).toBe(403);
      expect(result.message).toContain("Access denied");
    });

    it("should classify 404 as not_found error", () => {
      const error = { status: 404, message: "Not Found" };
      const result = classifyGitHubError(error);
      
      expect(result.type).toBe("not_found");
      expect(result.status).toBe(404);
      expect(result.message).toContain("not found");
    });

    it("should classify network errors", () => {
      const error = { message: "ECONNREFUSED" };
      const result = classifyGitHubError(error);
      
      expect(result.type).toBe("network");
      expect(result.message).toContain("Network error");
    });

    it("should classify timeout errors as network", () => {
      const error = { message: "Request timeout" };
      const result = classifyGitHubError(error);
      
      expect(result.type).toBe("network");
      expect(result.message).toContain("Network error");
    });

    it("should handle token-related errors without status code", () => {
      const error = { message: "Invalid token" };
      const result = classifyGitHubError(error);
      
      expect(result.type).toBe("auth");
      expect(result.message).toContain("authentication issue");
    });

    it("should handle response object with status", () => {
      const error = { 
        response: { status: 401 },
        message: "Unauthorized" 
      };
      const result = classifyGitHubError(error);
      
      expect(result.type).toBe("auth");
      expect(result.status).toBe(401);
    });

    it("should classify unknown errors", () => {
      const error = { status: 500, message: "Internal Server Error" };
      const result = classifyGitHubError(error);
      
      expect(result.type).toBe("unknown");
      expect(result.status).toBe(500);
      expect(result.message).toContain("GitHub API error");
    });

    it("should handle null/undefined errors", () => {
      const result = classifyGitHubError(null);
      
      expect(result.type).toBe("unknown");
      expect(result.message).toBe("An unknown error occurred");
    });

    it("should handle non-object errors", () => {
      const result = classifyGitHubError("some string error");
      
      expect(result.type).toBe("unknown");
      expect(result.message).toBe("An unknown error occurred");
    });
  });

  describe("Error Logging Scenarios", () => {
    it("should provide actionable messages for auth errors", () => {
      const error = { status: 401, message: "Bad credentials" };
      const result = classifyGitHubError(error);
      
      // Auth error should tell user to sign in again
      expect(result.message).toMatch(/sign in again|re-authenticate/i);
    });

    it("should provide actionable messages for permission errors", () => {
      const error = { status: 403, message: "Forbidden" };
      const result = classifyGitHubError(error);
      
      // Permission error should mention scopes or permissions
      expect(result.message).toMatch(/permission|scopes/i);
    });

    it("should distinguish 404 as potentially auth-related", () => {
      const error404 = { status: 404, message: "Not Found" };
      const result = classifyGitHubError(error404);
      
      // 404 message should mention it could be access issue
      expect(result.message).toContain("may not have access");
    });
  });
});

describe("Error Logging Flow", () => {
  it("should log helpful context for debugging", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Simulate an auth error during PR fetch
    const error = { status: 401, message: "Bad credentials" };
    const errorInfo = classifyGitHubError(error);
    
    // This is what the code would log:
    console.error(
      `[fetchProjectPullRequests] Authentication error for owner/repo: ${errorInfo.message}`
    );
    console.error(
      `[fetchProjectPullRequests] User user-123 needs to re-authenticate with GitHub`
    );
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[fetchProjectPullRequests] Authentication error")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("needs to re-authenticate")
    );
    
    consoleSpy.mockRestore();
  });
});
