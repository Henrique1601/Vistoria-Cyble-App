'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MagnifyingGlass,
  Trash,
  Camera,
  ArrowUpRight,
  CloudCheck,
  CloudSlash,
  Download,
  FloppyDisk,
  GearSix,
  Lock,
  LockOpen,
  Note,
  ShareNetwork,
  X,
  Warning,
  Clock,
} from '@phosphor-icons/react';
import {
  getAuditLog,
  searchAuditLog,
  clearAuditLog,
  getActionLabel,
  getActionColor,
  type AuditEntry,
  type AuditAction,
} from '@/lib/auditLog';
import { haptic } from '@/lib/haptic';
import { spring } from '@/lib/motion';

const ACTION_ICONS: Partial<Record<AuditAction, React.ReactNode>> = {
  photo_captured: <Camera size={14} weight="duotone" />,
  photo_deleted: <Trash size={14} weight="duotone" />,
  photo_annotated: <Note size={14} weight="duotone" />,
  photo_shared: <ShareNetwork size={14} weight="duotone" />,
  sync_started: <ArrowUpRight size={14} weight="duotone" />,
  sync_completed: <CloudCheck size={14} weight="duotone" />,
  sync_failed: <CloudSlash size={14} weight="duotone" />,
  export_csv: <Download size={14} weight="duotone" />,
  export_pdf: <Download size={14} weight="duotone" />,
  export_xlsx: <Download size={14} weight="duotone" />,
  export_zip: <Download size={14} weight="duotone" />,
  export_html: <Download size={14} weight="duotone" />,
  backup_created: <FloppyDisk size={14} weight="duotone" />,
  backup_restored: <FloppyDisk size={14} weight="duotone" />,
  settings_changed: <GearSix size={14} weight="duotone" />,
  login: <LockOpen size={14} weight="duotone" />,
  logout: <Lock size={14} weight="duotone" />,
};

const FILTER_OPTIONS: { value: AuditAction | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'photo_captured', label: 'Fotos' },
  { value: 'sync_completed', label: 'Sync' },
  { value: 'export_pdf', label: 'Exports' },
  { value: 'backup_created', label: 'Backup' },
  { value: 'settings_changed', label: 'Config' },
];

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60000) return 'Agora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;

  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditLogScreen({ onVoltar }: { onVoltar: () => void }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<AuditAction | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = search
      ? await searchAuditLog(search)
      : await getAuditLog(200, filter === 'all' ? undefined : filter);
    setEntries(data);
    setLoading(false);
  }, [filter, search]);

  useEffect(() => {
    load();
  }, [load]);

  function handleClear() {
    haptic('medium');
    if (confirm('Limpar todo o histórico de atividades?')) {
      clearAuditLog().then(load);
    }
  }

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
            <h1 className="text-xl font-semibold tracking-tight">Histórico de Atividades</h1>
            <p className="text-xs text-content-tertiary">{entries.length} registro(s)</p>
          </div>
          <button
            onClick={handleClear}
            className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-danger hover:border-danger/30 transition-colors"
            aria-label="Limpar histórico"
          >
            <Trash size={16} weight="bold" />
          </button>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="relative mb-4"
        >
          <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no histórico..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-base-raised border border-base-border text-sm text-content placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="flex gap-1.5 mb-4 overflow-x-auto pb-1"
        >
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { haptic('light'); setFilter(opt.value); setSearch(''); }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                filter === opt.value
                  ? 'bg-accent text-base'
                  : 'bg-base-overlay text-content-secondary border border-base-border hover:text-content'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </motion.div>

        {/* Log entries */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-base-overlay animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Clock size={32} weight="duotone" className="text-content-tertiary mx-auto mb-3" />
            <p className="text-sm text-content-tertiary">
              {search ? 'Nenhum resultado para essa busca' : 'Nenhuma atividade registrada'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={spring}
                  className="bg-base-raised border border-base-border rounded-xl px-3 py-2.5 flex items-start gap-3"
                >
                  <div className={`mt-0.5 flex-shrink-0 ${getActionColor(entry.action)}`}>
                    {ACTION_ICONS[entry.action] ?? <Clock size={14} weight="duotone" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${getActionColor(entry.action)}`}>
                        {getActionLabel(entry.action)}
                      </span>
                      {entry.meta?.bloco && (
                        <span className="text-[10px] text-content-tertiary font-mono">
                          {entry.meta.bloco}
                          {entry.meta.apartamento && `/${entry.meta.apartamento}`}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-content-secondary mt-0.5 truncate">{entry.details}</p>
                  </div>
                  <span className="text-[10px] text-content-tertiary whitespace-nowrap flex-shrink-0">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}
