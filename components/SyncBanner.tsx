'use client';

import { motion } from 'framer-motion';
import { CloudSlash, ArrowClockwise, UploadSimple } from '@phosphor-icons/react';
import { spring } from '@/lib/motion';

interface SyncBannerProps {
  online: boolean;
  pendentes: number;
  isSyncing?: boolean;
  onClick?: () => void;
  onSyncNow?: () => void;
}

export function SyncBanner({ online, pendentes, isSyncing = false, onClick, onSyncNow }: SyncBannerProps) {
  if (pendentes === 0 && !isSyncing) return null;

  // Estado 1: Em sincronização ativa
  if (isSyncing) {
    return (
      <motion.button
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={spring}
        role="status"
        aria-live="polite"
        onClick={onClick}
        className="fixed bottom-16 left-2 right-2 border border-accent bg-accent/95 text-base px-4 py-3 text-xs font-semibold flex justify-between items-center z-[60] backdrop-blur-md cursor-pointer hover:opacity-90 transition-opacity rounded-2xl shadow-lg"
      >
        <span className="flex items-center gap-2">
          <ArrowClockwise size={15} weight="bold" className="animate-[spin-slow_2s_linear_infinite]" />
          <span>Sincronizando fotos...</span>
        </span>
        <span className="font-mono tabular-nums bg-base/20 px-2 py-0.5 rounded-lg">
          {pendentes} foto{pendentes > 1 ? 's' : ''}
        </span>
      </motion.button>
    );
  }

  // Estado 2: Online com fotos locais aguardando disparo
  if (online && pendentes > 0) {
    return (
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={spring}
        role="status"
        aria-live="polite"
        onClick={onClick}
        className="fixed bottom-16 left-2 right-2 border border-accent/40 bg-base-raised/95 text-content px-4 py-3 text-xs font-semibold flex justify-between items-center z-[60] backdrop-blur-md cursor-pointer hover:border-accent/60 transition-all rounded-2xl shadow-lg"
      >
        <span className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/40 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
          </span>
          <span className="text-content-secondary">
            Fotos salvas no aparelho • <span className="text-content font-medium">Toque para enviar</span>
          </span>
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono tabular-nums bg-base-overlay border border-base-border px-2 py-0.5 rounded-lg text-content-tertiary">
            {pendentes} foto{pendentes > 1 ? 's' : ''}
          </span>
          {onSyncNow && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSyncNow();
              }}
              className="tactile-press px-2.5 py-1 text-xs font-semibold bg-accent text-base rounded-lg shadow hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              <UploadSimple size={12} weight="bold" />
              <span>Enviar</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Estado 3: Offline (Sem internet)
  return (
    <motion.button
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={spring}
      role="status"
      aria-live="polite"
      onClick={onClick}
      className="fixed bottom-16 left-2 right-2 border border-danger bg-danger/95 text-base px-4 py-3 text-xs font-semibold flex justify-between items-center z-[60] backdrop-blur-md cursor-pointer hover:opacity-90 transition-opacity rounded-2xl shadow-lg"
    >
      <span className="flex items-center gap-2">
        <CloudSlash size={15} weight="bold" aria-hidden="true" />
        <span>Sem internet — fotos salvas no aparelho</span>
      </span>
      <span className="font-mono tabular-nums bg-base/20 px-2 py-0.5 rounded-lg">
        {pendentes} foto{pendentes > 1 ? 's' : ''}
      </span>
    </motion.button>
  );
}
