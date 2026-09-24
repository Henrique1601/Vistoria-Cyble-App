'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  Moon,
  Scan,
  ArrowClockwise,
  Warning,
  ChartBar,
  ArrowRight,
} from '@phosphor-icons/react';
import { spring } from '@/lib/motion';
import { haptic } from '@/lib/haptic';
import { APP_VERSION } from '@/lib/version';
import { STORAGE_WARNING_PCT } from '@/lib/constants';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Dashboard } from '@/components/Dashboard';
import { SearchBar, SearchResults } from '@/components/SearchBar';
import { FotosRecentes } from '@/components/FotosRecentes';
import { AtrasadosSection } from '@/components/AtrasadosSection';
import { BlocosGrid } from '@/components/BlocosGrid';
import { BottomLinks } from '@/components/BottomLinks';
import BottomNav from '@/components/BottomNav';
import { Confetti, SuccessCheck } from '@/components/SuccessAnimation';
import { OnboardingTour, markTutorialDone } from '@/components/OnboardingTour';
import NotificationCenter from '@/components/NotificationCenter';
import TowerReportPanel from '@/components/TowerReportPanel';
import QuickScheduleModal from '@/components/QuickScheduleModal';
import CommentsModal from '@/components/CommentsModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SyncBanner } from '@/components/SyncBanner';
import { normApto } from '@/lib/utils';
import type { ApartamentoStatus, FotoRecord } from '@/lib/db';
import type { FotoOnline } from '@/components/EstatisticasPeriodo';

interface BlocosViewProps {
  status: ApartamentoStatus[];
  statusMerged: ApartamentoStatus[];
  statusMap: Map<string, ApartamentoStatus>;
  fotosOnline: FotoOnline[];
  fotosOnlineMap: Map<string, { count: number; aptos: Set<string> }>;
  fotosCountMap: Map<string, number>;
  fotosRecentes: FotoRecord[];
  blocos: string[];
  progressoMap: Map<string, any>;
  aptosEsquecidos: { bloco: string; apartamento: string }[];
  lista: Record<string, string[]>;
  pendentes: number;
  loadingSkeleton: boolean;
  online: boolean;
  espacoStorage: { usado: number; total: number; pct: number } | null;
  updateDisponivel: boolean;
  versaoNova?: string;
  ultimoBackup: string;
  showTutorial: boolean;
  setShowTutorial: (v: boolean) => void;
  deferredPrompt: any;
  setDeferredPrompt: (p: any) => void;
  showInstallBanner: boolean;
  setShowInstallBanner: (v: boolean) => void;
  theme: string;
  toggleTheme: () => void;
  modoEscaneamento: boolean;
  setModoEscaneamento: (v: boolean) => void;
  rtOnline?: boolean;
  rtLastUpdate?: number;
  userRole: string;
  onRefreshAll: () => Promise<void>;
  onSelectBloco: (bloco: string) => void;
  onAbrirCapturaApto: (bloco: string, apto: string) => void;
  onNavigate: (view: string) => void;
  onBackup: () => void;
  onRestore: () => void;
  onLogout: () => void;
  onEditLista: () => void;
  onDesmarcarConfirm: (bloco: string, apto: string) => void;
  toast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  refreshCommentCounts: (bloco?: string) => void;
}

export function BlocosView({
  status,
  statusMerged,
  statusMap,
  fotosOnline,
  fotosOnlineMap,
  fotosCountMap,
  fotosRecentes,
  blocos,
  progressoMap,
  aptosEsquecidos,
  lista,
  pendentes,
  loadingSkeleton,
  online,
  espacoStorage,
  updateDisponivel,
  versaoNova,
  ultimoBackup,
  showTutorial,
  setShowTutorial,
  deferredPrompt,
  setDeferredPrompt,
  showInstallBanner,
  setShowInstallBanner,
  theme,
  toggleTheme,
  modoEscaneamento,
  setModoEscaneamento,
  rtOnline,
  rtLastUpdate,
  userRole,
  onRefreshAll,
  onSelectBloco,
  onAbrirCapturaApto,
  onNavigate,
  onBackup,
  onRestore,
  onLogout,
  onEditLista,
  onDesmarcarConfirm,
  toast,
  refreshCommentCounts,
}: BlocosViewProps) {
  const [buscaGlobal, setBuscaGlobal] = useState('');
  const [dataFiltro, setDataFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [showAtrasados, setShowAtrasados] = useState(false);
  const [diasAlerta, setDiasAlerta] = useState(7);
  const [selectedTower, setSelectedTower] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiVariant, setConfettiVariant] = useState<'normal' | 'block' | 'tower' | 'mega'>('normal');
  const [showCheck, setShowCheck] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [agendamentoRapido, setAgendamentoRapido] = useState<{ bloco: string; apto: string } | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState<{ bloco: string; apto: string } | null>(null);

  const mainRef = useRef<HTMLDivElement>(null);

  // Hook pull-to-refresh isolado
  const { pullDistance, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePullToRefresh({ onRefresh: onRefreshAll });

  // Header retrátil no scroll
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const handler = () => {
      setHeaderCollapsed(el.scrollTop > 120);
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  // Datas disponíveis para filtro do dashboard
  const datasDisponiveis = useMemo(() => {
    const dates = new Set<string>();
    fotosOnline.forEach((f) => {
      if (f.data_leitura) dates.add(f.data_leitura);
    });
    return [...dates].sort().reverse();
  }, [fotosOnline]);

  // Resultados da busca global
  const resultadosBuscaGlobal = useMemo(() => {
    if (!buscaGlobal.trim() || buscaGlobal.length < 2) return [];
    const raw = buscaGlobal.toLowerCase().trim();
    const blockMatch = raw.match(/(?:torre\s*)?([a-h])\s*(\d+)?/i);
    const searchBlock = blockMatch?.[1]?.toUpperCase() || '';
    const searchNum = blockMatch?.[2] || raw.replace(/[^0-9]/g, '');
    const q = searchNum ? normApto(searchNum) : raw;
    const results: { bloco: string; apto: string; status: ApartamentoStatus | null }[] = [];
    for (const b of blocos) {
      if (searchBlock) {
        const bLetter = b.replace(/^Torre\s+/i, '').trim().toUpperCase();
        if (bLetter !== searchBlock && b.toUpperCase() !== `TORRE ${searchBlock}`) continue;
      }
      const codigosLocais = (lista?.[b] || []).map(normApto);
      const entry = fotosOnlineMap.get(b);
      const aptosOnline = entry?.aptos ?? new Set<string>();
      const allAptos = new Set<string>([...codigosLocais, ...aptosOnline]);
      for (const c of allAptos) {
        const normC = normApto(c);
        if (normC.includes(q) || (searchNum && normC === q)) {
          const st = statusMap.get(`${b}__${normC}`) || null;
          results.push({ bloco: b, apto: normC, status: st });
        }
      }
    }
    return results.slice(0, 20);
  }, [buscaGlobal, blocos, lista, fotosOnlineMap, statusMap]);

  return (
    <motion.main
      key="view-main-blocos"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={spring}
      className="min-h-[100dvh] bg-base"
      ref={mainRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Confetti show={showConfetti} variant={confettiVariant} onComplete={() => setShowConfetti(false)} />
      <SuccessCheck show={showCheck} onComplete={() => setShowCheck(false)} />

      {showTutorial && (
        <OnboardingTour onComplete={() => { setShowTutorial(false); markTutorialDone(); }} />
      )}

      {/* PWA Install Banner */}
      <AnimatePresence>
        {showInstallBanner && deferredPrompt && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 bg-accent text-base px-4 py-3 flex items-center justify-between z-[60] shadow-lg"
          >
            <span className="text-sm font-medium">Instalar Vistoria Cyble no aparelho</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowInstallBanner(false);
                  localStorage.setItem('vistoria_install_dismissed', '1');
                }}
                className="text-xs font-medium px-3 py-1 rounded-lg bg-base-overlay/20 hover:bg-base-overlay/30 transition-colors"
              >
                Agora não
              </button>
              <button
                onClick={async () => {
                  deferredPrompt.prompt();
                  await deferredPrompt.userChoice;
                  setDeferredPrompt(null);
                  setShowInstallBanner(false);
                }}
                className="text-xs font-semibold px-3 py-1 rounded-lg bg-base text-accent hover:bg-base/90 transition-colors"
              >
                Instalar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerta de armazenamento quase cheio */}
      <AnimatePresence>
        {espacoStorage && espacoStorage.pct > STORAGE_WARNING_PCT && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-0 right-0 bg-warning/90 text-base px-4 py-2 text-xs font-medium flex items-center gap-2 z-[55]"
          >
            <Warning size={14} weight="bold" />
            <span>Armazenamento quase cheio ({espacoStorage.pct}%). Considere fazer backup.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: isRefreshing ? 48 : pullDistance * 0.6, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-center overflow-hidden"
          >
            <motion.div
              animate={{ rotate: isRefreshing ? 360 : pullDistance * 3 }}
              transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : { duration: 0 }}
            >
              <ArrowClockwise
                size={20}
                weight="bold"
                className={pullDistance > 80 ? 'text-accent' : 'text-content-tertiary'}
              />
            </motion.div>
            {pullDistance > 80 && !isRefreshing && (
              <span className="text-xs text-accent ml-2 font-medium">Solte para atualizar</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`rounded-full bg-accent transition-all duration-300 ${
                headerCollapsed
                  ? 'w-1.5 h-1.5 shadow-[0_0_0_2px_rgba(232,130,58,0.2)]'
                  : 'w-2 h-2 shadow-[0_0_0_4px_rgba(232,130,58,0.2)]'
              }`}
            />
            <h1
              className={`tracking-tight transition-all duration-300 ${
                headerCollapsed ? 'text-lg font-medium' : 'text-2xl font-bold'
              }`}
            >
              Vistoria Cyble
            </h1>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  haptic('selection');
                  toggleTheme();
                }}
                aria-label={
                  theme === 'dark'
                    ? 'Ativar modo claro'
                    : theme === 'light'
                    ? 'Ativar modo automático'
                    : 'Ativar modo escuro'
                }
                className="tactile-press w-9 h-9 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
              >
                {theme === 'dark' && <Sun size={16} weight="bold" aria-hidden="true" />}
                {theme === 'light' && <Moon size={16} weight="bold" aria-hidden="true" />}
                {theme === 'auto' && (
                  <>
                    <Sun size={10} weight="bold" aria-hidden="true" />
                    <Moon size={10} weight="bold" aria-hidden="true" className="ml-[-2px]" />
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  const next = !modoEscaneamento;
                  setModoEscaneamento(next);
                  haptic(next ? 'success' : 'light');
                  if (next) toast('Modo escaneamento ativado! Toque no apto e tire a foto.', 'info');
                  else toast('Modo escaneamento desativado.', 'info');
                }}
                aria-label={modoEscaneamento ? 'Desativar modo escaneamento' : 'Ativar modo escaneamento rapido'}
                className={`tactile-press w-9 h-9 rounded-xl border flex items-center justify-center focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors ${
                  modoEscaneamento
                    ? 'bg-accent-dim border-accent text-accent'
                    : 'bg-base-raised border-base-border text-content-secondary hover:text-content hover:border-accent/30'
                }`}
              >
                <Scan size={16} weight="bold" aria-hidden="true" />
              </button>
              <NotificationCenter />
            </div>
          </div>
          <p
            className={`text-content-tertiary ml-5 transition-all duration-300 ${
              headerCollapsed
                ? 'text-[10px] mt-0 max-h-0 overflow-hidden opacity-0'
                : 'text-sm mt-1 max-h-8 opacity-100'
            }`}
          >
            {modoEscaneamento
              ? 'Modo escaneamento: toque no apto e tire a foto direto'
              : 'Selecione o bloco para comecar.'}
          </p>
          {rtOnline && (
            <div className="ml-5 mt-2 flex items-center gap-1.5 text-[10px] text-content-tertiary">
              <span className={`w-1.5 h-1.5 rounded-full ${rtOnline ? 'bg-success' : 'bg-danger'}`} />
              <span>
                {rtOnline ? 'Online' : 'Offline'}
                {rtLastUpdate ? ` · atualizado ${new Date(rtLastUpdate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </span>
            </div>
          )}
        </motion.div>

        <Dashboard
          status={statusMerged && statusMerged.length > 0 ? statusMerged : status}
          pendentes={pendentes}
          fotosOnline={fotosOnline}
          datasDisponiveis={datasDisponiveis}
          dataFiltro={dataFiltro}
          dataInicio={dataInicio}
          onFiltroDataChange={setDataFiltro}
          onFiltroInicioChange={setDataInicio}
        />

        <button
          onClick={() => onNavigate('comparativo')}
          className="tactile-press w-full flex items-center gap-3 px-4 py-3 bg-base-raised border border-base-border rounded-xl hover:border-accent/30 transition-all mb-4"
        >
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <ChartBar size={20} weight="duotone" className="text-accent" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-content">Comparativo entre Torres</p>
            <p className="text-[11px] text-content-tertiary">Visualizar progresso por torre</p>
          </div>
          <ArrowRight size={16} weight="bold" className="ml-auto text-content-tertiary" />
        </button>

        <SearchBar buscaGlobal={buscaGlobal} onBuscaChange={setBuscaGlobal} />

        <SearchResults
          resultados={resultadosBuscaGlobal}
          onSelect={(bloco, apto) => {
            haptic('light');
            onAbrirCapturaApto(bloco, apto);
            setBuscaGlobal('');
          }}
        />

        {!buscaGlobal && (
          <FotosRecentes
            fotos={fotosRecentes}
            onSelect={(bloco, apto) => {
              onAbrirCapturaApto(bloco, apto);
            }}
          />
        )}

        {!buscaGlobal && (
          <AtrasadosSection
            aptosEsquecidos={aptosEsquecidos}
            showAtrasados={showAtrasados}
            diasAlerta={diasAlerta}
            onToggle={() => setShowAtrasados(!showAtrasados)}
            onDiasChange={setDiasAlerta}
            onSelect={(bloco, apto) => {
              onAbrirCapturaApto(bloco, apto);
            }}
          />
        )}

        <BlocosGrid
          blocos={blocos}
          progressoMap={progressoMap}
          loading={loadingSkeleton}
          onSelect={(b) => {
            haptic('light');
            setSelectedTower(b);
          }}
        />

        <div className="mb-3">
          <button
            onClick={() => {
              haptic('light');
              onNavigate('heatmap');
            }}
            className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <div className="grid grid-cols-3 gap-0.5">
              <div className="w-1.5 h-1.5 rounded-sm bg-success/80" />
              <div className="w-1.5 h-1.5 rounded-sm bg-warn/80" />
              <div className="w-1.5 h-1.5 rounded-sm bg-danger/60" />
              <div className="w-1.5 h-1.5 rounded-sm bg-success/80" />
              <div className="w-1.5 h-1.5 rounded-sm bg-danger/60" />
              <div className="w-1.5 h-1.5 rounded-sm bg-warn/80" />
              <div className="w-1.5 h-1.5 rounded-sm bg-warn/80" />
              <div className="w-1.5 h-1.5 rounded-sm bg-success/80" />
              <div className="w-1.5 h-1.5 rounded-sm bg-success/80" />
            </div>
            Mapa de progresso
          </button>
        </div>

        <BottomLinks
          online={online}
          appVersion={APP_VERSION}
          espacoStorage={espacoStorage}
          updateDisponivel={updateDisponivel}
          versaoNova={versaoNova || ''}
          onBackup={onBackup}
          onRestore={onRestore}
          onLogout={onLogout}
          onUpdate={() => {
            navigator.serviceWorker?.controller?.postMessage('skipWaiting');
            window.dispatchEvent(new Event('sw-updated'));
          }}
          onEditLista={onEditLista}
          ultimoBackup={ultimoBackup}
        />
      </div>

      <BottomNav
        active="inicio"
        badges={pendentes > 0 ? { camera: pendentes } : undefined}
        onNavigate={onNavigate}
      />

      <AnimatePresence>
        {selectedTower && (
          <TowerReportPanel
            tower={selectedTower}
            status={statusMerged}
            fotosOnline={fotosOnline}
            fotosCountMap={fotosCountMap}
            onNavigateToApto={(bloco, apto) => {
              setSelectedTower(null);
              onAbrirCapturaApto(bloco, apto);
            }}
            onClose={() => setSelectedTower(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {agendamentoRapido && (
          <QuickScheduleModal
            bloco={agendamentoRapido.bloco}
            apto={agendamentoRapido.apto}
            onFechar={() => setAgendamentoRapido(null)}
            onSalvo={() => {
              setAgendamentoRapido(null);
              toast('Agendamento criado', 'success');
            }}
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
            refreshCommentCounts(showCommentsModal.bloco);
          }}
          adminMode={userRole === 'admin'}
        />
      )}

      <SyncBanner online={online} pendentes={pendentes} onClick={() => onNavigate('syncQueue')} />
    </motion.main>
  );
}
