export interface Command {
  id: string;
  label: string;
  description?: string;
  group?: string;
  keywords?: string[];
  action: () => void | Promise<void>;
  icon?: React.ReactNode;
}

export interface CommandGroup {
  name: string;
  commands: Command[];
}

export interface CommandPaletteState {
  isOpen: boolean;
  commands: Command[];
  searchQuery: string;
  selectedIndex: number;
}

export interface CommandPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setCommands: (commands: Command[]) => void;
  registerCommand: (command: Command) => void;
  unregisterCommand: (commandId: string) => void;
}
