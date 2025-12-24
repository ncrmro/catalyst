'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Command } from './types';
import { cn } from './utils';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({
  isOpen,
  onClose,
  commands,
}: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandListRef = useRef<HTMLDivElement>(null);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return commands;
    }

    const query = searchQuery.toLowerCase();
    return commands.filter((command) => {
      const labelMatch = command.label.toLowerCase().includes(query);
      const descriptionMatch = command.description?.toLowerCase().includes(query);
      const keywordsMatch = command.keywords?.some((kw) =>
        kw.toLowerCase().includes(query)
      );
      return labelMatch || descriptionMatch || keywordsMatch;
    });
  }, [commands, searchQuery]);

  // Group commands by their group property
  const groupedCommands = useMemo(() => {
    const groups = new Map<string, Command[]>();
    
    filteredCommands.forEach((command) => {
      const groupName = command.group || 'Other';
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(command);
    });

    return Array.from(groups.entries()).map(([name, cmds]) => ({
      name,
      commands: cmds,
    }));
  }, [filteredCommands]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      // Focus the input after a brief delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          event.preventDefault();
          if (filteredCommands[selectedIndex]) {
            handleCommandSelect(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (!commandListRef.current) return;

    const selectedElement = commandListRef.current.querySelector(
      `[data-command-index="${selectedIndex}"]`
    );
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  const handleCommandSelect = (command: Command) => {
    command.action();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl bg-surface/95 backdrop-blur-md rounded-xl border border-outline shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="border-b border-outline/50 p-4">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-on-surface text-lg placeholder:text-on-surface-variant outline-none"
          />
        </div>

        {/* Commands List */}
        <div
          ref={commandListRef}
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant">
              No commands found
            </div>
          ) : (
            groupedCommands.map((group, groupIndex) => (
              <div key={group.name} className={groupIndex > 0 ? 'mt-4' : ''}>
                {/* Group Header */}
                {groupedCommands.length > 1 && (
                  <div className="px-3 py-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    {group.name}
                  </div>
                )}

                {/* Commands in Group */}
                {group.commands.map((command, localIndex) => {
                  const globalIndex = filteredCommands.findIndex(
                    (c) => c.id === command.id
                  );
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <button
                      key={command.id}
                      data-command-index={globalIndex}
                      onClick={() => handleCommandSelect(command)}
                      className={cn(
                        'w-full text-left px-3 py-3 rounded-lg transition-colors',
                        'flex items-center gap-3',
                        isSelected
                          ? 'bg-primary/20 text-on-surface'
                          : 'hover:bg-surface-variant/50 text-on-surface'
                      )}
                    >
                      {command.icon && (
                        <div className="flex-shrink-0 w-5 h-5 text-on-surface-variant">
                          {command.icon}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {command.label}
                        </div>
                        {command.description && (
                          <div className="text-sm text-on-surface-variant truncate">
                            {command.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-outline/50 px-4 py-3 flex items-center justify-between text-xs text-on-surface-variant">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-2 py-1 bg-surface-variant/50 rounded text-on-surface">
                ↑↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-2 py-1 bg-surface-variant/50 rounded text-on-surface">
                ↵
              </kbd>{' '}
              Select
            </span>
            <span>
              <kbd className="px-2 py-1 bg-surface-variant/50 rounded text-on-surface">
                Esc
              </kbd>{' '}
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
