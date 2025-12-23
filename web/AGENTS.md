# Agent Development Guidelines

When developing components, always create or re-export generic components from `src/components/ui`.
Avoid importing components directly from `tetrastack-react-glass-components` elsewhere in the application to ensure consistent styling and maintainability.

## Frontend Architecture & Storybook

Storybook is a first-class citizen for design iteration. We aim for structured, easily testable components.

### File Structure

```text
web/
├── .storybook/              # Global Storybook config
├── src/
│   ├── actions/             # Server Actions (Backend boundary)
│   ├── app/
│   │   ├── api/             # API Routes
│   │   ├── globals.css      # Global CSS
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   └── dashboard/       # Feature Route
│   │       ├── page.tsx     # Route (Server Component)
│   │       └── _components/ # 🟢 Route-Specific Components (Organisms)
│   │           ├── UserStats.tsx
│   │           └── UserStats.stories.tsx
│   │
│   ├── components/
│   │   ├── ui/              # 🟢 Atoms (Design System Primitives)
│   │   │   ├── button.tsx   # Wraps @tetrastack/react-glass
│   │   │   ├── button.stories.tsx
│   │   │   ├── input.tsx
│   │   │   └── input.stories.tsx
│   │   │
│   │   └── navigation/      # 🟢 Molecules (Shared features)
│   │       ├── MainNav.tsx
│   │       └── MainNav.stories.tsx
│   │
│   ├── lib/                 # Utilities
│   │   └── utils.ts
│   │
│   └── stories/             # Root stories (imports @tetrastack/react-glass stories)
```

## Commit Guidelines

Always use semantic commits. If available, include the spec, issue, or pull request number as part of the commit subject.
