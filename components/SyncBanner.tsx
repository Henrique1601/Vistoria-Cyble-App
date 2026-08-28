'use client';

import { motion } from 'framer-motion';
import { CloudSlash, ArrowClockwise } from '@phosphor-icons/react';
import { spring } from '@/lib/motion';

interface SyncBannerProps {
  online: boolean;
  pendentes: number;
  onClick?: () => void;
}

export function SyncBanner({ online, pendentes, onClick }: SyncBannerProps) {
  if (pendentes === 0) return null;
  return (
    <motion.button
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={spring}
      role="status"
      aria-live="polite"
      onClick={onClick}
      className={`fixed bottom-16 left-2 right-2 border px-4 py-3 text-xs font-semibold flex justify-between items-center z-[60] backdrop-blur-md cursor-pointer hover:opacity-90 transition-opacity rounded-2xl shadow-lg ${
        online
          ? 'bg-accent/95 border-accent text-base'
          : 'bg-danger/95 border-danger text-base'
      }`}
    >
      <span className="flex items-center gap-2">
        {online ? (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-base/40 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-base" />
          </span>
        ) : (
          <CloudSlash size={14} weight="bold" aria-hidden="true" />
        )}
        {online && <ArrowClockwise size={14} weight="bold" className="animate-[spin-slow_2s_linear_infinite]" />}
        {online ? 'Sincronizando...' : 'Sem internet — fotos salvas no aparelho'}
      </span>
      <span className="font-mono tabular-nums bg-base/20 px-2 py-0.5 rounded-lg">{pendentes} foto{pendentes > 1 ? 's' : ''}</span>
    </motion.button>
  );
}
