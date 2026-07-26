'use client';

import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
}

export function useLongPress({ onLongPress, onClick, delay = 500 }: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback((e: React.PointerEvent) => {
    isLongPressRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const move = useCallback((e: React.PointerEvent) => {
    if (startPosRef.current) {
      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      if (dx > 10 || dy > 10) {
        clear();
      }
    }
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const end = useCallback((e: React.MouseEvent) => {
    clear();
    if (!isLongPressRef.current && onClick) {
      onClick();
    }
  }, [clear, onClick]);

  return {
    onPointerDown: start,
    onPointerMove: move,
    onPointerUp: clear,
    onPointerCancel: clear,
    onClick: end,
  };
}

interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ContextMenuState {
  isOpen: boolean;
  items: ContextMenuItem[];
  position: { x: number; y: number };
}

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>({
    isOpen: false,
    items: [],
    position: { x: 0, y: 0 },
  });

  const openMenu = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setMenu({ isOpen: true, items, position: { x, y } });
  }, []);

  const closeMenu = useCallback(() => {
    setMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return { menu, openMenu, closeMenu };
}
