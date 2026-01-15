import { MDXRemote, type MDXRemoteProps } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import React, { type ComponentPropsWithoutRef, type ReactNode } from "react";

/**
 * Markdown Renderer Component
 *
 * Renders markdown/MDX content using next-mdx-remote.
 * Includes custom components to match the application's styling.
 */

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

type HTMLProps<T extends keyof React.JSX.IntrinsicElements> =
  ComponentPropsWithoutRef<T>;

const components: MDXRemoteProps["components"] = {
  h1: (props: HTMLProps<"h1">) => (
    <h1 className="text-2xl font-bold text-on-surface mb-6" {...props} />
  ),
  h2: (props: HTMLProps<"h2">) => (
    <h2
      className="text-xl font-bold text-on-surface mt-8 mb-4 pb-2 border-b border-outline/30"
      {...props}
    />
  ),
  h3: (props: HTMLProps<"h3">) => (
    <h3
      className="text-lg font-semibold text-on-surface mt-6 mb-3"
      {...props}
    />
  ),
  h4: (props: HTMLProps<"h4">) => (
    <h4
      className="text-base font-semibold text-on-surface mt-6 mb-2"
      {...props}
    />
  ),
  p: (props: HTMLProps<"p">) => (
    <p className="text-on-surface leading-relaxed my-4" {...props} />
  ),
  a: (props: HTMLProps<"a">) => (
    <a
      className="text-primary hover:underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  ul: (props: HTMLProps<"ul">) => (
    <ul className="space-y-1 my-4 text-on-surface list-disc pl-6" {...props} />
  ),
  ol: (props: HTMLProps<"ol">) => (
    <ol
      className="space-y-1 my-4 text-on-surface list-decimal pl-6"
      {...props}
    />
  ),
  li: (props: HTMLProps<"li">) => <li className="pl-1" {...props} />,
  blockquote: (props: HTMLProps<"blockquote">) => (
    <blockquote
      className="border-l-4 border-primary/50 pl-4 italic text-on-surface-variant my-4"
      {...props}
    />
  ),
  pre: (props: HTMLProps<"pre">) => (
    <pre
      className="bg-surface-variant rounded-lg p-4 overflow-x-auto my-4 text-sm font-mono text-on-surface-variant"
      {...props}
    />
  ),
  code: (props: HTMLProps<"code">) => {
    const isInline = !props.className;
    return (
      <code
        className={`${
          isInline
            ? "bg-surface-variant px-1.5 py-0.5 rounded text-sm text-on-surface-variant font-mono"
            : ""
        } ${props.className || ""}`}
        {...props}
      />
    );
  },
  hr: (props: HTMLProps<"hr">) => (
    <hr className="border-outline/30 my-8" {...props} />
  ),
  table: (props: HTMLProps<"table">) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-collapse" {...props} />
    </div>
  ),
  th: (props: HTMLProps<"th">) => (
    <th
      className="border border-outline/30 px-3 py-2 text-left font-semibold text-on-surface bg-surface-variant/50"
      {...props}
    />
  ),
  td: (props: HTMLProps<"td">) => (
    <td
      className="border border-outline/30 px-3 py-2 text-on-surface"
      {...props}
    />
  ),
  img: (props: HTMLProps<"img">) => (
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    <img className="max-w-full rounded-lg my-4" {...props} />
  ),
};

/**
 * Pre-process markdown content to make it safer for MDX
 *
 * MDX interprets < as JSX tag start, so we need to escape any < that isn't
 * part of a valid HTML tag. This includes comparison operators, template
 * syntax, and other non-tag uses of angle brackets.
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

export async function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps): Promise<ReactNode> {
  const sanitizedContent = sanitizeMarkdown(content);

  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      <MDXRemote
        source={sanitizedContent}
        components={components}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeHighlight],
          },
        }}
      />
    </div>
  );
}
