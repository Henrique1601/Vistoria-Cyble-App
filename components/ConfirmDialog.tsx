'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Warning, Trash } from '@phosphor-icons/react';
import { spring } from '@/lib/motion';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  console.warn(`[ConfirmDialog] open:${open} title:"${title}"`);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-base/80 backdrop-blur-sm z-[80] flex items-center justify-center px-6"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
            className="bg-base-raised border border-base-border rounded-2xl p-6 max-w-sm w-full shadow-xl"
          >
            <div className={`w-12 h-12 rounded-full ${variant === 'danger' ? 'bg-danger-dim' : 'bg-warn-dim'} flex items-center justify-center mx-auto mb-4`}>
              {variant === 'danger' ? (
                <Trash size={20} weight="bold" className="text-danger" />
              ) : (
                <Warning size={20} weight="bold" className="text-warn" />
              )}
            </div>
            <h3 className="text-lg font-bold text-content text-center mb-2">{title}</h3>
            <p className="text-sm text-content-secondary text-center mb-6 leading-relaxed">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="tactile-press flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-base-overlay text-content-secondary hover:text-content transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`tactile-press flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  variant === 'danger'
                    ? 'bg-danger text-white hover:bg-danger/90'
                    : 'bg-warn text-base hover:bg-warn/90'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
