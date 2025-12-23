'use client';

import { CommandPaletteProvider } from '@tetrastack/react-command-palette';

export function CommandPaletteWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CommandPaletteProvider triggerKey="/">
      {children}
    </CommandPaletteProvider>
  );
}
