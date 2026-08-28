'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  Moon,
  Scan,
  ArrowClockwise,
  Warning,
  ChartBar,
  ArrowRight,
  ArrowLeft,
} from '@phosphor-icons/react';
import { useToast } from '@/components/Toast';
import { useSyncProgress } from '@/components/ProgressToast';
import BottomNav from '@/components/BottomNav';
import { SearchBar, SearchResults } from '@/components/SearchBar';
import { FotosRecentes } from '@/components/FotosRecentes';
import { AtrasadosSection } from '@/components/AtrasadosSection';
import { BlocosGrid } from '@/components/BlocosGrid';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ProgressHeatmap } from '@/components/ProgressHeatmap';
import { BottomLinks } from '@/components/BottomLinks';
import { haptic } from '@/lib/haptic';
import { authFetch } from '@/lib/api';
import { spring } from '@/lib/motion';
import PinGate from './PinGate';
import SetupScreen from './SetupScreen';
import CapturaScreen from './CapturaScreen';
import {
  restaurarDados,
  type ApartamentoStatus,
} from '@/lib/db';
import { useTheme } from '@/lib/theme';
import { Confetti, SuccessCheck } from '@/components/SuccessAnimation';
import { fazerBackupManual, formatarTimestampBackup, obterUltimoBackup } from '@/lib/backup';
import { normApto, normalizeBloco } from '@/lib/utils';
import { setModoCompacto, setAltoContraste } from '@/lib/settings';
import { APP_VERSION } from '@/lib/version';
import { OnboardingTour, markTutorialDone } from '@/components/OnboardingTour';
import NotificationCenter from '@/components/NotificationCenter';
import ConfiguracoesClient from '@/app/configuracoes/ConfiguracoesClient';
import { useKeyboardShortcuts, buildMainShortcuts } from '@/hooks/useKeyboardShortcuts';
import TowerReportPanel from '@/components/TowerReportPanel';
import SyncQueueScreen from '@/components/SyncQueueScreen';
import AuditLogScreen from '@/components/AuditLogScreen';
import StatusScreen from '@/components/StatusScreen';
import AgendaScreen from '@/components/AgendaScreen';
import NovoAgendamentoModal from '@/components/NovoAgendamentoModal';
import QuickScheduleModal from '@/components/QuickScheduleModal';
import EditarAgendamentoModal from '@/components/EditarAgendamentoModal';
import { useContextMenu } from '@/components/ContextMenu';
import TowerComparison from '@/components/TowerComparison';
import CommentsModal from '@/components/CommentsModal';
import { useRealTimeStatus } from '@/hooks/useRealTimeStatus';
import { STORAGE_WARNING_PCT } from '@/lib/constants';

// Componentes e hooks modularizados
import { SyncBanner } from '@/components/SyncBanner';
import { Dashboard } from '@/components/Dashboard';
import { ExportarView } from '@/components/views/ExportarView';
import { ApartamentosView } from '@/components/views/ApartamentosView';
import { useVistoriaState } from '@/hooks/useVistoriaState';
import { useApartamentosFilter } from '@/hooks/useApartamentosFilter';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';

type View = 'blocos' | 'apartamentos' | 'captura' | 'configuracoes' | 'syncQueue' | 'auditLog' | 'exportar' | 'heatmap' | 'agenda' | 'comparativo' | 'status';

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

export default function Home() {
  const [pin, setPin] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('viewer');
  const [pinChecked, setPinChecked] = useState(false);
  const [view, setView] = useState<View>('blocos');
  const [blocoAtual, setBlocoAtual] = useState<string | null>(null);
  const [aptoAtual, setAptoAtual] = useState<string | null>(null);
  const [buscaGlobal, setBuscaGlobal] = useState('');
  const [dataFiltro, setDataFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [modoEscaneamento, setModoEscaneamento] = useState(false);
  const [showAtrasados, setShowAtrasados] = useState(false);
  const [diasAlerta, setDiasAlerta] = useState(7);
  const [selectedTower, setSelectedTower] = useState<string | null>(null);
  const { theme, toggle: toggleTheme } = useTheme();
  const { toast } = useToast();
  const { showSyncProgress, updateSyncProgress } = useSyncProgress();
  const [activeNav, setActiveNav] = useState<'inicio' | 'camera' | 'galeria' | 'agenda' | 'exportar' | 'config'>('inicio');
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiVariant, setConfettiVariant] = useState<'normal' | 'block' | 'tower' | 'mega'>('normal');
  const [showCheck, setShowCheck] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [agendamentoRapido, setAgendamentoRapido] = useState<{ bloco: string; apto: string } | null>(null);
  const [agendaKey, setAgendaKey] = useState(0);
  const [agendamentoEditando, setAgendamentoEditando] = useState<Agendamento | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const pullStartY = useRef(0);
  const pullDistanceRef = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const { menu: ctxMenu, closeMenu: ctxClose } = useContextMenu();
  const { lastUpdate: rtLastUpdate, online: rtOnline } = useRealTimeStatus();
  const [showCommentsModal, setShowCommentsModal] = useState<{ bloco: string; apto: string } | null>(null);
  const [desmarcarConfirm, setDesmarcarConfirm] = useState<{ bloco: string; apto: string } | null>(null);
  const pinRef = useRef<string | null>(null);

  // Hook centralizado de estado da vistoria
  const {
    lista,
    setLista,
    listaAnterior,
    setListaAnterior,
    status,
    fotosOnline,
    fotosRecentes,
    setFotosRecentes,
    pendentes,
    loadingSkeleton,
    comentarioCounts,
    refreshStatus,
    refreshFotosOnline,
    refreshCommentCounts,
    statusMap,
    fotosOnlineMap,
    fotosCountMap,
    blocos,
    progressoMap,
    aptosEsquecidos,
    statusMerged,
  } = useVistoriaState(pin, diasAlerta);

  // Hook centralizado de filtro e paginação da torre atual
  const {
    busca,
    setBusca,
    ordem,
    setOrdem,
    statusFilter,
    setStatusFilter,
    itensPagina,
    setItensPagina,
    paginaAtual,
    setPaginaAtual,
    totalPaginas,
    modoCompacto,
    setModoCompactoState,
    altoContraste,
    setAltoContrasteState,
    aptosOnlineDoBloco,
    aptosDoBloco,
    aptosPaginados,
  } = useApartamentosFilter({
    blocoAtual,
    lista,
    statusMap,
    fotosOnlineMap,
    fotosCountMap,
  });

  // Função unificada de sincronização
  const tentarSincronizar = useCallback(async () => {
    const currentPin = pinRef.current;
    if (!navigator.onLine || !currentPin) return;

    let syncToastId: string | null = null;
    const { syncAll } = await import('@/lib/syncQueue');

    await syncAll(currentPin, {
      onStart: (total) => {
        syncToastId = showSyncProgress(
          total === 1 ? 'Sincronizando foto...' : 'Sincronizando fotos...',
          total
        );
      },
      onProgress: (uploaded) => {
        if (syncToastId) updateSyncProgress(syncToastId, uploaded);
      },
      onSuccess: (total) => {
        if (syncToastId) updateSyncProgress(syncToastId, total, { status: 'success' });
      },
      onError: (_err, failedCount) => {
        if (syncToastId) {
          updateSyncProgress(syncToastId, 0, {
            status: 'error',
            errorMessage: `${failedCount} foto(s) falharam ao enviar. Verifique sua conexão.`,
          });
        }
      },
      onDone: async () => {
        await refreshStatus();
        refreshFotosOnline();
      },
    });
  }, [refreshFotosOnline, refreshStatus, showSyncProgress, updateSyncProgress]);

  // Hook de ciclo de vida (inatividade, auto-update, auto-backup, storage)
  const {
    online,
    updateDisponivel,
    setUpdateDisponivel,
    versaoNova,
    showTutorial,
    setShowTutorial,
    deferredPrompt,
    setDeferredPrompt,
    showInstallBanner,
    setShowInstallBanner,
    espacoStorage,
    ultimoBackup,
    setUltimoBackup,
  } = useAppLifecycle({
    pin,
    onLogout: () => {
      sessionStorage.removeItem('vistoria_pin');
      setPin(null);
      pinRef.current = null;
    },
    onAutoSync: tentarSincronizar,
  });

  // Inicialização do PIN e listeners
  useEffect(() => {
    const saved = sessionStorage.getItem('vistoria_pin');
    const savedRole = localStorage.getItem('vistoria_role') || 'viewer';
    setPin(saved);
    pinRef.current = saved;
    setUserRole(savedRole);
    setPinChecked(true);

    import('@/lib/syncQueue').then(({ startOfflineAutoRetry }) => {
      startOfflineAutoRetry(() => sessionStorage.getItem('vistoria_pin'));
    });

    if (window.location.hash.includes('onedrive_token=')) {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const tokenData = JSON.parse(hashParams.get('onedrive_token') || '{}');
        if (tokenData.access_token) {
          import('@/lib/onedrive').then(({ storeTokens }) => {
            storeTokens({
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_at: Date.now() + tokenData.expires_in * 1000,
            });
          });
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch {}
    }
  }, []);

  // Atalho de navegação direta
  useEffect(() => {
    const nav = localStorage.getItem('vistoria_navegar_para');
    if (nav) {
      localStorage.removeItem('vistoria_navegar_para');
      try {
        const { bloco, apto } = JSON.parse(nav);
        if (bloco && apto) {
          setBlocoAtual(bloco);
          setAptoAtual(apto);
          setView('captura');
        }
      } catch {}
    }
  }, []);

  const handleNavigation = useCallback((v: string) => {
    setActiveNav(v as typeof activeNav);
    haptic('selection');
    if (v === 'camera') setModoEscaneamento(true);
    else if (v === 'config') setView('configuracoes');
    else if (v === 'exportar') setView('exportar');
    else if (v === 'inicio') { setView('blocos'); setBlocoAtual(null); }
    else if (v === 'agenda') setView('agenda');
  }, []);

  // Scroll to top ao trocar de view
  useEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [view, blocoAtual]);

  // Header retrátil no scroll
  useEffect(() => {
    if (view !== 'blocos' || blocoAtual) return;
    const el = mainRef.current;
    if (!el) return;
    const handler = () => {
      setHeaderCollapsed(el.scrollTop > 120);
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [view, blocoAtual]);

  // Alto contraste
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', altoContraste);
  }, [altoContraste]);

  // Atalhos de teclado
  const blocoKeys = useMemo(() => {
    return blocos.map((b) => b.replace(/^Torre\s+/i, '').trim().toUpperCase()).sort();
  }, [blocos]);

  const handleKeyboardBack = useCallback(() => {
    if (view === 'captura') {
      setView('apartamentos');
      refreshStatus();
      setModoEscaneamento(false);
    } else if (view === 'apartamentos') {
      setView('blocos');
      setBlocoAtual(null);
    } else if (view !== 'blocos') {
      setView('blocos');
      setBlocoAtual(null);
    }
  }, [view, refreshStatus]);

  const handleKeyboardSearch = useCallback(() => {
    if (view !== 'blocos') {
      setView('blocos');
      setBlocoAtual(null);
    }
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>('[aria-label="Buscar apartamento em todos os blocos"]');
      el?.focus();
    }, 50);
  }, [view]);

  const handleKeyboardBloco = useCallback((idx: number) => {
    if (view !== 'blocos' || blocoAtual) return;
    const key = blocoKeys[idx];
    if (!key) return;
    const full = blocos.find((b) => b.replace(/^Torre\s+/i, '').trim().toUpperCase() === key);
    if (full) {
      haptic('light');
      setBlocoAtual(full);
      setView('apartamentos');
    }
  }, [view, blocoAtual, blocoKeys, blocos]);

  useKeyboardShortcuts(buildMainShortcuts({
    onSearch: handleKeyboardSearch,
    onBack: handleKeyboardBack,
    onBloco: handleKeyboardBloco,
  }), !!pin);

  // Busca global
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

  // Datas disponíveis
  const datasDisponiveis = useMemo(() => {
    const dates = new Set<string>();
    fotosOnline.forEach((f) => { if (f.data_leitura) dates.add(f.data_leitura); });
    return [...dates].sort().reverse();
  }, [fotosOnline]);

  // Desmarcar apartamento
  const handleDesmarcarExecutar = useCallback(async () => {
    if (!desmarcarConfirm) return;
    const { bloco, apto } = desmarcarConfirm;
    setDesmarcarConfirm(null);
    haptic('heavy');
    try {
      const resp = await authFetch('/api/status', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloco, apartamento: apto }),
      });
      if (resp.ok) {
        toast(`${apto} desmarcado como concluido`, 'success');
        await refreshStatus();
        refreshCommentCounts(bloco);
      } else {
        const data = await resp.json();
        toast(data.error || 'Erro ao desmarcar', 'error');
      }
    } catch {
      toast('Erro ao desmarcar apartamento', 'error');
    }
  }, [desmarcarConfirm, toast, refreshCommentCounts, refreshStatus]);

  // Pull to refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (pullStartY.current === 0) return;
    const diff = e.touches[0].clientY - pullStartY.current;
    if (diff > 0 && diff < 150) {
      pullDistanceRef.current = diff;
      setPullDistance(diff);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistanceRef.current > 80) {
      setIsRefreshing(true);
      await refreshStatus();
      refreshFotosOnline();
      await refreshCommentCounts(blocoAtual ?? undefined);
      setIsRefreshing(false);
    }
    pullDistanceRef.current = 0;
    setPullDistance(0);
    pullStartY.current = 0;
  }, [refreshStatus, refreshFotosOnline, refreshCommentCounts, blocoAtual]);

  // Backup & Restore manual
  async function handleBackup() {
    try {
      haptic('medium');
      const result = await fazerBackupManual();
      if (result.ok) {
        obterUltimoBackup().then((ts) => {
          setUltimoBackup(formatarTimestampBackup(ts));
        });
        toast('Backup salvo com sucesso', 'success');
      } else {
        toast('Erro ao fazer backup', 'error');
      }
    } catch {
      toast('Erro ao fazer backup', 'error');
    }
  }

  async function handleRestore() {
    try {
      haptic('medium');
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const text = await file.text();
        const result = await restaurarDados(text);
        toast(`Restaurado: ${result.fotos} fotos, ${result.syncLog} registros`, 'success');
        await refreshStatus();
      };
      input.click();
    } catch {
      toast('Erro ao restaurar backup', 'error');
    }
  }

  if (!pinChecked) return null;

  if (!pin) {
    return (
      <PinGate
        onOk={(p, role) => {
          sessionStorage.setItem('vistoria_pin', p);
          localStorage.setItem('vistoria_role', role);
          setPin(p);
          pinRef.current = p;
          setUserRole(role);
        }}
      />
    );
  }

  if (!lista) {
    return (
      <SetupScreen
        onDone={(l) => setLista(l)}
        onCancel={() => {
          if (listaAnterior) {
            setLista(listaAnterior);
            setListaAnterior(null);
          }
          setView('blocos');
        }}
      />
    );
  }

  if (view === 'configuracoes') {
    return (
      <>
        <ConfiguracoesClient
          onVoltar={() => setView('blocos')}
          onRefresh={() => refreshStatus()}
          onNavigate={(v) => setView(v as View)}
          pin={pin ?? undefined}
        />
        <BottomNav active="config" onNavigate={handleNavigation} />
      </>
    );
  }

  if (view === 'syncQueue') {
    return (
      <>
        <SyncQueueScreen onVoltar={() => setView('blocos')} />
        <BottomNav active="inicio" onNavigate={handleNavigation} />
      </>
    );
  }

  if (view === 'auditLog') {
    return (
      <>
        <AuditLogScreen onVoltar={() => setView('blocos')} />
        <BottomNav active="inicio" onNavigate={handleNavigation} />
      </>
    );
  }

  if (view === 'status') {
    return (
      <>
        <StatusScreen
          onVoltar={() => setView('blocos')}
          online={online}
          pendentes={pendentes}
          userRole={userRole as 'admin' | 'viewer' | null}
        />
        <BottomNav active="config" onNavigate={handleNavigation} />
      </>
    );
  }

  if (view === 'exportar') {
    return (
      <ExportarView
        blocos={blocos}
        statusMerged={statusMerged}
        status={status}
        fotosOnline={fotosOnline}
        lista={lista}
        pin={pin}
        onVoltar={() => setView('blocos')}
        onNavigate={handleNavigation}
        onFotosRecentesUpdate={setFotosRecentes}
      />
    );
  }

  if (view === 'heatmap') {
    return (
      <>
        <main className="min-h-[100dvh] bg-base">
          <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={spring}
              className="flex items-center gap-3 mb-6"
            >
              <button
                onClick={() => setView('blocos')}
                aria-label="Voltar"
                className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
              >
                <ArrowLeft size={18} weight="bold" aria-hidden="true" />
              </button>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Mapa de Progresso</h1>
                <p className="text-xs text-content-tertiary mt-0.5">Visao geral por torre e apartamento</p>
              </div>
            </motion.div>
            <ProgressHeatmap
              status={statusMerged}
              onNavigateToApto={(bloco, apto) => {
                setBlocoAtual(bloco);
                setAptoAtual(apto);
                setView('captura');
              }}
            />
          </div>
        </main>
        <BottomNav active="inicio" onNavigate={handleNavigation} />
      </>
    );
  }

  if (view === 'comparativo') {
    return (
      <>
        <main className="min-h-[100dvh] bg-base">
          <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={spring}
              className="flex items-center gap-3 mb-6"
            >
              <button
                onClick={() => setView('blocos')}
                aria-label="Voltar"
                className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
              >
                <ArrowLeft size={18} weight="bold" aria-hidden="true" />
              </button>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Comparativo entre Torres</h1>
                <p className="text-xs text-content-tertiary mt-0.5">Progresso de cada torre lado a lado</p>
              </div>
            </motion.div>
            <TowerComparison status={status} lista={lista || {}} />
          </div>
        </main>
        <BottomNav active="inicio" onNavigate={handleNavigation} />
      </>
    );
  }

  if (view === 'agenda') {
    return (
      <>
        <AgendaScreen
          key={agendaKey}
          onNavegarPara={(bloco, apto) => {
            setBlocoAtual(bloco);
            setAptoAtual(apto);
            setView('captura');
          }}
          onVoltar={() => setView('blocos')}
          onNovoAgendamento={() => setShowAgendamentoModal(true)}
          onEditar={(ag) => setAgendamentoEditando({ ...ag })}
        />
        <BottomNav active="agenda" onNavigate={handleNavigation} />
        {showAgendamentoModal && lista && (
          <NovoAgendamentoModal
            blocos={lista}
            statusList={statusMerged}
            onFechar={() => setShowAgendamentoModal(false)}
            onSalvo={() => {
              setShowAgendamentoModal(false);
              setAgendaKey((k) => k + 1);
              toast('Agendamento criado', 'success');
            }}
          />
        )}
        {agendamentoEditando && (
          <EditarAgendamentoModal
            agendamento={agendamentoEditando}
            onFechar={() => setAgendamentoEditando(null)}
            onSalvo={() => {
              setAgendamentoEditando(null);
              setAgendaKey((k) => k + 1);
              toast('Agendamento atualizado', 'success');
            }}
          />
        )}
      </>
    );
  }

  if (view === 'captura' && blocoAtual && aptoAtual) {
    const aptoIdx = aptosDoBloco.findIndex((a) => a.apartamento === aptoAtual);
    const proximoApto = aptosDoBloco.slice(aptoIdx + 1).find(
      (a) => !a.cybleAntesFeito || !a.cybleDepoisFeito
    );

    return (
      <>
        <CapturaScreen
          bloco={blocoAtual}
          apartamento={aptoAtual}
          onVoltar={() => {
            setView('apartamentos');
            refreshStatus();
            setModoEscaneamento(false);
          }}
          onFotoSalva={async () => {
            const freshStatus = await refreshStatus();
            const aptosDoBlocoAtual = freshStatus.filter((s) => s.bloco === blocoAtual);
            const totalAptosBloco = aptosDoBlocoAtual.length || (lista?.[blocoAtual || '']?.length ?? 0);
            const completosBloco = aptosDoBlocoAtual.filter((s) => s.cybleAntesFeito && s.cybleDepoisFeito).length;

            if (totalAptosBloco > 0 && completosBloco >= totalAptosBloco) {
              setConfettiVariant('tower');
            } else if (completosBloco > 0 && completosBloco % 10 === 0) {
              setConfettiVariant('block');
            } else {
              setConfettiVariant('normal');
            }
            setShowConfetti(true);
            setShowCheck(true);
            tentarSincronizar();
          }}
          modoEscaneamento={modoEscaneamento}
          proximoApto={modoEscaneamento && proximoApto ? proximoApto.apartamento : undefined}
          onProximoApto={modoEscaneamento && proximoApto ? () => {
            setAptoAtual(proximoApto.apartamento);
            refreshStatus();
          } : undefined}
          fotosOnline={fotosOnline.filter(
            (f) => normalizeBloco(f.bloco) === normalizeBloco(blocoAtual) && normApto(f.apartamento) === normApto(aptoAtual)
          )}
        />
        <SyncBanner online={online} pendentes={pendentes} onClick={() => setView('syncQueue')} />
      </>
    );
  }

  if (view === 'apartamentos' && blocoAtual) {
    return (
      <ApartamentosView
        blocoAtual={blocoAtual}
        aptosDoBloco={aptosDoBloco}
        aptosPaginados={aptosPaginados}
        aptosOnlineDoBloco={aptosOnlineDoBloco}
        busca={busca}
        onBuscaChange={setBusca}
        ordem={ordem}
        onOrdemChange={setOrdem}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        modoCompacto={modoCompacto}
        onModoCompactoToggle={() => {
          haptic('selection');
          const next = !modoCompacto;
          setModoCompactoState(next);
          setModoCompacto(next);
        }}
        altoContraste={altoContraste}
        onAltoContrasteToggle={() => {
          haptic('selection');
          const next = !altoContraste;
          setAltoContrasteState(next);
          setAltoContraste(next);
        }}
        modoEscaneamento={modoEscaneamento}
        headerCollapsed={headerCollapsed}
        loadingSkeleton={loadingSkeleton}
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        itensPagina={itensPagina}
        onPaginaChange={setPaginaAtual}
        onItensPaginaChange={(n) => { setItensPagina(n); setPaginaAtual(1); }}
        onVoltar={() => { setView('blocos'); setBlocoAtual(null); }}
        onAbrirApto={(apto) => { setAptoAtual(apto); setView('captura'); }}
        onDesmarcarConfirm={(bloco, apto) => setDesmarcarConfirm({ bloco, apto })}
        onAgendamentoSalvo={() => {
          setAgendamentoRapido(null);
          toast('Agendamento criado', 'success');
          setAgendaKey((k) => k + 1);
        }}
        comentarioCounts={comentarioCounts}
        onRefreshCommentCounts={refreshCommentCounts}
        userRole={userRole}
        online={online}
        pendentes={pendentes}
        onSyncBannerClick={() => setView('syncQueue')}
        ctxMenu={ctxMenu}
        ctxClose={ctxClose}
        agendamentoRapido={agendamentoRapido}
        setAgendamentoRapido={setAgendamentoRapido}
        showCommentsModal={showCommentsModal}
        setShowCommentsModal={setShowCommentsModal}
      />
    );
  }

  return (
    <main
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
              <ArrowClockwise size={20} weight="bold" className={pullDistance > 80 ? 'text-accent' : 'text-content-tertiary'} />
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
            <div className={`rounded-full bg-accent transition-all duration-300 ${headerCollapsed ? 'w-1.5 h-1.5 shadow-[0_0_0_2px_rgba(232,130,58,0.2)]' : 'w-2 h-2 shadow-[0_0_0_4px_rgba(232,130,58,0.2)]'}`} />
            <h1 className={`tracking-tight transition-all duration-300 ${headerCollapsed ? 'text-lg font-medium' : 'text-2xl font-bold'}`}>
              Vistoria Cyble
            </h1>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => { haptic('selection'); toggleTheme(); }}
                aria-label={theme === 'dark' ? 'Ativar modo claro' : theme === 'light' ? 'Ativar modo automático' : 'Ativar modo escuro'}
                className="tactile-press w-9 h-9 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
              >
                {theme === 'dark' && <Sun size={16} weight="bold" aria-hidden="true" />}
                {theme === 'light' && <Moon size={16} weight="bold" aria-hidden="true" />}
                {theme === 'auto' && <><Sun size={10} weight="bold" aria-hidden="true" /><Moon size={10} weight="bold" aria-hidden="true" className="ml-[-2px]" /></>}
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
          <p className={`text-content-tertiary ml-5 transition-all duration-300 ${headerCollapsed ? 'text-[10px] mt-0 max-h-0 overflow-hidden opacity-0' : 'text-sm mt-1 max-h-8 opacity-100'}`}>
            {modoEscaneamento ? 'Modo escaneamento: toque no apto e tire a foto direto' : 'Selecione o bloco para comecar.'}
          </p>
          {rtOnline && (
            <div className="ml-5 mt-2 flex items-center gap-1.5 text-[10px] text-content-tertiary">
              <span className={`w-1.5 h-1.5 rounded-full ${rtOnline ? 'bg-success' : 'bg-danger'}`} />
              <span>{rtOnline ? 'Online' : 'Offline'}${rtLastUpdate ? ` · atualizado ${rtLastUpdate}` : ''}</span>
            </div>
          )}
        </motion.div>

        <Dashboard
          status={status}
          pendentes={pendentes}
          fotosOnline={fotosOnline}
          datasDisponiveis={datasDisponiveis}
          dataFiltro={dataFiltro}
          dataInicio={dataInicio}
          onFiltroDataChange={setDataFiltro}
          onFiltroInicioChange={setDataInicio}
        />

        <button
          onClick={() => setView('comparativo')}
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
            setBlocoAtual(bloco);
            setAptoAtual(apto);
            setView('captura');
            setBuscaGlobal('');
          }}
        />

        {!buscaGlobal && (
          <FotosRecentes
            fotos={fotosRecentes}
            onSelect={(bloco, apto) => {
              setBlocoAtual(bloco);
              setAptoAtual(apto);
              setView('captura');
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
              setBlocoAtual(bloco);
              setAptoAtual(apto);
              setView('captura');
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
            onClick={() => { haptic('light'); setView('heatmap'); }}
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
          versaoNova={versaoNova}
          onBackup={handleBackup}
          onRestore={handleRestore}
          onLogout={() => {
            sessionStorage.removeItem('vistoria_pin');
            setPin(null);
            pinRef.current = null;
          }}
          onUpdate={() => {
            setUpdateDisponivel(false);
            navigator.serviceWorker?.controller?.postMessage('skipWaiting');
            window.dispatchEvent(new Event('sw-updated'));
          }}
          onEditLista={() => {
            setListaAnterior(lista);
            setLista(null);
          }}
          ultimoBackup={ultimoBackup}
        />
      </div>

      <BottomNav
        active={(view === 'blocos' && !blocoAtual) ? 'inicio' : activeNav}
        badges={pendentes > 0 ? { camera: pendentes } : undefined}
        onNavigate={handleNavigation}
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
              setBlocoAtual(bloco);
              setAptoAtual(apto);
              setView('captura');
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

      <ConfirmDialog
        open={!!desmarcarConfirm}
        title="Desmarcar como concluido"
        message={`Tem certeza que deseja desmarcar o apartamento ${desmarcarConfirm?.apto || ''}? Todas as fotos serao removidas permanentemente.`}
        confirmLabel="Sim, desmarcar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDesmarcarExecutar}
        onCancel={() => setDesmarcarConfirm(null)}
      />

      <SyncBanner online={online} pendentes={pendentes} onClick={() => setView('syncQueue')} />
    </main>
  );
}
