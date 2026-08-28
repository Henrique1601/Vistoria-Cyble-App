'use client';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MagnifyingGlass,
  SortAscending,
  FunnelSimple,
  ArrowDown,
  CircleHalf,
  HouseLine,
} from '@phosphor-icons/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ApartamentoStatus } from '@/lib/db';
import { spring } from '@/lib/motion';
import { haptic } from '@/lib/haptic';
import { setModoCompacto, setAltoContraste } from '@/lib/settings';
import { EmptyStateSearch } from '@/components/EmptyState';
import AptoCard from '@/components/AptoCard';
import { SyncBanner } from '@/components/SyncBanner';
import QuickScheduleModal from '@/components/QuickScheduleModal';
import CommentsModal from '@/components/CommentsModal';
import { OrdemTipo, StatusFilterTipo } from '@/hooks/useApartamentosFilter';

interface ApartamentosViewProps {
  blocoAtual: string;
  aptosDoBloco: ApartamentoStatus[];
  aptosPaginados: ApartamentoStatus[];
  aptosOnlineDoBloco: Set<string>;
  busca: string;
  onBuscaChange: (b: string) => void;
  ordem: OrdemTipo;
  onOrdemChange: (o: OrdemTipo) => void;
  statusFilter: StatusFilterTipo;
  onStatusFilterChange: (s: StatusFilterTipo) => void;
  modoCompacto: boolean;
  onModoCompactoToggle: () => void;
  altoContraste: boolean;
  onAltoContrasteToggle: () => void;
  modoEscaneamento: boolean;
  headerCollapsed: boolean;
  loadingSkeleton: boolean;
  paginaAtual: number;
  totalPaginas: number;
  itensPagina: number;
  onPaginaChange: (p: number) => void;
  onItensPaginaChange: (n: 10 | 20 | 50 | 999) => void;
  onVoltar: () => void;
  onAbrirApto: (apto: string) => void;
  onDesmarcarConfirm: (bloco: string, apto: string) => void;
  onAgendamentoSalvo: () => void;
  comentarioCounts: Record<string, number>;
  onRefreshCommentCounts: (bloco?: string) => void;
  userRole: string;
  online: boolean;
  pendentes: number;
  onSyncBannerClick: () => void;
  ctxMenu: any;
  ctxClose: () => void;
  agendamentoRapido: { bloco: string; apto: string } | null;
  setAgendamentoRapido: (v: { bloco: string; apto: string } | null) => void;
  showCommentsModal: { bloco: string; apto: string } | null;
  setShowCommentsModal: (v: { bloco: string; apto: string } | null) => void;
}

export function ApartamentosView({
  blocoAtual,
  aptosDoBloco,
  aptosPaginados,
  aptosOnlineDoBloco,
  busca,
  onBuscaChange,
  ordem,
  onOrdemChange,
  statusFilter,
  onStatusFilterChange,
  modoCompacto,
  onModoCompactoToggle,
  altoContraste,
  onAltoContrasteToggle,
  modoEscaneamento,
  headerCollapsed,
  loadingSkeleton,
  paginaAtual,
  totalPaginas,
  itensPagina,
  onPaginaChange,
  onItensPaginaChange,
  onVoltar,
  onAbrirApto,
  onDesmarcarConfirm,
  onAgendamentoSalvo,
  comentarioCounts,
  onRefreshCommentCounts,
  userRole,
  online,
  pendentes,
  onSyncBannerClick,
  ctxMenu,
  ctxClose,
  agendamentoRapido,
  setAgendamentoRapido,
  showCommentsModal,
  setShowCommentsModal,
}: ApartamentosViewProps) {
  const listParentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: aptosPaginados.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 64,
    overscan: 5,
  });

  const concluidosCount = aptosDoBloco.filter((a) => a.cybleAntesFeito && a.cybleDepoisFeito).length;

  return (
    <main className="min-h-[100dvh] bg-base">
      {/* Context Menu */}
      {ctxMenu?.isOpen && (
        <div className="fixed inset-0 z-[70]" onClick={ctxClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bg-base-raised border border-base-border rounded-2xl shadow-2xl overflow-hidden min-w-[180px] py-1"
            style={{ left: ctxMenu.position.x, top: ctxMenu.position.y }}
          >
            {ctxMenu.items.map((item: any, i: number) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); item.onClick(); ctxClose(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  item.variant === 'danger'
                    ? 'text-danger hover:bg-danger/10'
                    : 'text-content hover:bg-base-overlay/50'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </motion.div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={spring}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={onVoltar}
            aria-label="Voltar para blocos"
            className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          </button>
          <div>
            <h1 className={`font-semibold tracking-tight transition-all duration-300 ${headerCollapsed ? 'text-base' : 'text-xl'}`}>
              {blocoAtual}
            </h1>
            <p className={`text-content-tertiary mt-0.5 transition-all duration-300 ${headerCollapsed ? 'text-[10px] mt-0 max-h-0 overflow-hidden opacity-0' : 'text-xs mt-0.5 max-h-8 opacity-100'}`}>
              {concluidosCount}/{aptosDoBloco.length} concluidos
            </p>
          </div>
        </motion.div>

        <div className={`sticky top-14 z-20 -mx-4 px-4 py-2 backdrop-blur-xl transition-colors ${headerCollapsed ? 'bg-base/80 border-b border-base-border' : ''}`}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            className="relative mb-2"
          >
            <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
            <input
              type="text"
              placeholder="Buscar apartamento..."
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              className="w-full bg-base-raised border border-base-border rounded-xl pl-10 pr-4 py-3 text-sm text-content placeholder:text-content-tertiary focus:outline-none focus:border-accent/50 focus:shadow-glow-accent transition-all"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.15 }}
            className="mb-4 space-y-2"
          >
            <div className="flex items-center gap-2" role="group" aria-label="Ordenação e filtros">
              <button
                onClick={() => onOrdemChange('original')}
                aria-pressed={ordem === 'original'}
                className={`tactile-press px-3 py-2 rounded-full text-[11px] font-medium border transition-all whitespace-nowrap ${
                  ordem === 'original'
                    ? 'bg-accent-dim border-accent text-accent'
                    : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
                }`}
              >
                <SortAscending size={12} weight="bold" className="inline mr-1 -mt-0.5" />
                Nº
              </button>
              <button
                onClick={() => onOrdemChange('pendentes')}
                aria-pressed={ordem === 'pendentes'}
                className={`tactile-press px-3 py-2 rounded-full text-[11px] font-medium border transition-all whitespace-nowrap ${
                  ordem === 'pendentes'
                    ? 'bg-accent-dim border-accent text-accent'
                    : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
                }`}
              >
                <FunnelSimple size={12} weight="bold" className="inline mr-1 -mt-0.5" />
                Pendentes
              </button>
              <div className="flex gap-1 ml-auto shrink-0">
                <button
                  onClick={onModoCompactoToggle}
                  aria-pressed={modoCompacto}
                  aria-label={modoCompacto ? 'Modo normal' : 'Modo compacto'}
                  className={`tactile-press px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                    modoCompacto
                      ? 'bg-accent-dim border-accent text-accent'
                      : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
                  }`}
                  title={modoCompacto ? 'Modo normal' : 'Modo compacto'}
                >
                  <ArrowDown size={14} weight="bold" className={`inline transition-transform ${modoCompacto ? 'rotate-180' : ''}`} />
                </button>
                <button
                  onClick={onAltoContrasteToggle}
                  aria-pressed={altoContraste}
                  aria-label={altoContraste ? 'Modo normal' : 'Alto contraste'}
                  className={`tactile-press px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                    altoContraste
                      ? 'bg-accent-dim border-accent text-accent'
                      : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
                  }`}
                  title={altoContraste ? 'Modo normal' : 'Alto contraste'}
                >
                  <CircleHalf size={14} weight="bold" className="inline" />
                </button>
              </div>
            </div>
            <div className="flex gap-1.5" role="group" aria-label="Filtro por status">
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'pendente', label: 'Pendente' },
                { key: 'em_andamento', label: 'Andamento' },
                { key: 'concluido', label: 'Concluido' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { haptic('light'); onStatusFilterChange(key as StatusFilterTipo); }}
                  aria-pressed={statusFilter === key}
                  className={`tactile-press px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all whitespace-nowrap ${
                    statusFilter === key
                      ? key === 'concluido' ? 'bg-success-dim border-success text-success'
                        : key === 'em_andamento' ? 'bg-warn-dim border-warn text-warn'
                        : key === 'pendente' ? 'bg-danger-dim border-danger text-danger'
                        : 'bg-accent-dim border-accent text-accent'
                      : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        <div
          ref={listParentRef}
          className="bg-base-raised border border-base-border rounded-2xl overflow-auto divide-y divide-base-border"
          style={{ maxHeight: 'calc(100dvh - 280px)' }}
        >
          {aptosDoBloco.length === 0 && (
            <div className="px-6 py-12">
              {busca ? (
                <EmptyStateSearch />
              ) : (
                <div className="text-center">
                  <HouseLine size={32} weight="light" className="mx-auto text-content-tertiary mb-3" />
                  <p className="text-sm text-content-tertiary">Nenhum apartamento neste bloco</p>
                </div>
              )}
            </div>
          )}
          {loadingSkeleton && aptosDoBloco.length === 0 && Array.from({ length: 5 }).map((_, i) => (
            <div key={`apto-skel-${i}`} className="px-4 py-3 flex items-center gap-3" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="skeleton-resolve w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1">
                <div className="skeleton-resolve w-16 h-4 rounded-md mb-1.5" />
                <div className="flex gap-1.5">
                  <div className="skeleton-resolve w-2 h-2 rounded-full" />
                  <div className="skeleton-resolve w-2 h-2 rounded-full" />
                  <div className="skeleton-resolve w-2 h-2 rounded-full" />
                </div>
              </div>
              <div className="skeleton-resolve w-8 h-8 rounded-lg shrink-0" />
            </div>
          ))}
          {aptosPaginados.length > 0 && (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const s = aptosPaginados[virtualRow.index];
                return (
                  <div
                    key={s.apartamento}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <AptoCard
                      s={s}
                      aptosOnlineDoBloco={aptosOnlineDoBloco}
                      modoCompacto={modoCompacto}
                      modoEscaneamento={modoEscaneamento}
                      blocoAtual={blocoAtual}
                      onAbrir={() => onAbrirApto(s.apartamento)}
                      onAgendar={() => setAgendamentoRapido({ bloco: blocoAtual, apto: s.apartamento })}
                      onComentario={() => setShowCommentsModal({ bloco: blocoAtual, apto: s.apartamento })}
                      comentarioCount={comentarioCounts[`${blocoAtual}_${s.apartamento}`] || 0}
                      onDesmarcar={() => onDesmarcarConfirm(blocoAtual, s.apartamento)}
                      userRole={userRole}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {aptosDoBloco.length > 10 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 }}
            className="mt-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5" role="group" aria-label="Itens por página">
                {([10, 20, 50, 999] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => { onItensPaginaChange(n); onPaginaChange(1); }}
                    aria-pressed={itensPagina === n}
                    aria-label={`${n === 999 ? 'Todos' : n} itens por página`}
                    className={`tactile-press px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                      itensPagina === n
                        ? 'bg-accent-dim border-accent text-accent'
                        : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
                    }`}
                  >
                    {n === 999 ? 'Tudo' : n}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-content-tertiary font-mono" aria-label={`Página ${paginaAtual} de ${totalPaginas}`}>
                {paginaAtual}/{totalPaginas}
              </span>
            </div>
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between" role="group" aria-label="Paginação">
                <button
                  onClick={() => { haptic('light'); onPaginaChange(Math.max(1, paginaAtual - 1)); }}
                  disabled={paginaAtual === 1}
                  aria-label="Página anterior"
                  className="tactile-press px-3 py-1.5 rounded-xl text-xs font-medium bg-base-raised border border-base-border text-content-secondary hover:text-content disabled:opacity-30 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all"
                >
                  Anterior
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - paginaAtual) <= 1)
                    .reduce<(number | '...')[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`dots-${i}`} className="px-1 py-1 text-[11px] text-content-tertiary">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => { haptic('light'); onPaginaChange(p as number); }}
                          aria-pressed={paginaAtual === p}
                          aria-label={`Página ${p}`}
                          className={`tactile-press w-8 h-8 rounded-lg text-[11px] font-medium border transition-all ${
                            paginaAtual === p
                              ? 'bg-accent-dim border-accent text-accent'
                              : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                </div>
                <button
                  onClick={() => { haptic('light'); onPaginaChange(Math.min(totalPaginas, paginaAtual + 1)); }}
                  disabled={paginaAtual === totalPaginas}
                  aria-label="Próxima página"
                >
                  Proximo
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <SyncBanner online={online} pendentes={pendentes} onClick={onSyncBannerClick} />

      <AnimatePresence>
        {agendamentoRapido && (
          <QuickScheduleModal
            bloco={agendamentoRapido.bloco}
            apto={agendamentoRapido.apto}
            onFechar={() => setAgendamentoRapido(null)}
            onSalvo={onAgendamentoSalvo}
          />
        )}
      </AnimatePresence>

      {showCommentsModal && (
        <CommentsModal
          bloco={showCommentsModal.bloco}
          apartamento={showCommentsModal.apto}
          isOpen={!!showCommentsModal}
          onClose={() => {
            setShowCommentsModal(null);
            onRefreshCommentCounts(showCommentsModal.bloco);
          }}
          adminMode={userRole === 'admin'}
        />
      )}
    </main>
  );
}
