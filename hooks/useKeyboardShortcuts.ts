'use client';

import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't fire when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      for (const s of shortcuts) {
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = s.alt ? e.altKey : !e.altKey;

        if (e.key.toLowerCase() === s.key.toLowerCase() && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          s.action();
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

/** Pre-built shortcut set for the main page */
export function buildMainShortcuts(actions: {
  onSearch: () => void;
  onBack: () => void;
  onBloco?: (idx: number) => void;
}): KeyboardShortcut[] {
  return [
    { key: '/', description: 'Buscar', action: actions.onSearch },
    { key: 'Escape', description: 'Voltar', action: actions.onBack },
    ...(actions.onBloco
      ? Array.from({ length: 8 }, (_, i) => ({
          key: String(i + 1),
          description: `Bloco ${i + 1}`,
          action: () => actions.onBloco!(i),
        }))
      : []),
  ];
}
