'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellRinging,
  CloudCheck,
  CloudSlash,
  ArrowDown,
  ArrowClockwise,
  Warning,
  CheckCircle,
  Trash,
  X,
} from '@phosphor-icons/react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearAll,
  subscribe,
  type Notificacao,
} from '@/lib/notifications';
import { haptic } from '@/lib/haptic';

const ICON_MAP: Record<Notificacao['tipo'], React.ReactNode> = {
  sync: <CloudCheck size={16} weight="duotone" className="text-success" />,
  success: <CheckCircle size={16} weight="duotone" className="text-success" />,
  backup: <ArrowDown size={16} weight="duotone" className="text-accent" />,
  update: <ArrowClockwise size={16} weight="duotone" className="text-accent" />,
  storage: <Warning size={16} weight="duotone" className="text-warn" />,
  error: <CloudSlash size={16} weight="duotone" className="text-danger" />,
};

function tempoRelativo(ts: number): string {
  const diff = Date.now() - ts;
  const seg = Math.floor(diff / 1000);
  if (seg < 60) return 'agora';
  const min = Math.floor(seg / 60);
  if (min < 60) return `${min}min atras`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atras`;
  const d = Math.floor(h / 24);
  return `${d}d atras`;
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacao[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    setNotifs(getNotifications());
    setUnread(getUnreadCount());
  }, []);

  useEffect(() => {
    refresh();
    return subscribe(refresh);
  }, [refresh]);

  function handleToggle() {
    haptic('light');
    if (open) {
      setOpen(false);
    } else {
      markAllAsRead();
      refresh();
      setOpen(true);
    }
  }

  function handleClick(n: Notificacao) {
    haptic('light');
    markAsRead(n.id);
    refresh();
    if (n.onAcao) {
      n.onAcao();
      setOpen(false);
    }
  }

  function handleClear() {
    haptic('medium');
    clearAll();
    refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        aria-label={`Notificacoes${unread > 0 ? ` (${unread} nao lidas)` : ''}`}
        className="tactile-press relative w-9 h-9 rounded-xl bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
      >
        {unread > 0 ? (
          <BellRinging size={16} weight="duotone" />
        ) : (
          <Bell size={16} weight="regular" />
        )}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-[10px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] bg-base-raised border border-base-border rounded-2xl shadow-diffusion overflow-hidden z-[90]"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-base-border">
                <span className="text-sm font-semibold text-content">Notificacoes</span>
                <div className="flex items-center gap-2">
                  {notifs.length > 0 && (
                    <button
                      onClick={handleClear}
                      className="text-xs text-content-tertiary hover:text-danger transition-colors"
                      aria-label="Limpar todas"
                    >
                      <Trash size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="text-content-tertiary hover:text-content transition-colors"
                    aria-label="Fechar"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[calc(70vh-48px)]">
                {notifs.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={24} weight="light" className="text-content-tertiary mx-auto mb-2" />
                    <p className="text-xs text-content-tertiary">Nenhuma notificacao</p>
                  </div>
                ) : (
                  notifs.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-base-overlay/50 transition-colors border-b border-base-border/50 last:border-0 ${
                        !n.lida ? 'bg-accent/5' : ''
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">{ICON_MAP[n.tipo]}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-content truncate">{n.titulo}</span>
                          {!n.lida && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-content-tertiary mt-0.5 line-clamp-2">{n.mensagem}</p>
                        <span className="text-[10px] text-content-tertiary/60 mt-1 block">{tempoRelativo(n.timestamp)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
