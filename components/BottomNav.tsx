'use client';

import { motion } from 'framer-motion';
import {
  HouseLine,
  Camera,
  Images,
  Download,
  GearSix,
} from '@phosphor-icons/react';
import { haptic } from '@/lib/haptic';

interface BottomNavProps {
  active: 'inicio' | 'camera' | 'galeria' | 'exportar' | 'config';
  onNavigate: (view: string) => void;
}

const items = [
  { key: 'inicio', label: 'Inicio', icon: HouseLine },
  { key: 'camera', label: 'Camera', icon: Camera },
  { key: 'galeria', label: 'Galeria', icon: Images, href: '/galeria' },
  { key: 'exportar', label: 'Exportar', icon: Download },
  { key: 'config', label: 'Config', icon: GearSix },
] as const;

export default function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[55] bg-base-raised/95 backdrop-blur-lg border-t border-base-border" role="navigation" aria-label="Navegacao principal">
      <div className="max-w-2xl mx-auto flex items-center justify-around py-2 px-2">
        {items.map((item) => {
          const isActive = active === item.key;
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
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
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
              <item.icon size={20} weight={isActive ? 'duotone' : 'regular'} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
