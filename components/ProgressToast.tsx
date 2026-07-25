'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, createContext, useContext, useCallback, useRef } from 'react';
import { CloudCheck, Warning, X, Spinner, CheckCircle } from '@phosphor-icons/react';

interface ProgressToastData {
  id: string;
  message: string;
  current: number;
  total: number;
  status: 'syncing' | 'success' | 'error';
  errorMessage?: string;
}

interface ProgressToastContextValue {
  showSyncProgress: (message: string, total: number) => string;
  updateSyncProgress: (id: string, current: number, overrides?: Partial<Pick<ProgressToastData, 'status' | 'errorMessage'>>) => void;
  dismissSyncProgress: (id: string) => void;
}

const ProgressToastContext = createContext<ProgressToastContextValue>({
  showSyncProgress: () => '',
  updateSyncProgress: () => {},
  dismissSyncProgress: () => {},
});

export function useSyncProgress() {
  return useContext(ProgressToastContext);
}

export function ProgressToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ProgressToastData[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissSyncProgress = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  const showSyncProgress = useCallback((message: string, total: number) => {
    const id = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ProgressToastData = { id, message, current: 0, total, status: 'syncing' };
    setToasts((prev) => [...prev.slice(-2), newToast]);
    return id;
  }, []);

  const updateSyncProgress = useCallback((
    id: string,
    current: number,
    overrides?: Partial<Pick<ProgressToastData, 'status' | 'errorMessage'>>
  ) => {
    setToasts((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const updated = { ...t, current, ...overrides };
      // Auto-dismiss after success/error with delay
      if (overrides?.status === 'success' || overrides?.status === 'error') {
        const delay = overrides.status === 'success' ? 3000 : 6000;
        const timer = setTimeout(() => dismissSyncProgress(id), delay);
        timersRef.current.set(id, timer);
      }
      return updated;
    }));
  }, [dismissSyncProgress]);

  return (
    <ProgressToastContext.Provider value={{ showSyncProgress, updateSyncProgress, dismissSyncProgress }}>
      {children}
      <div className="fixed bottom-20 left-0 right-0 z-[85] flex flex-col items-center gap-2 px-4 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ProgressToastItem key={t.id} data={t} onDismiss={dismissSyncProgress} />
          ))}
        </AnimatePresence>
      </div>
    </ProgressToastContext.Provider>
  );
}

function ProgressToastItem({ data, onDismiss }: { data: ProgressToastData; onDismiss: (id: string) => void }) {
  const { id, message, current, total, status, errorMessage } = data;
  const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;
  const isSyncing = status === 'syncing';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <motion.div
      layout
      initial={{ y: 40, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -10, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="pointer-events-auto w-full max-w-sm bg-base-raised border border-base-border rounded-xl shadow-lg backdrop-blur-md overflow-hidden"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        {/* Status icon */}
        <div className="flex-shrink-0 relative">
          {isSyncing && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Spinner size={18} weight="bold" className="text-accent" />
            </motion.div>
          )}
          {isSuccess && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <CheckCircle size={18} weight="duotone" className="text-success" />
            </motion.div>
          )}
          {isError && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <Warning size={18} weight="duotone" className="text-danger" />
            </motion.div>
          )}
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-content truncate">{message}</p>
          {isSyncing && (
            <p className="text-xs text-content-tertiary mt-0.5">
              {current} de {total} foto{total !== 1 ? 's' : ''}
            </p>
          )}
          {isSuccess && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-success mt-0.5"
            >
              {total} foto{total !== 1 ? 's' : ''} sincronizada{total !== 1 ? 's' : ''}
            </motion.p>
          )}
          {isError && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-danger mt-0.5"
            >
              {errorMessage || 'Falha na sincronização'}
            </motion.p>
          )}
        </div>

        {/* Percentage / Close */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isSyncing && (
            <span className="text-xs font-mono font-semibold text-accent tabular-nums">{pct}%</span>
          )}
          <button
            onClick={() => onDismiss(id)}
            className="text-content-tertiary hover:text-content transition-colors"
            aria-label="Fechar"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="h-1.5 bg-base-overlay rounded-full overflow-hidden relative">
          {/* Track shimmer when syncing */}
          {isSyncing && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(232,130,58,0.08) 40%, rgba(232,130,58,0.15) 50%, rgba(232,130,58,0.08) 60%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
              }}
            />
          )}
          {/* Fill bar */}
          <motion.div
            className={`h-full rounded-full relative ${
              isSuccess ? 'bg-success' : isError ? 'bg-danger' : 'bg-accent'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Shimmer overlay on the fill bar */}
            {isSyncing && (
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                }}
              />
            )}
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </motion.div>
  );
}
