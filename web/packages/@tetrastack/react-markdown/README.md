# @tetrastack/react-markdown

A reusable React component for rendering Markdown content using `next-mdx-remote`.

## Features

- Renders Markdown and MDX content.
- Supports GitHub Flavored Markdown (GFM).
- Supports syntax highlighting via `rehype-highlight`.
- Styled with Tailwind CSS (expects `bg-surface-variant`, `text-on-surface`, etc. variables/classes to be available in the consumer).
- Includes GitHub Dark theme for syntax highlighting.

## Installation

```bash
npm install @tetrastack/react-markdown
```

## Usage

Import the component and the styles (if not already included globally).

````tsx
import { MarkdownRenderer } from "@tetrastack/react-markdown";
import "@tetrastack/react-markdown/src/styles.css"; // Or import in layout

export default function MyPage() {
  const content = `
# Hello World

This is a **markdown** example.

```typescript
const x = 1;
````

`;

return <MarkdownRenderer content={content} />;
}

```

## Props

- `content` (string): The markdown/MDX content to render.
- `className` (string, optional): Additional CSS classes for the container.

```
