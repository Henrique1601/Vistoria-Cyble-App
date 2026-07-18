'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowClockwise,
  CloudCheck,
  CloudSlash,
  Hourglass,
  Warning,
  Trash,
  FunnelSimple,
  Camera,
  FileText,
  WifiSlash,
  Play,
  Pause,
  X,
} from '@phosphor-icons/react';
import {
  getQueue,
  getQueueStats,
  loadQueue,
  syncAll,
  retryItem,
  retryFailed,
  clearSuccess,
  cancelSync,
  isSyncing,
  subscribe,
  type SyncQueueItem,
  type SyncStatus,
} from '@/lib/syncQueue';
import { haptic } from '@/lib/haptic';
import { spring } from '@/lib/motion';

const STATUS_CONFIG: Record<SyncStatus, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Hourglass size={12} weight="bold" />, color: 'text-content-tertiary', label: 'Pendente' },
  uploading: { icon: <ArrowClockwise size={12} weight="bold" className="animate-spin" />, color: 'text-accent', label: 'Enviando' },
  success: { icon: <CloudCheck size={12} weight="bold" />, color: 'text-success', label: 'Enviado' },
  failed: { icon: <Warning size={12} weight="bold" />, color: 'text-danger', label: 'Falhou' },
};

const CAT_ICONS: Record<string, React.ReactNode> = {
  cyble_antes: <Camera size={12} weight="duotone" />,
  cyble_depois: <Camera size={12} weight="duotone" />,
  documento: <FileText size={12} weight="duotone" />,
};

const CAT_LABELS: Record<string, string> = {
  cyble_antes: 'Antes',
  cyble_depois: 'Depois',
  documento: 'Doc',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function SyncQueueScreen({ onVoltar }: { onVoltar: () => void }) {
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [stats, setStats] = useState({ pending: 0, uploading: 0, success: 0, failed: 0, total: 0 });
  const [syncing, setSyncing] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | SyncStatus>('todos');
  const [online, setOnline] = useState(true);
  const [pin, setPin] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setItems(getQueue());
    setStats(getQueueStats());
    setSyncing(isSyncing());
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('vistoria_pin');
    setPin(saved);
    setOnline(navigator.onLine);

    loadQueue();
    refresh();

    const unsub = subscribe(refresh);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      unsub();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refresh]);

  // Auto-refresh while syncing
  useEffect(() => {
    if (!syncing) return;
    const interval = setInterval(refresh, 500);
    return () => clearInterval(interval);
  }, [syncing, refresh]);

  function handleSyncAll() {
    haptic('medium');
    if (syncing) {
      cancelSync();
    } else if (pin) {
      syncAll(pin, refresh);
    }
  }

  function handleRetryAll() {
    haptic('medium');
    if (pin) retryFailed(pin);
  }

  function handleRetryItem(item: SyncQueueItem) {
    haptic('light');
    if (pin) retryItem(item, pin);
  }

  function handleClearSuccess() {
    haptic('light');
    clearSuccess();
  }

  const filteredItems = filtro === 'todos' ? items : items.filter((i) => i.status === filtro);
  const progressPct = stats.total > 0 ? Math.round(((stats.success) / stats.total) * 100) : 0;

  return (
    <main className="min-h-[100dvh] bg-base">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={spring}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={onVoltar}
            aria-label="Voltar"
            className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">Fila de Sincronizacao</h1>
            <p className="text-xs text-content-tertiary">
              {stats.pending + stats.uploading} pendente(s)  ·  {stats.success} enviado(s)  ·  {stats.failed} falha(s)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {online ? (
              <span className="flex items-center gap-1 text-[10px] text-success font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-success" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-danger font-medium">
                <WifiSlash size={10} /> Offline
              </span>
            )}
          </div>
        </motion.div>

        {/* Progress bar */}
        {stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-content-tertiary">Progresso</span>
              <span className="text-xs font-semibold tabular-nums">{progressPct}%</span>
            </div>
            <div className="h-2.5 bg-base-overlay rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={spring}
                className="h-full bg-success rounded-full"
              />
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="flex gap-2 mb-4"
        >
          <button
            onClick={handleSyncAll}
            disabled={!online && !syncing}
            className={`tactile-press flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:opacity-40 ${
              syncing
                ? 'bg-danger text-white hover:bg-danger/90'
                : 'bg-accent text-base hover:bg-accent-hover'
            }`}
          >
            {syncing ? (
              <>
                <Pause size={16} weight="bold" />
                Cancelar
              </>
            ) : (
              <>
                <Play size={16} weight="bold" />
                Sincronizar Tudo
              </>
            )}
          </button>
          {stats.failed > 0 && (
            <button
              onClick={handleRetryAll}
              className="tactile-press flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all"
            >
              <ArrowClockwise size={14} weight="bold" />
              Retry
            </button>
          )}
          {stats.success > 0 && (
            <button
              onClick={handleClearSuccess}
              className="tactile-press flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all"
            >
              <Trash size={14} weight="bold" />
            </button>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
          className="flex gap-1.5 mb-4"
        >
          {(['todos', 'pending', 'uploading', 'success', 'failed'] as const).map((f) => {
            const count = f === 'todos' ? stats.total : stats[f === 'uploading' ? 'uploading' : f];
            return (
              <button
                key={f}
                onClick={() => { haptic('light'); setFiltro(f); }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  filtro === f
                    ? 'bg-accent text-base'
                    : 'bg-base-overlay text-content-secondary border border-base-border hover:text-content'
                }`}
              >
                {f === 'todos' ? 'Todos' : f === 'pending' ? 'Pendente' : f === 'uploading' ? 'Enviando' : f === 'success' ? 'Enviado' : 'Falhou'}
                {count > 0 && ` (${count})`}
              </button>
            );
          })}
        </motion.div>

        {/* Queue list */}
        <div className="space-y-2">
          {filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              {items.length === 0 ? (
                <>
                  <CloudCheck size={32} weight="duotone" className="text-success mx-auto mb-3" />
                  <p className="text-sm text-content-tertiary">Tudo sincronizado!</p>
                </>
              ) : (
                <>
                  <FunnelSimple size={24} weight="duotone" className="text-content-tertiary mx-auto mb-2" />
                  <p className="text-sm text-content-tertiary">Nenhum item neste filtro</p>
                </>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => {
                const st = STATUS_CONFIG[item.status];
                return (
                  <motion.div
                    key={item.foto.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={spring}
                    className="bg-base-raised border border-base-border rounded-xl p-3 flex items-center gap-3"
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg bg-base-overlay border border-base-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.foto.blob?.size > 0 ? (
                        <div className="w-full h-full flex items-center justify-center">
                          {CAT_ICONS[item.foto.categoria]}
                        </div>
                      ) : (
                        CAT_ICONS[item.foto.categoria]
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-content">{item.foto.apartamento}</span>
                        <span className="text-[10px] text-content-tertiary">{item.foto.bloco}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-content-tertiary flex items-center gap-1">
                          {CAT_ICONS[item.foto.categoria]}
                          {CAT_LABELS[item.foto.categoria]}
                        </span>
                        <span className="text-[10px] text-content-tertiary">{formatTime(item.foto.timestamp)}</span>
                      </div>
                      {item.lastError && (
                        <p className="text-[10px] text-danger mt-0.5 truncate">{item.lastError}</p>
                      )}
                      {item.attempts > 0 && item.status === 'failed' && (
                        <p className="text-[10px] text-content-tertiary mt-0.5">
                          Tentativa {item.attempts}/{5}
                        </p>
                      )}
                    </div>

                    {/* Status + action */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`flex items-center gap-1 text-[10px] font-medium ${st.color}`}>
                        {st.icon}
                        {st.label}
                      </span>
                      {item.status === 'failed' && (
                        <button
                          onClick={() => handleRetryItem(item)}
                          className="tactile-press w-7 h-7 rounded-lg bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary hover:text-accent hover:border-accent/30 transition-colors"
                          aria-label="Tentar novamente"
                        >
                          <ArrowClockwise size={12} weight="bold" />
                        </button>
                      )}
                      {item.status === 'success' && (
                        <button
                          onClick={() => {
                            haptic('light');
                            // Remove from queue visually
                            setItems((prev) => prev.filter((i) => i.foto.id !== item.foto.id));
                          }}
                          className="tactile-press w-7 h-7 rounded-lg bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary hover:text-content transition-colors"
                          aria-label="Dispensar"
                        >
                          <X size={12} weight="bold" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </main>
  );
}
