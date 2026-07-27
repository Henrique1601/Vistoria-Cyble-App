'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  HouseLine,
  Camera,
  Images,
  Download,
  GearSix,
  CalendarDots,
} from '@phosphor-icons/react';
import { haptic } from '@/lib/haptic';

interface BottomNavProps {
  active: 'inicio' | 'camera' | 'galeria' | 'agenda' | 'exportar' | 'config';
  onNavigate: (view: string) => void;
  badges?: Partial<Record<string, number>>;
}

const items = [
  { key: 'inicio', label: 'Inicio', icon: HouseLine },
  { key: 'camera', label: 'Camera', icon: Camera },
  { key: 'galeria', label: 'Galeria', icon: Images, href: '/galeria' },
  { key: 'agenda', label: 'Agenda', icon: CalendarDots },
  { key: 'exportar', label: 'Exportar', icon: Download },
  { key: 'config', label: 'Config', icon: GearSix },
] as const;

export default function BottomNav({ active, onNavigate, badges }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[55] glass-subtle border-t border-base-border/50" role="navigation" aria-label="Navegacao principal">
      <div className="max-w-2xl mx-auto flex items-center justify-around py-2 px-2">
        {items.map((item) => {
          const isActive = active === item.key;
          const badgeCount = badges?.[item.key] ?? 0;
          const showBadge = badgeCount > 0;
          return (
            <button
              key={item.key}
              onClick={() => {
                haptic('selection');
                if ('href' in item && item.href) {
                  window.location.href = item.href;
                } else {
                  onNavigate(item.key);
                }
              }}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-2.5 min-h-[44px] rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                isActive ? 'text-accent' : 'text-content-tertiary hover:text-content'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-0.5 w-8 h-0.5 rounded-full bg-accent"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative">
                <item.icon size={20} weight={isActive ? 'duotone' : 'regular'} />
                <AnimatePresence>
                  {showBadge && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center px-1 text-[9px] font-bold text-white bg-danger rounded-full"
                    >
                      <motion.span
                        key={badgeCount}
                        initial={{ y: -8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="tabular-nums"
                      >
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </motion.span>
                      <motion.span
                        className="absolute inset-0 rounded-full bg-danger"
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ opacity: 0.4, zIndex: -1 }}
                      />
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
