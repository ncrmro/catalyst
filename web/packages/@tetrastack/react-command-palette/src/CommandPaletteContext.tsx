'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { Command, CommandPaletteContextValue } from './types';
import { CommandPalette } from './CommandPalette';

const CommandPaletteContext = createContext<
  CommandPaletteContextValue | undefined
>(undefined);

export interface CommandPaletteProviderProps {
  children: ReactNode;
  /**
   * Key to open the command palette
   * @default "/"
   */
  triggerKey?: string;
  /**
   * Initial commands to register
   */
  commands?: Command[];
}

export function CommandPaletteProvider({
  children,
  triggerKey = '/',
  commands: initialCommands = [],
}: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [commands, setCommandsState] = useState<Command[]>(initialCommands);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const setCommands = useCallback((newCommands: Command[]) => {
    setCommandsState(newCommands);
  }, []);

  const registerCommand = useCallback((command: Command) => {
    setCommandsState((prev) => {
      // Check if command already exists
      if (prev.find((c) => c.id === command.id)) {
        return prev;
      }
      return [...prev, command];
    });
  }, []);

  const unregisterCommand = useCallback((commandId: string) => {
    setCommandsState((prev) => prev.filter((c) => c.id !== commandId));
  }, []);

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the key matches the trigger key
      // Don't trigger if user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (event.key === triggerKey && !isTyping && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerKey, toggle]);

  const contextValue: CommandPaletteContextValue = {
    isOpen,
    open,
    close,
    toggle,
    setCommands,
    registerCommand,
    unregisterCommand,
  };

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      <CommandPalette
        isOpen={isOpen}
        onClose={close}
        commands={commands}
      />
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error(
      'useCommandPalette must be used within a CommandPaletteProvider'
    );
  }
  return context;
}
