# @tetrastack/react-command-palette

A React package for creating keyboard-accessible command palette modals for quick navigation and actions.

## Installation

```bash
npm install @tetrastack/react-command-palette
```

## Features

- **Keyboard Activation**: Configurable keybinding (default: `/`)
- **Modal Overlay**: Full-screen modal with backdrop and glass-morphism styling
- **Search/Filter**: Real-time filtering of commands as user types
- **Keyboard Navigation**: Arrow keys for navigation, Enter to select, Escape to close
- **Command Groups**: Organize commands into logical categories
- **Nested Commands**: Support for multi-step command flows
- **Context Provider**: Global context for command management
- **TypeScript Support**: Fully typed with TypeScript

## Usage

### Basic Setup

Wrap your application with the `CommandPaletteProvider`:

```tsx
import { CommandPaletteProvider } from '@tetrastack/react-command-palette';

function App() {
  return (
    <CommandPaletteProvider triggerKey="/">
      <YourApp />
    </CommandPaletteProvider>
  );
}
```

### Registering Commands

Use the `useCommandPalette` hook to register and manage commands:

```tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCommandPalette } from '@tetrastack/react-command-palette';

function MyComponent() {
  const router = useRouter();
  const { setCommands } = useCommandPalette();

  useEffect(() => {
    setCommands([
      {
        id: 'navigate-home',
        label: 'Home',
        description: 'Go to home page',
        group: 'Navigation',
        keywords: ['home', 'dashboard'],
        action: () => router.push('/'),
      },
      {
        id: 'create-project',
        label: 'Create Project',
        description: 'Create a new project',
        group: 'Actions',
        keywords: ['create', 'new'],
        action: () => router.push('/projects/create'),
      },
    ]);
  }, [router, setCommands]);

  return <div>My Component</div>;
}
```

### Nested Commands

Create multi-step flows by setting new commands in an action:

```tsx
const projectCommand = {
  id: 'project-1',
  label: 'My Project',
  group: 'Projects',
  action: () => {
    // Show environment options for this project
    setCommands([
      {
        id: 'back',
        label: '← Back to Projects',
        action: () => setCommands(projectCommands),
      },
      {
        id: 'view-project',
        label: 'View Project',
        action: () => router.push(`/projects/${projectId}`),
      },
      {
        id: 'create-env',
        label: 'Create Environment',
        action: () => router.push(`/projects/${projectId}/environments/create`),
      },
    ]);
  },
};
```

## API

### CommandPaletteProvider

Props:
- `children: ReactNode` - Your application components
- `triggerKey?: string` - Key to open the palette (default: `/`)
- `commands?: Command[]` - Initial commands to register

### useCommandPalette()

Returns:
- `isOpen: boolean` - Whether the palette is currently open
- `open: () => void` - Open the palette
- `close: () => void` - Close the palette
- `toggle: () => void` - Toggle the palette
- `setCommands: (commands: Command[]) => void` - Replace all commands
- `registerCommand: (command: Command) => void` - Add a single command
- `unregisterCommand: (commandId: string) => void` - Remove a command by ID

### Command Interface

```typescript
interface Command {
  id: string;
  label: string;
  description?: string;
  group?: string;
  keywords?: string[];
  action: () => void | Promise<void>;
  icon?: React.ReactNode;
}
```

## Keyboard Shortcuts

- `/` - Open command palette (configurable)
- `↑` / `↓` - Navigate through commands
- `Enter` - Execute selected command
- `Escape` - Close the palette
- Type to filter commands in real-time

## Styling

The component uses Tailwind CSS with Material Design semantic color tokens. Ensure your project has Tailwind CSS configured with the following color tokens:

- `surface` - Background color for cards
- `on-surface` - Primary text color
- `on-surface-variant` - Secondary text color
- `outline` - Border colors
- `primary` - Accent color for selected items
- `surface-variant` - Alternative surface color

## License

MIT
