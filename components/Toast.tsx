'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, createContext, useContext, useCallback, useRef } from 'react';
import { CheckCircle, Warning, Info, X, ArrowUUpLeft } from '@phosphor-icons/react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onUndo?: () => void;
  undoLabel?: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, opts?: { duration?: number; onUndo?: () => void; undoLabel?: string }) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  const toast = useCallback((
    message: string,
    type: ToastType = 'info',
    opts?: { duration?: number; onUndo?: () => void; undoLabel?: string }
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const duration = opts?.duration ?? 4000;
    const newToast: Toast = { id, message, type, duration, onUndo: opts?.onUndo, undoLabel: opts?.undoLabel };
    setToasts((prev) => [...prev.slice(-4), newToast]);
    if (duration > 0) {
      const timer = setTimeout(() => removeToast(id), duration);
      timersRef.current.set(id, timer);
    }
  }, [removeToast]);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={16} weight="duotone" className="text-success flex-shrink-0" />,
    error: <Warning size={16} weight="duotone" className="text-danger flex-shrink-0" />,
    info: <Info size={16} weight="duotone" className="text-accent flex-shrink-0" />,
    warning: <Warning size={16} weight="duotone" className="text-warning flex-shrink-0" />,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 left-0 right-0 z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="pointer-events-auto w-full max-w-sm bg-base-raised border border-base-border rounded-xl px-4 py-3 shadow-lg backdrop-blur-md flex items-center gap-3"
            >
              {icons[t.type]}
              <span className="text-sm text-content flex-1">{t.message}</span>
              {t.onUndo && (
                <button
                  onClick={() => { t.onUndo?.(); removeToast(t.id); }}
                  className="tactile-press flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
                >
                  <ArrowUUpLeft size={14} weight="bold" />
                  {t.undoLabel || 'Desfazer'}
                </button>
              )}
              <button
                onClick={() => removeToast(t.id)}
                className="text-content-tertiary hover:text-content transition-colors flex-shrink-0"
                aria-label="Fechar"
              >
                <X size={14} weight="bold" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
