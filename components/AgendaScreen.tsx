'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDots,
  CheckCircle,
  Circle,
  Trash,
  ArrowRight,
  Plus,
  Warning,
  PencilSimple,
  Share,
  FilePdf,
  MagnifyingGlass,
  X,
  GoogleLogo,
} from '@phosphor-icons/react';
import { haptic } from '@/lib/haptic';
import { authFetch } from '@/lib/api';
import { hoje } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import ShareAgendaModal from '@/components/ShareAgendaModal';
import { exportarAgendaPDF } from '@/lib/export/agendaPdf';
import { verificarLembretes, requestNotificationPermission } from '@/lib/notificationsPush';
import { compartilharICS, abrirGoogleCalendar } from '@/lib/googleCalendar';
import {
  listarAgendamentos,
  toggleConcluidoAgendamento,
  excluirAgendamento,
} from '@/lib/db';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface Agendamento {
  id: number;
  bloco: string;
  apartamento: string;
  data: string;
  hora?: string;
  concluido: boolean;
  observacao: string | null;
  criado_em: string;
}

/** Convert IndexedDB Agendamento (criadoEm: number) to screen Agendamento (criado_em: string) */
function toScreenAgendamento(ag: { id?: number; bloco: string; apartamento: string; data: string; hora?: string; concluido: boolean; observacao?: string | null; criadoEm?: number; criado_em?: string }): Agendamento {
  return {
    id: ag.id || 0,
    bloco: ag.bloco,
    apartamento: ag.apartamento,
    data: ag.data,
    hora: ag.hora,
    concluido: ag.concluido,
    observacao: ag.observacao || null,
    criado_em: ag.criado_em || (ag.criadoEm ? new Date(ag.criadoEm).toISOString() : ''),
  };
}

function formatarDataBR(data: string): string {
  const [y, m, d] = data.split('-');
  return `${d}/${m}/${y}`;
}

function compararAgendamentos(a: Agendamento, b: Agendamento): number {
  const dataCmp = a.data.localeCompare(b.data);
  if (dataCmp !== 0) return dataCmp;
  return (a.hora || '99:99').localeCompare(b.hora || '99:99');
}

interface AgendaScreenProps {
  onNavegarPara: (bloco: string, apto: string) => void;
  onVoltar: () => void;
  onNovoAgendamento: () => void;
  onEditar: (agendamento: Agendamento) => void;
}

export default function AgendaScreen({
  onNavegarPara,
  onVoltar,
  onNovoAgendamento,
  onEditar,
}: AgendaScreenProps) {
  const { toast } = useToast();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const agendamentosRef = useRef(agendamentos);
  agendamentosRef.current = agendamentos;
  const [loading, setLoading] = useState(true);
  const [filtroTorre, setFiltroTorre] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [busca, setBusca] = useState('');
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const today = hoje();

  const carregar = useCallback(async () => {
    try {
      // 1. Load from IndexedDB first (works offline)
      const local = await listarAgendamentos();
      setAgendamentos(local.map(toScreenAgendamento));
      // Check for reminders
      requestNotificationPermission().then(() => {
        verificarLembretes(local);
      });
    } catch {
      // IndexedDB read failed — continue
    } finally {
      setLoading(false);
    }
    // 2. If online, sync from server and MERGE (don't overwrite local)
    if (navigator.onLine) {
      try {
        const resp = await authFetch('/api/agendamentos');
        const data = await resp.json();
        if (data.agendamentos && Array.isArray(data.agendamentos)) {
          const serverList = data.agendamentos.map(toScreenAgendamento);
          setAgendamentos((prev) => {
            // Merge: keep local items not on server, add server items not local
            const localIds = new Set(prev.map((a: Agendamento) => a.id));
            const serverIds = new Set(serverList.map((a: Agendamento) => a.id));
            const localOnly = prev.filter((a: Agendamento) => !serverIds.has(a.id));
            const serverOnly = serverList.filter((a: Agendamento) => !localIds.has(a.id));
            const both = serverList.filter((a: Agendamento) => localIds.has(a.id));
            return [...localOnly, ...serverOnly, ...both].sort(compararAgendamentos);
          });
        }
      } catch {
        // offline fallback — keep what we have from IndexedDB
      }
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleToggle = useCallback(async (ag: Agendamento) => {
    haptic('light');
    const novoConcluido = !ag.concluido;
    // Optimistic update on screen
    setAgendamentos((prev) =>
      prev.map((a) => (a.id === ag.id ? { ...a, concluido: novoConcluido } : a))
    );
    try {
      // 1. Save to IndexedDB (works offline)
      if (ag.id) {
        await toggleConcluidoAgendamento(ag.id);
      }
      // 2. Sync to server if online
      if (navigator.onLine) {
        await authFetch('/api/agendamentos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: ag.id, concluido: novoConcluido }),
        });
      }
    } catch {
      // rollback
      setAgendamentos((prev) =>
        prev.map((a) => (a.id === ag.id ? { ...a, concluido: !novoConcluido } : a))
      );
    }
  }, []);

  const handleExcluir = useCallback(async (id: number) => {
    haptic('medium');
    setConfirmDeleteId(id);
  }, []);

  const confirmExcluir = useCallback(async () => {
    if (confirmDeleteId === null) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    haptic('medium');
    const anteriores = agendamentosRef.current;
    setAgendamentos((prev) => prev.filter((a) => a.id !== id));
    try {
      // 1. Delete from IndexedDB (works offline)
      await excluirAgendamento(id);
      // 2. Sync to server if online
      if (navigator.onLine) {
        await authFetch('/api/agendamentos', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
      }
      toast('Agendamento excluido', 'success');
    } catch {
      setAgendamentos(anteriores);
      toast('Erro ao excluir agendamento', 'error');
    }
  }, [confirmDeleteId, toast]);

  const agendamentosFiltrados = useMemo(() => {
    let filtered = agendamentos;

    // Filter by tower
    if (filtroTorre) {
      filtered = filtered.filter((a) => a.bloco === filtroTorre);
    }

    // Filter by search text
    if (busca.trim()) {
      const termo = busca.toLowerCase().trim();
      filtered = filtered.filter(
        (a) =>
          a.bloco.toLowerCase().includes(termo) ||
          a.apartamento.toLowerCase().includes(termo) ||
          (a.observacao && a.observacao.toLowerCase().includes(termo)),
      );
    }

    return filtered;
  }, [agendamentos, filtroTorre, busca]);

  const handleExportPdf = useCallback(async () => {
    haptic('light');
    setExportandoPdf(true);
    try {
      await exportarAgendaPDF(agendamentosFiltrados, 'Agenda de Vistorias');
      toast('PDF gerado com sucesso', 'success');
    } catch {
      toast('Erro ao gerar PDF', 'error');
    } finally {
      setExportandoPdf(false);
    }
  }, [agendamentosFiltrados, toast]);

  const handleExportIcs = useCallback(async () => {
    haptic('light');
    try {
      await compartilharICS(agendamentosFiltrados);
      toast('Calendario exportado', 'success');
    } catch {
      toast('Erro ao exportar calendario', 'error');
    }
  }, [agendamentosFiltrados, toast]);

  const torres = useMemo(() => [...new Set(agendamentos.map((a) => a.bloco))].sort(), [agendamentos]);

  const atrasados = agendamentosFiltrados.filter((a) => !a.concluido && a.data < today).sort(compararAgendamentos);
  const hojeLista = agendamentosFiltrados.filter((a) => !a.concluido && a.data === today).sort(compararAgendamentos);
  const futuros = agendamentosFiltrados.filter((a) => !a.concluido && a.data > today).sort(compararAgendamentos);
  const concluidos = agendamentosFiltrados.filter((a) => a.concluido).sort(compararAgendamentos);

  function renderGrupo(titulo: string, items: Agendamento[], cor: string) {
    if (items.length === 0) return null;
    return (
      <div className="mb-5">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${cor} mb-2 px-1`}>
          {titulo} ({items.length})
        </h3>
        <div className="space-y-2">
          {items.map((ag) => (
            <motion.div
              key={ag.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring}
              className={`flex items-center gap-3 bg-base-raised border border-base-border rounded-xl px-4 py-3 ${
                ag.concluido ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() => handleToggle(ag)}
                className="shrink-0"
                aria-label={ag.concluido ? 'Marcar como pendente' : 'Marcar como concluido'}
              >
                {ag.concluido ? (
                  <CheckCircle size={22} weight="fill" className="text-success" />
                ) : (
                  <Circle size={22} weight="regular" className="text-content-tertiary" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-content truncate">{ag.bloco}</span>
                  <span className="text-sm text-content-secondary font-mono">{ag.apartamento}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-mono text-content-tertiary">
                    {formatarDataBR(ag.data)}
                    {ag.hora && <span className="ml-1.5 text-accent font-semibold">{ag.hora}</span>}
                  </span>
                  {ag.observacao && (
                    <span className="text-[11px] text-content-tertiary truncate">— {ag.observacao}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    haptic('light');
                    abrirGoogleCalendar(ag);
                  }}
                  className="tactile-press flex items-center justify-center w-9 h-9 rounded-lg text-content-tertiary hover:text-[#4285F4] hover:bg-[#4285F4]/10 transition-colors"
                  aria-label="Abrir no Google Calendar"
                >
                  <GoogleLogo size={14} weight="bold" />
                </button>
                <button
                  onClick={() => onNavegarPara(ag.bloco, ag.apartamento)}
                  className="tactile-press flex items-center justify-center w-9 h-9 rounded-lg bg-accent-dim text-accent hover:bg-accent/20 transition-colors"
                  aria-label={`Ir para ${ag.bloco} ${ag.apartamento}`}
                >
                  <ArrowRight size={16} weight="bold" />
                </button>
                <button
                  onClick={() => onEditar(ag)}
                  className="tactile-press flex items-center justify-center w-9 h-9 rounded-lg text-content-tertiary hover:text-accent hover:bg-accent/10 transition-colors"
                  aria-label="Editar agendamento"
                >
                  <PencilSimple size={14} weight="bold" />
                </button>
                <button
                  onClick={() => handleExcluir(ag.id)}
                  className="tactile-press flex items-center justify-center w-9 h-9 rounded-lg text-content-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                  aria-label="Excluir agendamento"
                >
                  <Trash size={14} weight="bold" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base p-4 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onVoltar}
            className="tactile-press flex items-center justify-center w-10 h-10 rounded-xl bg-base-raised border border-base-border text-content-secondary hover:text-content transition-colors"
            aria-label="Voltar"
          >
            <ArrowRight size={18} weight="bold" className="rotate-180" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-content flex items-center gap-2">
              <CalendarDots size={20} weight="duotone" className="text-accent" />
              Agenda
            </h1>
            <p className="text-xs text-content-tertiary">
              {agendamentos.filter((a) => !a.concluido).length} pendente(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {agendamentos.length > 0 && (
            <>
              <button
                onClick={handleExportPdf}
                disabled={exportandoPdf}
                className="tactile-press flex items-center justify-center w-10 h-10 rounded-xl bg-base-raised border border-base-border text-content-secondary hover:text-danger hover:border-danger transition-colors disabled:opacity-50"
                aria-label="Exportar agenda como PDF"
              >
                {exportandoPdf ? (
                  <div className="w-4 h-4 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FilePdf size={16} weight="bold" />
                )}
              </button>
              <button
                onClick={handleExportIcs}
                className="tactile-press flex items-center justify-center w-10 h-10 rounded-xl bg-base-raised border border-base-border text-content-secondary hover:text-[#4285F4] hover:border-[#4285F4] transition-colors"
                aria-label="Exportar para Google Calendar"
              >
                <GoogleLogo size={16} weight="bold" />
              </button>
              <button
                onClick={() => {
                  haptic('light');
                  setShowShareModal(true);
                }}
                className="tactile-press flex items-center justify-center w-10 h-10 rounded-xl bg-base-raised border border-base-border text-content-secondary hover:text-accent hover:border-accent transition-colors"
                aria-label="Compartilhar agenda"
              >
                <Share size={16} weight="bold" />
              </button>
            </>
          )}
          <button
            onClick={onNovoAgendamento}
            className="tactile-press flex items-center justify-center w-10 h-10 rounded-xl bg-accent text-base hover:bg-accent-hover transition-colors"
            aria-label="Novo agendamento"
          >
            <Plus size={18} weight="bold" />
          </button>
        </div>
      </motion.div>

      {/* Tower filter */}
      {torres.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="flex gap-1.5 mb-4 overflow-x-auto pb-1"
        >
          <button
            onClick={() => setFiltroTorre('')}
            className={`tactile-press px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all whitespace-nowrap ${
              !filtroTorre
                ? 'bg-accent-dim border-accent text-accent'
                : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
            }`}
          >
            Todas
          </button>
          {torres.map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTorre(t)}
              className={`tactile-press px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all whitespace-nowrap ${
                filtroTorre === t
                  ? 'bg-accent-dim border-accent text-accent'
                  : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
              }`}
            >
              {t}
            </button>
          ))}
        </motion.div>
      )}

      {/* Search */}
      {agendamentos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
          className="relative mb-4"
        >
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por torre, apto ou observacao..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-base-raised border border-base-border text-sm text-content placeholder:text-content-tertiary focus:outline-none focus:border-accent transition-colors"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </motion.div>
      )}

      {/* Conteudo */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : agendamentos.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <CalendarDots size={48} weight="light" className="text-content-tertiary/30 mb-4" />
          <p className="text-sm text-content-tertiary">Nenhum agendamento</p>
          <p className="text-xs text-content-tertiary/60 mt-1">
            Toque no + para criar um novo
          </p>
        </motion.div>
      ) : (
        <div>
          {renderGrupo('Atrasados', atrasados, 'text-danger')}
          {renderGrupo('Hoje', hojeLista, 'text-accent')}
          {renderGrupo('Futuros', futuros, 'text-content-secondary')}
          {renderGrupo('Concluidos', concluidos, 'text-success')}
        </div>
      )}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Excluir agendamento"
        message="Tem certeza que deseja excluir este agendamento? Esta acao nao pode ser desfeita."
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={confirmExcluir}
        onCancel={() => setConfirmDeleteId(null)}
      />
      <ShareAgendaModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        agendamentos={agendamentos}
        today={today}
      />
    </div>
  );
}
