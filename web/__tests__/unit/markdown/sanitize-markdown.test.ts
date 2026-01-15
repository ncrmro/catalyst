import { describe, it, expect } from "vitest";

/**
 * Copy of sanitizeMarkdown function for testing
 * This tests the MDX sanitization logic that prevents parsing errors
 */
function sanitizeMarkdown(markdown: string): string {
  // Strip HTML comments which break MDX parsing (e.g. <!-- comment -->)
  let sanitized = markdown.replace(/<!--[\s\S]*?-->/g, "");

  // Escape < that aren't followed by valid HTML tags or closing tags
  // This handles: <1, < 2, <?, <!, <template-literal>, etc.
  sanitized = sanitized.replace(
    /<(?!\/?\s*(?:a|abbr|address|area|article|aside|audio|b|base|bdi|bdo|blockquote|body|br|button|canvas|caption|cite|code|col|colgroup|data|datalist|dd|del|details|dfn|dialog|div|dl|dt|em|embed|fieldset|figcaption|figure|footer|form|h[1-6]|head|header|hgroup|hr|html|i|iframe|img|input|ins|kbd|label|legend|li|link|main|map|mark|meta|meter|nav|noscript|object|ol|optgroup|option|output|p|param|picture|pre|progress|q|rp|rt|ruby|s|samp|script|section|select|slot|small|source|span|strong|style|sub|summary|sup|table|tbody|td|template|textarea|tfoot|th|thead|time|title|tr|track|u|ul|var|video|wbr)(?:\s|>|\/))/gi,
    "&lt;",
  );

  // Also escape curly braces outside of code blocks (MDX interprets as JSX expressions)
  // Only escape if they contain template-like syntax that could break
  sanitized = sanitized.replace(/\{(\w+)\}/g, (match, content) => {
    // Keep common markdown/code patterns, escape template-like patterns
    if (/^[a-z_][a-z0-9_]*$/i.test(content)) {
      return `\\{${content}\\}`;
    }
    return match;
  });

  return sanitized;
}

describe("sanitizeMarkdown", () => {
  describe("MDX angle bracket escaping", () => {
    it("should escape < followed by a number (MDX error case)", () => {
      // This is the exact pattern that caused the MDX parsing error:
      // "Unexpected character `1` (U+0031) before name"
      expect(sanitizeMarkdown("<1")).toBe("&lt;1");
      expect(sanitizeMarkdown("< 2 minutes")).toBe("&lt; 2 minutes");
      expect(sanitizeMarkdown("< 500ms")).toBe("&lt; 500ms");
      expect(sanitizeMarkdown("Response time < 100ms")).toBe(
        "Response time &lt; 100ms",
      );
    });

    it("should escape comparison operators", () => {
      expect(sanitizeMarkdown("a < b")).toBe("a &lt; b");
      expect(sanitizeMarkdown("x < y && z > w")).toBe("x &lt; y && z > w");
      expect(sanitizeMarkdown("if (count < 10)")).toBe("if (count &lt; 10)");
    });

    it("should preserve valid HTML tags", () => {
      expect(sanitizeMarkdown("<div>content</div>")).toBe("<div>content</div>");
      expect(sanitizeMarkdown("<strong>bold</strong>")).toBe(
        "<strong>bold</strong>",
      );
      expect(sanitizeMarkdown("<a href='#'>link</a>")).toBe(
        "<a href='#'>link</a>",
      );
      expect(sanitizeMarkdown("<br/>")).toBe("<br/>");
      expect(sanitizeMarkdown("<br />")).toBe("<br />");
      expect(sanitizeMarkdown("<img src='x'>")).toBe("<img src='x'>");
      expect(sanitizeMarkdown("<h1>Title</h1>")).toBe("<h1>Title</h1>");
      expect(sanitizeMarkdown("<h2>Subtitle</h2>")).toBe("<h2>Subtitle</h2>");
    });

    it("should preserve closing tags", () => {
      expect(sanitizeMarkdown("</div>")).toBe("</div>");
      expect(sanitizeMarkdown("</p>")).toBe("</p>");
      expect(sanitizeMarkdown("</span>")).toBe("</span>");
    });

    it("should escape non-standard tag-like patterns", () => {
      // These look like tags but aren't valid HTML
      expect(sanitizeMarkdown("<custom-tag>")).toBe("&lt;custom-tag>");
      expect(sanitizeMarkdown("<MyComponent>")).toBe("&lt;MyComponent>");
      expect(sanitizeMarkdown("<foo_bar>")).toBe("&lt;foo_bar>");
    });
  });

  describe("HTML comment removal", () => {
    it("should strip single-line HTML comments", () => {
      expect(sanitizeMarkdown("<!-- comment -->")).toBe("");
      expect(sanitizeMarkdown("before <!-- comment --> after")).toBe(
        "before  after",
      );
    });

    it("should strip multi-line HTML comments", () => {
      expect(
        sanitizeMarkdown(`<!--
        multi
        line
        comment
      -->`),
      ).toBe("");
    });

    it("should handle multiple comments", () => {
      expect(sanitizeMarkdown("<!-- one -->text<!-- two -->")).toBe("text");
    });
  });

  describe("curly brace escaping", () => {
    it("should escape template-like curly braces", () => {
      expect(sanitizeMarkdown("{variable}")).toBe("\\{variable\\}");
      expect(sanitizeMarkdown("{foo}")).toBe("\\{foo\\}");
      expect(sanitizeMarkdown("{MyVar}")).toBe("\\{MyVar\\}");
    });

    it("should handle multiple curly brace patterns", () => {
      expect(sanitizeMarkdown("{a} and {b}")).toBe("\\{a\\} and \\{b\\}");
    });
  });

  describe("real-world spec content patterns", () => {
    it("should handle success criteria with timing requirements", () => {
      const input = `
## Success Criteria

- **SC-001**: Users complete signup in < 2 minutes
- **SC-002**: Page load time < 500ms on 3G
- **SC-003**: Error rate < 0.1%
`;
      const result = sanitizeMarkdown(input);

      expect(result).toContain("&lt; 2 minutes");
      expect(result).toContain("&lt; 500ms");
      expect(result).toContain("&lt; 0.1%");
    });

    it("should handle mixed content with HTML and comparisons", () => {
      const input = `
<div>
Response time must be < 100ms
</div>
`;
      const result = sanitizeMarkdown(input);

      // Valid HTML tags preserved
      expect(result).toContain("<div>");
      expect(result).toContain("</div>");
      // Comparison escaped
      expect(result).toContain("&lt; 100ms");
    });
  });
});
