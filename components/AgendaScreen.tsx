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
  CaretRight,
  ArrowsInSimple,
  ArrowsOutSimple,
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
  carregarConcluidos,
  salvarConcluidos,
  sincronizarAgendamentos,
} from '@/lib/db';
import { getLimiteAgenda, setLimiteAgenda, LimiteAgenda } from '@/lib/settings';

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
  const [limite, setLimite] = useState<LimiteAgenda>(() => getLimiteAgenda());
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({
    atrasados: true,
    hoje: true,
    futuros: false,
    concluidos: false,
  });
  const [verMais, setVerMais] = useState<Record<string, boolean>>({});
  const today = hoje();

  const toggleGrupo = useCallback((chave: string) => {
    haptic('light');
    setExpandidos((prev) => ({ ...prev, [chave]: !prev[chave] }));
  }, []);

  const expandirTodos = useCallback(() => {
    haptic('light');
    setExpandidos({ atrasados: true, hoje: true, futuros: true, concluidos: true });
  }, []);

  const recolherTodos = useCallback(() => {
    haptic('light');
    setExpandidos({ atrasados: false, hoje: false, futuros: false, concluidos: false });
  }, []);

  const handleMudarLimite = useCallback((novoLimite: LimiteAgenda) => {
    haptic('selection');
    setLimite(novoLimite);
    setLimiteAgenda(novoLimite);
  }, []);

  const toggleVerMais = useCallback((chave: string) => {
    haptic('light');
    setVerMais((prev) => ({ ...prev, [chave]: !prev[chave] }));
  }, []);

  const carregar = useCallback(async () => {
    try {
      // 1. Carrega do IndexedDB primeiro (offline instantâneo)
      const local = await listarAgendamentos();
      setAgendamentos(local.map(toScreenAgendamento));
      requestNotificationPermission().then(() => {
        verificarLembretes(local);
      });
    } catch {
      // Falha de leitura do IndexedDB
    } finally {
      setLoading(false);
    }

    // 2. Se online, sincroniza bidirecionalmente com o Neon PostgreSQL
    if (navigator.onLine) {
      try {
        const synced = await sincronizarAgendamentos();
        setAgendamentos(synced.map(toScreenAgendamento).sort(compararAgendamentos));
      } catch {
        // Mantém dados do IndexedDB em fallback offline
      }
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Listener para sincronização automática quando a rede for restabelecida
  useEffect(() => {
    function onOnline() {
      sincronizarAgendamentos()
        .then((synced) => {
          setAgendamentos(synced.map(toScreenAgendamento).sort(compararAgendamentos));
          toast('Agenda sincronizada com a nuvem', 'info');
        })
        .catch(() => {});
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [toast]);

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
      // 3. Link: agendamento concluido → apartamento concluido (sem fotos)
      const letter = ag.bloco.replace(/^Torre\s*/i, '').trim();
      if (letter.length === 1) {
        const concluidos = await carregarConcluidos();
        const aptosBloco = concluidos[ag.bloco] || [];
        if (novoConcluido) {
          // Add apartment to concluidos
          if (!aptosBloco.includes(ag.apartamento)) {
            const updated = { ...concluidos, [ag.bloco]: [...aptosBloco, ag.apartamento].sort((a, b) => Number(a) - Number(b)) };
            await salvarConcluidos(updated);
          }
        } else {
          // Remove apartment from concluidos
          const idx = aptosBloco.indexOf(ag.apartamento);
          if (idx !== -1) {
            const updated = { ...concluidos, [ag.bloco]: aptosBloco.filter(a => a !== ag.apartamento) };
            await salvarConcluidos(updated);
          }
        }
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

  const todosAbertos = useMemo(() => {
    return expandidos.atrasados && expandidos.hoje && expandidos.futuros && expandidos.concluidos;
  }, [expandidos]);

  function renderGrupo(
    chave: 'atrasados' | 'hoje' | 'futuros' | 'concluidos',
    titulo: string,
    items: Agendamento[],
    cor: string,
    badgeBg: string,
  ) {
    if (items.length === 0) return null;
    const isAberto = Boolean(expandidos[chave]);
    const estaVerMais = Boolean(verMais[chave]);
    const total = items.length;
    const itensExibidos = (limite === 0 || estaVerMais) ? items : items.slice(0, limite);
    const temMais = limite > 0 && total > limite;

    return (
      <div className="mb-4 bg-base-raised border border-base-border rounded-2xl overflow-hidden transition-all shadow-sm">
        {/* Cabeçalho Retrátil com Indicador Animado e Badges */}
        <button
          onClick={() => toggleGrupo(chave)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-base-overlay/40 transition-colors tactile-press select-none text-left"
          aria-expanded={isAberto}
        >
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={{ rotate: isAberto ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-content-tertiary"
            >
              <CaretRight size={15} weight="bold" />
            </motion.div>
            <h3 className={`text-xs font-bold uppercase tracking-widest ${cor}`}>
              {titulo}
            </h3>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${badgeBg} font-semibold`}>
              {total}
            </span>
          </div>

          <span className="text-[11px] text-content-tertiary font-medium">
            {isAberto ? 'Recolher' : 'Expandir'}
          </span>
        </button>

        {/* Lista de Itens do Grupo */}
        <AnimatePresence initial={false}>
          {isAberto && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-3 pt-1 space-y-2 border-t border-base-border/50">
                {itensExibidos.map((ag) => (
                  <motion.div
                    key={ag.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={spring}
                    className={`flex items-center gap-3 bg-base border border-base-border/70 rounded-xl px-3.5 py-2.5 ${
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

                    <div
                      onClick={() => onNavegarPara(ag.bloco, ag.apartamento)}
                      className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onNavegarPara(ag.bloco, ag.apartamento);
                        }
                      }}
                      aria-label={`Abrir vistoria de ${ag.bloco} apartamento ${ag.apartamento}`}
                    >
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
                        className="tactile-press flex items-center justify-center w-8 h-8 rounded-lg text-content-tertiary hover:text-[#4285F4] hover:bg-[#4285F4]/10 transition-colors"
                        aria-label="Abrir no Google Calendar"
                      >
                        <GoogleLogo size={14} weight="bold" />
                      </button>
                      <button
                        onClick={() => onNavegarPara(ag.bloco, ag.apartamento)}
                        className="tactile-press flex items-center justify-center w-8 h-8 rounded-lg bg-accent-dim text-accent hover:bg-accent/20 transition-colors"
                        aria-label={`Ir para ${ag.bloco} ${ag.apartamento}`}
                      >
                        <ArrowRight size={15} weight="bold" />
                      </button>
                      <button
                        onClick={() => onEditar(ag)}
                        className="tactile-press flex items-center justify-center w-8 h-8 rounded-lg text-content-tertiary hover:text-accent hover:bg-accent/10 transition-colors"
                        aria-label="Editar agendamento"
                      >
                        <PencilSimple size={14} weight="bold" />
                      </button>
                      <button
                        onClick={() => handleExcluir(ag.id)}
                        className="tactile-press flex items-center justify-center w-8 h-8 rounded-lg text-content-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                        aria-label="Excluir agendamento"
                      >
                        <Trash size={14} weight="bold" />
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* Botão Ver mais / Ver menos */}
                {temMais && (
                  <div className="pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVerMais(chave);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-base-overlay hover:bg-base-overlay/80 border border-base-border text-xs text-content-secondary hover:text-content font-medium transition-colors flex items-center justify-center gap-1.5 tactile-press"
                    >
                      {estaVerMais ? (
                        <>Ver menos ({limite})</>
                      ) : (
                        <>Ver mais (+{total - limite})</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

      {/* Barra de Controles Rápidos: Expandir/Recolher e Seletor de Limite */}
      {agendamentos.length > 0 && !loading && (
        <div className="flex items-center justify-between mb-3 px-1">
          <button
            onClick={todosAbertos ? recolherTodos : expandirTodos}
            className="tactile-press flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-base-raised border border-base-border text-xs text-content-secondary hover:text-content transition-colors font-medium shadow-sm"
          >
            {todosAbertos ? (
              <>
                <ArrowsInSimple size={14} weight="bold" />
                <span>Recolher todos</span>
              </>
            ) : (
              <>
                <ArrowsOutSimple size={14} weight="bold" />
                <span>Expandir todos</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1 bg-base-raised border border-base-border p-1 rounded-xl shadow-sm">
            <span className="text-[11px] text-content-tertiary px-1 font-medium">Exibir:</span>
            {([5, 10, 0] as LimiteAgenda[]).map((lim) => (
              <button
                key={lim}
                onClick={() => handleMudarLimite(lim)}
                className={`tactile-press px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                  limite === lim
                    ? 'bg-accent text-base shadow-sm'
                    : 'text-content-tertiary hover:text-content'
                }`}
              >
                {lim === 0 ? 'Todos' : lim}
              </button>
            ))}
          </div>
        </div>
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
          {renderGrupo('atrasados', 'Atrasados', atrasados, 'text-danger', 'bg-danger/15 text-danger')}
          {renderGrupo('hoje', 'Hoje', hojeLista, 'text-accent', 'bg-accent/15 text-accent')}
          {renderGrupo('futuros', 'Futuros', futuros, 'text-content-secondary', 'bg-base-border text-content-secondary')}
          {renderGrupo('concluidos', 'Concluidos', concluidos, 'text-success', 'bg-success/15 text-success')}
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
