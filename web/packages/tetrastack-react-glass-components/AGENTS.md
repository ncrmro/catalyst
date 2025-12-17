# Glass Components Design System

A minimal, framework-agnostic React component library featuring glass-morphism effects.

## Philosophy

The Glass Components library is designed to be **portable and reusable across projects**. Components in this directory should:

- ✅ **Be framework-agnostic** - Avoid Next.js, Remix, or any framework-specific code
- ✅ **Be self-contained** - Minimize external dependencies
- ✅ **Use standard React patterns** - Functional components with TypeScript
- ✅ **Focus on presentation** - UI components without business logic
- ✅ **Export clean APIs** - Well-typed props and clear interfaces

## Usage Pattern

Glass components are **not meant to be imported directly** into your application code. Instead, they should be re-exported through a project-specific wrapper layer (typically `components/ui/` or `components/`).

### Recommended Project Structure

```
src/
├── lib/
│   └── glass-components/     # ⚠️ DO NOT import from here directly
│       ├── GlassButton.tsx
│       ├── GlassCard.tsx
│       └── ...
└── components/
    ├── ui/                   # ✅ Import from here
    │   ├── Button.tsx        # Re-exports GlassButton with project customizations
    │   ├── Card.tsx          # Re-exports GlassCard
    │   └── ...
    └── Link.tsx              # Project-specific component using glass components
```

### Example: Project-Specific Wrapper

```tsx
// ❌ BAD: Direct import in application code
import { GlassButton } from '@/lib/glass-components';

// ✅ GOOD: Import through project wrapper
import { Button } from '@/components/ui/Button';
```

**components/ui/Button.tsx:**

```tsx
import { GlassButton, type GlassButtonProps } from '@/lib/glass-components';

// Re-export with project-specific defaults or customizations
export function Button({ variant = 'primary', ...props }: GlassButtonProps) {
  return <GlassButton variant={variant} {...props} />;
}

export type ButtonProps = GlassButtonProps;
```

## Benefits of the Wrapper Layer

1. **Easy to switch design systems** - Replace glass components with shadcn/ui, MUI, etc. without touching application code
2. **Project-specific customization** - Override defaults, add project-specific variants, or extend functionality
3. **Consistent API** - Maintain a stable API even when the underlying library changes
4. **Simplified imports** - Shorter, cleaner import paths in application code
5. **Centralized theming** - Apply project-wide design tokens and overrides in one place

## Current Components

### Core Components

- **GlassSurface** - Base component providing glass-morphism effect
- **GlassCard** - Card component with glass styling and composable parts
- **GlassButton** - Button with glass effect and multiple variants
- **GlassButtonLink** - Button-styled anchor tag
- **GlassInput** - Input field with glass styling
- **GlassSelect** - Select dropdown with glass styling
- **GlassNav** - Navigation bar with glass effect
- **GlassIncrementor** - Generic incrementor/counter control

### Layout Components

- **Breadcrumbs** - Navigation breadcrumb component
- **DefaultLayout** - Standard page layout with breadcrumbs

### Navigation Components

- **GlassLink** - Link component with glass styling

## Design Tokens

The design system uses a minimal color palette optimized for glass effects:

- **Primary**: Soft teal/cyan (sky-500, cyan-500)
- **Secondary**: Muted purple (violet-500, purple-500)
- **Tertiary**: Soft rose (pink-500, pink-400)
- **Surface**: Slate colors for glass backgrounds

Color variants are defined using Tailwind's opacity modifier syntax (e.g., `bg-primary/20`).

## Performance Considerations

### Glass Effect Nesting

**⚠️ Important**: Avoid nesting glass components (components with `backdrop-filter: blur()`) as this can cause significant performance degradation, especially on lower-end devices.

**Problem**: Each glass surface applies a `backdrop-filter`, which is computationally expensive. When multiple glass surfaces are nested (e.g., a `GlassCard` inside another `GlassCard`), the browser must apply multiple blur filters, leading to:

- Stuttering during scrolling/interactions
- Reduced frame rates
- Increased CPU/GPU usage
- Poor user experience on mobile devices

**Solution**: Use the `glass={false}` prop to disable the glass effect on outer containers when nesting is necessary:

```tsx
// ❌ BAD: Nested glass effects cause performance issues
<Card>
  <Card>Content</Card>  {/* Double blur = poor performance */}
</Card>

// ✅ GOOD: Disable glass on outer container
<Card glass={false}>
  <Card>Content</Card>  {/* Single blur = good performance */}
</Card>
```

**Best Practices**:

1. Only use glass effect on innermost components (the actual content containers)
2. Disable glass on structural/layout containers using `glass={false}`
3. Test performance on lower-end devices when using glass effects
4. Consider using `intensity="light"` for better performance when glass effect is needed
5. Monitor frame rates in DevTools when implementing glass-heavy UIs

**Performance Targets**:

- Aim for 60fps during scroll and interactions
- Test on mobile devices or simulate slow CPUs in DevTools
- Use browser Performance profiling to identify bottlenecks

## Current Status & Known Issues

✅ **Framework-Agnostic Status**

The glass-components library is now fully framework-agnostic and portable:

1. **All components** - ✅ Use internal `cn` utility from `./utils.ts`
   - No longer depend on project-specific imports

2. **GlassLink** - ✅ Now a standard anchor component
   - Renders a styled `<a>` tag with glass effects
   - Compatible with any routing library via wrapper pattern

3. **Breadcrumbs** - ✅ Accepts custom Link component via dependency injection
   - Uses standard anchor tags by default
   - Pass `LinkComponent` prop for Next.js Link, React Router Link, etc.

4. **DefaultLayout** - ✅ Framework-agnostic
   - Uses only React and internal glass-components
   - No framework-specific dependencies

5. **Performance Optimization** - ✅ Glass effect can be disabled via `glass={false}` prop
   - Prevents performance issues when nesting components
   - Maintains visual hierarchy while improving frame rates

## Local Package Adoption (Monorepo Setup)

To adopt `@tetrastack/react-glass-components` without publishing to npm (e.g., in a monorepo like this project):

### Setup Instructions

1.  **Package Location**: Place the package source code in a `packages/` directory within your monorepo root (e.g., `packages/tetrastack-react-glass-components`).
2.  **Workspace Configuration**: In your monorepo's root `package.json`, configure workspaces to include the `packages/` directory:
    ```json
    {
      "workspaces": ["packages/*"]
    }
    ```
3.  **Package Definition**: Ensure the package's `package.json` (e.g., `packages/tetrastack-react-glass-components/package.json`) has the correct name (scoped if applicable) and export map:
    ```json
    {
      "name": "@tetrastack/react-glass-components",
      "exports": {
        ".": "./index.ts",
        "./GlassSurface": "./src/lib/glass-components/GlassSurface.tsx"
        // ... other exports
      }
    }
    ```
4.  **Install/Link**: Run `npm install` (or `yarn install`, `pnpm install`) in the root of your monorepo. The package manager will detect the workspace and create a symbolic link in `node_modules/@tetrastack/react-glass-components` pointing to your local source folder.
5.  **Usage**: You can then import components directly from the package name in your application code, as if it were an installed npm package:
    ```tsx
    import { GlassButton } from '@tetrastack/react-glass-components';
    // or subpath imports if defined in exports map
    import { GlassSurface } from '@tetrastack/react-glass-components/GlassSurface';
    ```

### Workflow

- **Edits**: Changes made to the package's source code (e.g., in `packages/tetrastack-react-glass-components/src/...`) will be reflected immediately in your consuming application (often via hot-reloading in development environments like Next.js).
- **Dependencies**: If the package needs new dependencies, add them to its `package.json` and run `npm install` in the monorepo root.

## Contribution Guidelines

When adding or modifying components:

1. **Avoid framework-specific code** - No Next.js, Remix, or routing library imports
2. **Minimize dependencies** - Only use React and essential utilities
3. **Use TypeScript** - All components must have proper type definitions
4. **Document props** - Add JSDoc comments for all component props
5. **Export types** - Export TypeScript interfaces/types for consumer usage
6. **Keep it generic** - No business logic or domain-specific code
7. **Test portability** - Ensure components work in any React environment

## Migration Plan

Phase 1 - Framework Independence: ✅ **COMPLETED**

1. [x] Create internal `cn` utility or document it as a required peer dependency
2. [x] Refactor or move GlassLink to project layer
3. [x] Refactor or move Breadcrumbs to project layer
4. [x] Review DefaultLayout for framework dependencies

Phase 2 - Package Preparation:

5. [ ] Document all required peer dependencies (React, Tailwind CSS, clsx, tailwind-merge, @heroicons/react)
6. [ ] Create example project showing glass-components in non-Next.js environment
7. [ ] Add package.json for standalone npm package
8. [ ] Set up build configuration for distribution

## Example: Full Implementation

**Step 1: Install glass-components in new project**

```bash
# Copy lib/glass-components/ directory to your project
cp -r src/lib/glass-components new-project/src/lib/
```

**Step 2: Create project wrapper layer**

```tsx
// components/ui/Button.tsx
export { GlassButton as Button } from '@/lib/glass-components';
export type { GlassButtonProps as ButtonProps } from '@/lib/glass-components';

// components/ui/Card.tsx
export { GlassCard as Card } from '@/lib/glass-components';
export type { GlassCardProps as CardProps } from '@/lib/glass-components';
```

**Step 3: Use in application**

```tsx
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function MyComponent() {
  return (
    <Card>
      <Button variant="primary">Click Me</Button>
    </Card>
  );
}
```

## Future Vision

Eventually, glass-components should be:

- Published as a standalone npm package
- Framework-agnostic and portable to any React project
- Used as a drop-in design system with zero configuration
- Customizable through a theme configuration file
- Fully typed with comprehensive TypeScript definitions
- Documented with Storybook or similar component explorer

---

**Questions or issues?** The glass-components library is actively evolving. Contributions and feedback are welcome!
