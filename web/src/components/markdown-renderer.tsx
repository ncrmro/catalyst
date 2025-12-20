"use client";

/**
 * Simple Markdown Renderer Component
 *
 * Renders markdown content with basic styling.
 * Uses a simple regex-based approach for common markdown elements.
 */

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Convert markdown to HTML with basic styling
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML entities first
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (``` ... ```)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="bg-surface-variant rounded-lg p-4 overflow-x-auto my-4"><code class="text-sm text-on-surface-variant">$2</code></pre>',
  );

  // Inline code (` ... `)
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-surface-variant px-1.5 py-0.5 rounded text-sm text-on-surface-variant">$1</code>',
  );

  // Headers
  html = html.replace(
    /^#### (.+)$/gm,
    '<h4 class="text-base font-semibold text-on-surface mt-6 mb-2">$1</h4>',
  );
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="text-lg font-semibold text-on-surface mt-6 mb-3">$1</h3>',
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="text-xl font-bold text-on-surface mt-8 mb-4 pb-2 border-b border-outline/30">$1</h2>',
  );
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="text-2xl font-bold text-on-surface mb-6">$1</h1>',
  );

  // Bold and italic
  html = html.replace(
    /\*\*\*(.+?)\*\*\*/g,
    '<strong class="font-bold"><em>$1</em></strong>',
  );
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="font-semibold">$1</strong>',
  );
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Images
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="max-w-full rounded-lg my-4" />',
  );

  // Blockquotes
  html = html.replace(
    /^&gt; (.+)$/gm,
    '<blockquote class="border-l-4 border-primary/50 pl-4 italic text-on-surface-variant my-4">$1</blockquote>',
  );

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="border-outline/30 my-8" />');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(
    /(<li[^>]*>.*<\/li>\n?)+/g,
    '<ul class="space-y-1 my-4 text-on-surface">$&</ul>',
  );

  // Ordered lists
  html = html.replace(
    /^\d+\. (.+)$/gm,
    '<li class="ml-4 list-decimal">$1</li>',
  );

  // Tables
  html = html.replace(/^\|(.+)\|$/gm, (match, content) => {
    const cells = content.split("|").map((cell: string) => cell.trim());
    const isHeader = cells.every((cell: string) => cell.match(/^-+$/));

    if (isHeader) {
      return ""; // Skip separator row
    }

    const cellHtml = cells
      .map(
        (cell: string) =>
          `<td class="border border-outline/30 px-3 py-2 text-on-surface">${cell}</td>`,
      )
      .join("");
    return `<tr>${cellHtml}</tr>`;
  });
  html = html.replace(
    /(<tr>.*<\/tr>\n?)+/g,
    '<table class="w-full border-collapse my-4"><tbody>$&</tbody></table>',
  );

  // Paragraphs (lines that don't start with HTML tags)
  html = html
    .split("\n\n")
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      if (block.startsWith("<")) return block;
      if (block.match(/^<(h[1-6]|ul|ol|li|pre|blockquote|table|tr|hr)/))
        return block;
      return `<p class="text-on-surface leading-relaxed my-4">${block.replace(
        /\n/g,
        "<br />",
      )}</p>`;
    })
    .join("\n");

  return html;
}

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  const html = markdownToHtml(content);

  return (
    <div
      className={`prose prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
