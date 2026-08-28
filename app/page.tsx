'use client';

import { useEffect, useMemo, useState, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Buildings,
  HouseLine,
  Camera,
  CheckCircle,
  Clock,
  FileText,
  Warning,
  MagnifyingGlass,
  ArrowLeft,
  ArrowUpRight,
  SortAscending,
  Cloud,
  CloudSlash,
  FunnelSimple,
  Calendar,
  CalendarDots,
  X,
  Sun,
  Moon,
  TrendUp,
  Scan,
  ArrowDown,
  ArrowClockwise,
  ChatText,
  CircleHalf,
  ChartBar,
  ArrowRight,
  Download,
} from '@phosphor-icons/react';
import { useToast } from '@/components/Toast';
import { useSyncProgress } from '@/components/ProgressToast';
import BottomNav from '@/components/BottomNav';
import { EmptyStateSearch, EmptyStatePhotos } from '@/components/EmptyState';
import { SearchBar, SearchResults } from '@/components/SearchBar';
import { FotosRecentes } from '@/components/FotosRecentes';
import { AtrasadosSection } from '@/components/AtrasadosSection';
import { BlocosGrid } from '@/components/BlocosGrid';
import ConfirmDialog from '@/components/ConfirmDialog';
import dynamic from 'next/dynamic';
const ExportSection = dynamic(() => import('@/components/ExportSection').then(m => ({ default: m.ExportSection })), { ssr: false, loading: () => <div className="h-32 bg-base-raised rounded-2xl animate-pulse" /> });
import { ProgressHeatmap } from '@/components/ProgressHeatmap';
import { BottomLinks } from '@/components/BottomLinks';
import { haptic } from '@/lib/haptic';
import { authFetch } from '@/lib/api';
import { spring, stagger, item } from '@/lib/motion';
import PinGate from './PinGate';
import SetupScreen from './SetupScreen';
import CapturaScreen from './CapturaScreen';
import {
  carregarListaApartamentos,
  statusDeTodosApartamentos,
  fotosPendentes,
  fotosPendentesCount,
  marcarSincronizada,
  desmarcarSincronizada,
  registrarSync,
  ultimasFotos,
  backupDados,
  restaurarDados,
  checarEspacoStorage,
  criarAgendamento,
  marcarTodosDocsOK,
  obterTodasFotos,
  obterComentarios,
  contarComentariosBloco,
  type ApartamentoStatus,
  type FotoRecord,
} from '@/lib/db';
// Lazy-loaded export functions (heavy libraries: jspdf, xlsx, jszip)
const loadExport = () => import('@/lib/export');
const loadExportJSON = () => import('@/lib/export/json');
import { useTheme } from '@/lib/theme';
import { Confetti, SuccessCheck } from '@/components/SuccessAnimation';
import {
  fazerBackupManual,
  fazerBackupAutomatico,
  obterUltimoBackup,
  deveFazerBackup,
  formatarTimestampBackup,
} from '@/lib/backup';
import { estaNoIntervalo, obterPeriodoAtalho, formatarDataParaInput, normApto, normalizeBloco, emAndamento, fotosMapKey } from '@/lib/utils';
import { getDiasAlerta, getItensPagina, getSalvarEm, getBackupIntervalo, getModoCompacto, setModoCompacto, getAltoContraste, setAltoContraste } from '@/lib/settings';
import { addNotification, autoDismiss } from '@/lib/notifications';
import { notifySyncComplete, notifySyncFailed, notifyOffline, notifyOnline } from '@/lib/notificationsPush';
import {
  INACTIVITY_TIMEOUT_MS,
  STORAGE_WARNING_PCT,
  SYNC_INTERVAL_MS,
  SYNC_CONCURRENCY,
  MS_PER_DAY,
} from '@/lib/constants';
import { logAudit } from '@/lib/auditLog';
import { APP_VERSION } from '@/lib/version';
import { startAutoBackup, stopAutoBackup } from '@/lib/autoBackup';
import { OnboardingTour, shouldShowTutorial, markTutorialDone } from '@/components/OnboardingTour';
import NotificationCenter from '@/components/NotificationCenter';
import ConfiguracoesClient from '@/app/configuracoes/ConfiguracoesClient';
import { useKeyboardShortcuts, buildMainShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useVirtualizer } from '@tanstack/react-virtual';
import TowerReportPanel from '@/components/TowerReportPanel';
import SyncQueueScreen from '@/components/SyncQueueScreen';
import AuditLogScreen from '@/components/AuditLogScreen';
import StatusScreen from '@/components/StatusScreen';
import AgendaScreen from '@/components/AgendaScreen';
import NovoAgendamentoModal from '@/components/NovoAgendamentoModal';
import QuickScheduleModal from '@/components/QuickScheduleModal';
import EditarAgendamentoModal from '@/components/EditarAgendamentoModal';
import { useContextMenu } from '@/components/ContextMenu';
import AptoCard from '@/components/AptoCard';
import TowerComparison from '@/components/TowerComparison';
import CommentsModal from '@/components/CommentsModal';
import { useRealTimeStatus } from '@/hooks/useRealTimeStatus';

type View = 'blocos' | 'apartamentos' | 'captura' | 'configuracoes' | 'syncQueue' | 'auditLog' | 'exportar' | 'heatmap' | 'agenda' | 'comparativo' | 'status';

interface FotoOnline {
  id: number;
  bloco: string;
  apartamento: string;
  data_leitura: string;
  foto_url: string;
  foto_index: number;
}

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
  const [lista, setLista] = useState<Record<string, string[]> | null>(null);
  const [listaAnterior, setListaAnterior] = useState<Record<string, string[]> | null>(null);
  const [status, setStatus] = useState<ApartamentoStatus[]>([]);
  const [view, setView] = useState<View>('blocos');
  const [blocoAtual, setBlocoAtual] = useState<string | null>(null);
  const [aptoAtual, setAptoAtual] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<'original' | 'pendentes'>('original');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'concluido' | 'em_andamento' | 'pendente'>('todos');
  const [pendentes, setPendentes] = useState(0);
  const [online, setOnline] = useState(true);
  const [fotosOnline, setFotosOnline] = useState<FotoOnline[]>([]);
  const [buscaGlobal, setBuscaGlobal] = useState('');
  const [dataFiltro, setDataFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [compartilhando, setCompartilhando] = useState<'pdf' | 'xlsx' | 'report' | null>(null);
  const [modoEscaneamento, setModoEscaneamento] = useState(false);
  const [fotosRecentes, setFotosRecentes] = useState<FotoRecord[]>([]);
  const [allFotos, setAllFotos] = useState<FotoRecord[]>([]);
  const [torresExportacao, setTorresExportacao] = useState<Set<string>>(new Set());
  const [showEstatisticas, setShowEstatisticas] = useState(false);
  const [showEstatisticasTorre, setShowEstatisticasTorre] = useState(false);
  const [diasAlerta, setDiasAlerta] = useState(7);
  const [showAtrasados, setShowAtrasados] = useState(false);
  const [itensPagina, setItensPagina] = useState<10 | 20 | 50 | 999>(20);
  const [selectedTower, setSelectedTower] = useState<string | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const { theme, toggle: toggleTheme } = useTheme();
  const { toast } = useToast();
  const { showSyncProgress, updateSyncProgress, dismissSyncProgress } = useSyncProgress();
  const [activeNav, setActiveNav] = useState<'inicio' | 'camera' | 'galeria' | 'agenda' | 'exportar' | 'config'>('inicio');
  const [loadingSkeleton, setLoadingSkeleton] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiVariant, setConfettiVariant] = useState<'normal' | 'block' | 'tower' | 'mega'>('normal');
  const [showCheck, setShowCheck] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportandoZIP, setExportandoZIP] = useState(false);
  const [exportandoFotos, setExportandoFotos] = useState(false);
  const [updateDisponivel, setUpdateDisponivel] = useState(false);
  const [versaoAtual, setVersaoAtual] = useState(APP_VERSION);
  const [versaoNova, setVersaoNova] = useState(APP_VERSION);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [agendamentoRapido, setAgendamentoRapido] = useState<{ bloco: string; apto: string } | null>(null);
  const [agendaKey, setAgendaKey] = useState(0);
  const [agendamentoEditando, setAgendamentoEditando] = useState<Agendamento | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [espacoStorage, setEspacoStorage] = useState<{ usado: number; total: number; pct: number } | null>(null);
  const [ultimoBackup, setUltimoBackup] = useState<string>('Nunca');
  const [modoCompacto, setModoCompactoState] = useState(false);
  const [altoContraste, setAltoContrasteState] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [apenasPendentes, setApenasPendentes] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showPDFOptions, setShowPDFOptions] = useState(false);
  const [pdfAccentColor, setPDFAccentColor] = useState<[number, number, number]>([232, 130, 58]);
  const pullStartY = useRef(0);
  const pullDistanceRef = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const { menu: ctxMenu, openMenu: ctxOpen, closeMenu: ctxClose } = useContextMenu();
  const { status: rtStatus, lastUpdate: rtLastUpdate, online: rtOnline, refresh: rtRefresh } = useRealTimeStatus();
  const [showCommentsModal, setShowCommentsModal] = useState<{ bloco: string; apto: string } | null>(null);
  const [comentarioCounts, setComentarioCounts] = useState<Record<string, number>>({});
  const [desmarcarConfirm, setDesmarcarConfirm] = useState<{ bloco: string; apto: string } | null>(null);
  useEffect(() => {
    const saved = sessionStorage.getItem('vistoria_pin');
    const savedRole = localStorage.getItem('vistoria_role') || 'viewer';
    setPin(saved);
    pinRef.current = saved;
    setUserRole(savedRole);
    setPinChecked(true);
    setDiasAlerta(getDiasAlerta());
    setItensPagina(getItensPagina() as 10 | 20 | 50 | 999);
    setModoCompactoState(getModoCompacto());
    setAltoContrasteState(getAltoContraste());

    // Start offline auto-retry
    import('@/lib/syncQueue').then(({ startOfflineAutoRetry }) => {
      startOfflineAutoRetry(() => sessionStorage.getItem('vistoria_pin'));
    });

    // Handle OneDrive OAuth callback (tokens in URL hash)
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
          // Clean hash from URL
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch { /* ignore */ }
    }
  }, []);

  const lastActivityRef = useRef(Date.now());
  const syncLockRef = useRef(false);
  const pinRef = useRef<string | null>(null);

  const handleNavigation = useCallback((v: string) => {
    setActiveNav(v as typeof activeNav);
    haptic('selection');
    if (v === 'camera') setModoEscaneamento(true);
    else if (v === 'config') setView('configuracoes');
    else if (v === 'exportar') setView('exportar');
    else if (v === 'inicio') { setView('blocos'); setBlocoAtual(null); }
    else if (v === 'agenda') setView('agenda');
  }, []);

  useEffect(() => {
    if (!pin) return;
    const TIMEOUT_MS = INACTIVITY_TIMEOUT_MS;
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    const resetTimer = () => { lastActivityRef.current = Date.now(); };
    events.forEach((e) => window.addEventListener(e, resetTimer));
    const check = setInterval(() => {
      if (Date.now() - lastActivityRef.current > TIMEOUT_MS) {
        sessionStorage.removeItem('vistoria_pin');
        setPin(null);
        pinRef.current = null;
      }
    }, 60000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      clearInterval(check);
    };
  }, [pin]);

  // Checar atualização via service worker
  useEffect(() => {
    if (!pin) return;
    if (!('serviceWorker' in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'versionCheck') {
        setVersaoAtual(event.data.currentVersion);
        setVersaoNova(event.data.latestVersion);
        if (event.data.hasUpdate) {
          navigator.serviceWorker?.controller?.postMessage('skipWaiting');
          setUpdateDisponivel(true);
          toast('Nova versao disponivel!', 'info', {
            duration: 0,
            undoLabel: 'Atualizar',
            onUndo: () => {
              setUpdateDisponivel(false);
              navigator.serviceWorker?.controller?.postMessage('skipWaiting');
              window.dispatchEvent(new Event('sw-updated'));
              window.location.reload();
            },
          });
        }
      }
      if (event.data?.type === 'syncTriggered') {
        tentarSincronizar();
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update();
      reg.active?.postMessage('checkVersion');
    }).catch(() => {});

    // Soft refresh handler: re-fetch data without full page reload
    const handleSwUpdated = () => {
      // Reload status, pendentes, and other data
      if (pin) {
        carregarListaApartamentos().then((l) => setLista(Object.keys(l).length ? l : null));
      }
    };
    window.addEventListener('sw-updated', handleSwUpdated);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handler);
      window.removeEventListener('sw-updated', handleSwUpdated);
    };
  }, [pin, toast]);

  useEffect(() => {
    if (pin) {
      carregarListaApartamentos().then((l) => setLista(Object.keys(l).length ? l : null));
    }
  }, [pin]);

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

  useEffect(() => {
    if (!pin) return;
    fetch('/api/fotos', { headers: { 'x-app-pin': pin } })
      .then((r) => r.json())
      .then((data) => setFotosOnline(data.fotos || []))
      .catch(() => {});
  }, [pin]);

  const refreshFotosOnline = useCallback(() => {
    if (!pin) return;
    fetch('/api/fotos', { headers: { 'x-app-pin': pin } })
      .then((r) => r.json())
      .then((data) => setFotosOnline(data.fotos || []))
      .catch(() => {});
  }, [pin]);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event & { preventDefault: () => void }) => {
      e.preventDefault();
      setDeferredPrompt(e as typeof deferredPrompt);
      const dismissed = localStorage.getItem('vistoria_install_dismissed');
      if (!dismissed) setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Onboarding na primeira vez
  useEffect(() => {
    if (pin && !localStorage.getItem('vistoria_onboarding_done') && !shouldShowTutorial()) {
      setShowOnboarding(true);
    }
  }, [pin]);

  // Checar espaço do IndexedDB
  useEffect(() => {
    if (!pin) return;
    let notified = false;
    checarEspacoStorage().then((e) => {
      setEspacoStorage(e);
      if (e && e.pct > STORAGE_WARNING_PCT && !notified) {
        notified = true;
        addNotification({ tipo: 'storage', titulo: 'Armazenamento quase cheio', mensagem: `${e.pct}% do espaco utilizado. Considere fazer backup e limpar fotos locais.` });
      }
    });
    const interval = setInterval(() => {
      checarEspacoStorage().then((e) => {
        setEspacoStorage(e);
      if (e && e.pct > STORAGE_WARNING_PCT && !notified) {
          notified = true;
          addNotification({ tipo: 'storage', titulo: 'Armazenamento quase cheio', mensagem: `${e.pct}% do espaco utilizado. Considere fazer backup e limpar fotos locais.` });
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [pin]);

  // Carregar último backup e fazer backup automático
  useEffect(() => {
    if (!pin) return;
    obterUltimoBackup().then((ts) => {
      setUltimoBackup(formatarTimestampBackup(ts));
    });
    deveFazerBackup().then((deve) => {
      if (deve) {
        fazerBackupAutomatico().then((res) => {
          if (res.ok) {
            obterUltimoBackup().then((ts) => {
              setUltimoBackup(formatarTimestampBackup(ts));
            });
          }
        });
      }
    });

    // Backup periódico em background
    const salvarEm = getSalvarEm();
    const intervaloMs = getBackupIntervalo() * 60 * 1000;
    const backupInterval = salvarEm !== 'dispositivo' ? setInterval(() => {
      deveFazerBackup().then((deve) => {
        if (deve) {
          fazerBackupAutomatico().then((res) => {
            if (res.ok) {
              obterUltimoBackup().then((ts) => {
                setUltimoBackup(formatarTimestampBackup(ts));
              });
              toast('Backup automatico realizado', 'success');
              logAudit('backup_created', 'Backup automático agendado');
            }
          });
        }
      });
    }, intervaloMs) : undefined;

    return () => { if (backupInterval) clearInterval(backupInterval); };
  }, [pin]);

  // Sync automático em background (visibility change)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && pin) {
        tentarSincronizar();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  // Scroll to top on view change (fixes PC list starting at bottom)
  useEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [view, blocoAtual]);

  // Collapsible header on scroll
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

  // High contrast mode
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', altoContraste);
  }, [altoContraste]);

  // Auto-backup
  useEffect(() => {
    if (getSalvarEm() !== 'dispositivo' && pin) {
      startAutoBackup();
    }
    return () => stopAutoBackup();
  }, [pin]);

  // Tutorial
  useEffect(() => {
    if (pin && shouldShowTutorial()) {
      setShowTutorial(true);
    }
  }, [pin]);

  // Carregar fotos recentes
  useEffect(() => {
    ultimasFotos(10).then(setFotosRecentes);
  }, [status]);

  // Carregar todas as fotos apenas na view de exportação
  useEffect(() => {
    if (view === 'exportar') {
      obterTodasFotos().then(setAllFotos);
    }
  }, [view]);

  // Carregar contagem de comentarios por apto
  const refreshCommentCounts = useCallback(async (bloco?: string) => {
    const b = bloco || blocoAtual;
    if (!b || !lista?.[b]) return;
    // Use batch query instead of 180+ individual queries
    const counts = await contarComentariosBloco(b);
    setComentarioCounts((prev) => ({ ...prev, ...counts }));
  }, [blocoAtual, lista]);

  useEffect(() => {
    refreshCommentCounts();
  }, [refreshCommentCounts]);

  // Desmarcar apartamento como concluido — confirma unica
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
        refreshCommentCounts();
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
      ultimasFotos(10).then(setFotosRecentes);
      await refreshCommentCounts();
      setIsRefreshing(false);
    }
    pullDistanceRef.current = 0;
    setPullDistance(0);
    pullStartY.current = 0;
  }, [refreshStatus, refreshFotosOnline, refreshCommentCounts]);

  // Backup
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
    } catch (err) {
      console.warn('handleBackup error:', err);
      toast('Erro ao fazer backup', 'error');
    }
  }

  // Restore
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
        ultimasFotos(10).then(setFotosRecentes);
      };
      input.click();
    } catch (err) {
      console.warn('handleRestore error:', err);
      toast('Erro ao restaurar backup', 'error');
    }
  }

  async function refreshStatus() {
    try {
      if (lista) {
        setLoadingSkeleton(true);
        const newStatus = await statusDeTodosApartamentos(lista);
        setStatus(newStatus);
        setLoadingSkeleton(false);
        setPendentes(await fotosPendentesCount());
        return newStatus;
      }
      setPendentes(await fotosPendentesCount());
      return status;
    } catch (err) {
      console.warn('refreshStatus error:', err);
      setLoadingSkeleton(false);
      return status;
    }
  }

  useEffect(() => {
    if (lista) refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista]);

  useEffect(() => {
    // Check online with a small delay to avoid false negatives on PWA reload
    const timer = setTimeout(() => {
      setOnline(navigator.onLine);
      // Also do a real fetch check in case navigator.onLine is wrong
      if (navigator.onLine) {
        fetch('/api/version', { method: 'HEAD', cache: 'no-store' })
          .then(() => setOnline(true))
          .catch(() => setOnline(false));
      }
    }, 500);
    const on = () => {
      setOnline(true);
      notifyOnline();
      // Register background sync for when connectivity returns
      navigator.serviceWorker?.controller?.postMessage('requestSync');
      tentarSincronizar();
    };
    const off = () => { setOnline(false); notifyOffline(); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const interval = setInterval(tentarSincronizar, SYNC_INTERVAL_MS);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function tentarSincronizar() {
    const currentPin = pinRef.current;
    if (!navigator.onLine || !currentPin) return;
    if (getSalvarEm() === 'dispositivo') return;

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
  }

  // Pre-computed maps for O(1) lookups
  const statusMap = useMemo(() => {
    const map = new Map<string, ApartamentoStatus>();
    for (const s of status) {
      map.set(`${s.bloco}__${normApto(s.apartamento)}`, s);
    }
    return map;
  }, [status]);

  const fotosOnlineMap = useMemo(() => {
    const map = new Map<string, { count: number; aptos: Set<string> }>();
    fotosOnline.forEach((f) => {
      const key = normalizeBloco(f.bloco);
      if (!map.has(key)) map.set(key, { count: 0, aptos: new Set() });
      const entry = map.get(key)!;
      entry.count++;
      entry.aptos.add(normApto(f.apartamento));
    });
    return map;
  }, [fotosOnline]);

  const fotosCountMap = useMemo(() => {
    const map = new Map<string, number>();
    fotosOnline.forEach((f) => {
      const key = `${normalizeBloco(f.bloco)}__${normApto(f.apartamento)}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [fotosOnline]);

  const blocos = useMemo(() => {
    const fromLista = lista ? Object.keys(lista) : [];
    const fromOnline = [...fotosOnlineMap.keys()];
    const allRaw = new Set([...fromLista, ...fromOnline]);
    const letterMap = new Map<string, string>();
    const result: string[] = [];
    for (const b of allRaw) {
      const letter = b.replace(/^Torre\s+/i, '').trim();
      if (letter.length === 1 && /^[A-H]$/i.test(letter)) {
        const key = letter.toUpperCase();
        if (!letterMap.has(key)) {
          const torreName = fromLista.find((n) => n.toUpperCase() === `TORRE ${key}`) || b;
          letterMap.set(key, torreName);
          result.push(torreName);
        }
      } else {
        result.push(b);
      }
    }
    return result.sort();
  }, [lista, fotosOnlineMap]);

  // Keyboard shortcuts: / = search, Escape = back, 1-8 = switch bloco
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

  const aptosOnlineDoBloco = useMemo(() => {
    if (!blocoAtual) return new Set<string>();
    const entry = fotosOnlineMap.get(normalizeBloco(blocoAtual));
    return entry?.aptos ?? new Set<string>();
  }, [fotosOnlineMap, blocoAtual]);

  const aptosDoBloco = useMemo(() => {
    if (!blocoAtual) return [];

    const resolvedBloco = normalizeBloco(blocoAtual);
    const codigosLocais = (lista?.[resolvedBloco] || []).map(normApto);
    const aptosOnlineList = [...aptosOnlineDoBloco];

    const allAptos = new Set<string>([
      ...codigosLocais,
      ...aptosOnlineList,
    ]);

    const result = [...allAptos]
      .map((c) => {
        const local = statusMap.get(`${resolvedBloco}__${c}`);
        if (local) return { ...local, apartamento: c };
        const temFotoOnline = aptosOnlineDoBloco.has(c);
        return {
          bloco: resolvedBloco, apartamento: c,
          cybleAntesFeito: temFotoOnline, cybleDepoisFeito: temFotoOnline,
          qtdDocumentos: 0, qtdFotos: fotosCountMap.get(`${resolvedBloco}__${c}`) || 0,
        };
      })
      .filter((s) => s.apartamento.toLowerCase().includes(busca.toLowerCase()));

    // Status filter
    const statusFiltered = result.filter((s) => {
      if (statusFilter === 'todos') return true;
      const st = s.cybleAntesFeito && s.cybleDepoisFeito ? 'concluido'
        : (s.cybleAntesFeito || s.cybleDepoisFeito || s.qtdDocumentos > 0) ? 'em_andamento'
        : 'pendente';
      return st === statusFilter;
    });

    if (ordem === 'pendentes') {
      statusFiltered.sort((a, b) => {
        const aC = a.cybleAntesFeito && a.cybleDepoisFeito;
        const bC = b.cybleAntesFeito && b.cybleDepoisFeito;
        if (aC === bC) return 0;
        return aC ? 1 : -1;
      });
    } else {
      statusFiltered.sort((a, b) => a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true }));
    }

    return statusFiltered;
  }, [blocoAtual, lista, statusMap, busca, ordem, statusFilter, aptosOnlineDoBloco, fotosCountMap]);

  // Paginacao
  const totalPaginas = itensPagina === 999 ? 1 : Math.ceil(aptosDoBloco.length / itensPagina);
  const aptosPaginados = useMemo(() => {
    if (itensPagina === 999) return aptosDoBloco;
    const start = (paginaAtual - 1) * itensPagina;
    return aptosDoBloco.slice(start, start + itensPagina);
  }, [aptosDoBloco, paginaAtual, itensPagina]);

  // Virtualizer for apartment list (improves perf with large lists)
  const listParentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: aptosPaginados.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 64, // ~64px per AptoCard
    overscan: 5,
  });

  useEffect(() => { setPaginaAtual(1); }, [blocoAtual, busca, ordem]);

  // Global search results
  const resultadosBuscaGlobal = useMemo(() => {
    if (!buscaGlobal.trim() || buscaGlobal.length < 2) return [];
    const raw = buscaGlobal.toLowerCase().trim();
    // Try to extract block letter from patterns like "torre a 77", "a 77", "a77"
    const blockMatch = raw.match(/(?:torre\s*)?([a-h])\s*(\d+)?/i);
    const searchBlock = blockMatch?.[1]?.toUpperCase() || '';
    const searchNum = blockMatch?.[2] || raw.replace(/[^0-9]/g, '');
    const q = searchNum ? normApto(searchNum) : raw;
    const results: { bloco: string; apto: string; status: ApartamentoStatus | null }[] = [];
    for (const b of blocos) {
      // If user specified a block, skip other blocks
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

  // Available dates from online photos
  const datasDisponiveis = useMemo(() => {
    const dates = new Set<string>();
    fotosOnline.forEach((f) => { if (f.data_leitura) dates.add(f.data_leitura); });
    return [...dates].sort().reverse();
  }, [fotosOnline]);

  // Dashboard with date filter
  const statusFiltradoPorData = useMemo(() => {
    const hasDateFilter = dataFiltro || dataInicio;
    if (!hasDateFilter) return status;

    const aptosComFotoNoPeriodo = new Set<string>();
    fotosOnline.forEach((f) => {
      const dataFoto = f.data_leitura;
      if (!dataFoto) return;

      // Single date filter (backward compatibility)
      if (dataFiltro && dataInicio) {
        // Range filter
        if (estaNoIntervalo(dataFoto, dataInicio, dataFiltro)) {
          aptosComFotoNoPeriodo.add(`${f.bloco}__${normApto(f.apartamento)}`);
        }
      } else if (dataFiltro) {
        // Single date (end date)
        if (dataFoto === dataFiltro) {
          aptosComFotoNoPeriodo.add(`${f.bloco}__${normApto(f.apartamento)}`);
        }
      } else if (dataInicio) {
        // Start date only (from start date to today)
        const hoje = formatarDataParaInput(new Date());
        if (estaNoIntervalo(dataFoto, dataInicio, hoje)) {
          aptosComFotoNoPeriodo.add(`${f.bloco}__${normApto(f.apartamento)}`);
        }
      }
    });
    return status.filter((s) => aptosComFotoNoPeriodo.has(`${s.bloco}__${s.apartamento}`));
  }, [status, dataFiltro, dataInicio, fotosOnline]);

  const progressoMap = useMemo(() => {
    const map = new Map<string, { texto: string; pct: number }>();
    for (const b of blocos) {
      const codigosLocais = (lista?.[b] || []).map(normApto);
      const entry = fotosOnlineMap.get(b);
      const aptosOnline = entry?.aptos ?? new Set<string>();
      const allAptos = new Set<string>([...codigosLocais, ...aptosOnline]);
      const total = allAptos.size;
      const completos = [...allAptos].filter((c) => {
        const st = statusMap.get(`${b}__${c}`);
        const feitoLocal = st && st.cybleAntesFeito && st.cybleDepoisFeito;
        const feitoOnline = aptosOnline.has(c);
        return feitoLocal || feitoOnline;
      }).length;
      const pct = total > 0 ? Math.round((completos / total) * 100) : 0;
      map.set(b, { texto: `${completos}/${total}`, pct });
    }
    return map;
  }, [blocos, lista, fotosOnlineMap, statusMap]);

  // Aptos sem foto ha X dias (baseado nas fotos online)
  const aptosEsquecidos = useMemo(() => {
    const cutoff = Date.now() - diasAlerta * MS_PER_DAY;
    const aptosComFotoRecente = new Set<string>();
    fotosOnline.forEach((f) => {
      const ts = new Date(f.data_leitura + 'T12:00:00').getTime();
      if (ts > cutoff) aptosComFotoRecente.add(`${f.bloco}__${normApto(f.apartamento)}`);
    });
    // Also check local status
    status.forEach((s) => {
      if (s.cybleAntesFeito || s.cybleDepoisFeito) {
        aptosComFotoRecente.add(`${s.bloco}__${normApto(s.apartamento)}`);
      }
    });
    const result: { bloco: string; apartamento: string }[] = [];
    for (const b of blocos) {
      const codigosLocais = (lista?.[b] || []).map(normApto);
      const entry = fotosOnlineMap.get(b);
      const aptosOnline = entry?.aptos ?? new Set<string>();
      const allAptos = new Set<string>([...codigosLocais, ...aptosOnline]);
      for (const c of allAptos) {
        if (!aptosComFotoRecente.has(`${b}__${c}`)) {
          result.push({ bloco: b, apartamento: c });
        }
      }
    }
    return result;
  }, [fotosOnline, status, blocos, lista, fotosOnlineMap, diasAlerta]);

  // Status mesclado (local + online) para exportação
  const statusMerged = useMemo(() => {
    const merged = new Map<string, ApartamentoStatus>();

    // 1. Adicionar todos os status locais
    for (const s of status) {
      const key = `${s.bloco}__${normApto(s.apartamento)}`;
      merged.set(key, { ...s, apartamento: normApto(s.apartamento) });
    }

    // 2. Adicionar aptos que existem apenas online (nao na lista local)
    for (const b of blocos) {
      const entry = fotosOnlineMap.get(b);
      const aptosOnline = entry?.aptos ?? new Set<string>();
      for (const apto of aptosOnline) {
        const key = `${b}__${apto}`;
        if (!merged.has(key)) {
          merged.set(key, {
            bloco: b,
            apartamento: apto,
            cybleAntesFeito: true,
            cybleDepoisFeito: true,
            qtdDocumentos: 0,
            qtdFotos: fotosCountMap.get(key) || 0,
          });
        } else {
          const existing = merged.get(key)!;
          existing.cybleAntesFeito = true;
          existing.cybleDepoisFeito = true;
        }
      }
    }

    // 3. Atualizar contagem de fotos (max entre local e online) para aptos existentes
    for (const [key, s] of merged) {
      const onlineCount = fotosCountMap.get(key) || 0;
      if (onlineCount > s.qtdFotos) {
        s.qtdFotos = onlineCount;
      }
    }

    return [...merged.values()];
  }, [status, blocos, fotosOnlineMap, fotosCountMap]);

  // Status filtrado para exportação (por torre e período)
  const statusExportacao = useMemo(() => {
    const base = (dataFiltro || dataInicio) ? statusFiltradoPorData : statusMerged;
    if (torresExportacao.size === 0) return base;
    return base.filter((s) => torresExportacao.has(s.bloco));
  }, [statusMerged, statusFiltradoPorData, torresExportacao, dataFiltro, dataInicio]);

  const handleNavigateToApto = useCallback((bloco: string, apto: string) => {
    setBlocoAtual(bloco);
    setAptoAtual(apto);
    setView('captura');
  }, []);

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
        onCancel={() => { if (listaAnterior) { setLista(listaAnterior); setListaAnterior(null); } setView('blocos'); }}
      />
    );
  }

  if (view === 'configuracoes') {
    return (
      <>
        <ConfiguracoesClient onVoltar={() => setView('blocos')} onRefresh={() => refreshStatus()} onNavigate={(v) => setView(v as View)} pin={pin ?? undefined} />
        <BottomNav
          active="config"
          onNavigate={handleNavigation}
        />
      </>
    );
  }

  if (view === 'syncQueue') {
    return (
      <>
        <SyncQueueScreen onVoltar={() => setView('blocos')} />
        <BottomNav
          active="inicio"
          onNavigate={handleNavigation}
        />
      </>
    );
  }

  if (view === 'auditLog') {
    return (
      <>
        <AuditLogScreen onVoltar={() => setView('blocos')} />
        <BottomNav
          active="inicio"
          onNavigate={handleNavigation}
        />
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
        <BottomNav
          active="config"
          onNavigate={handleNavigation}
        />
      </>
    );
  }

  if (view === 'exportar') {
    return (
      <>
        <main className="min-h-dvh bg-base pb-24">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-base-border">
              <button
                onClick={() => setView('blocos')}
                className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                aria-label="Voltar"
              >
                <ArrowLeft size={18} weight="bold" />
              </button>
              <div className="flex items-center gap-2">
                <Download size={20} weight="duotone" className="text-accent" />
                <h1 className="text-xl font-semibold tracking-tight">Exportar</h1>
              </div>
            </div>
            <div className="px-4 pt-4">
            <ExportSection
              blocos={blocos}
              torresExportacao={torresExportacao}
              onTorresChange={setTorresExportacao}
              statusExportacao={statusExportacao}
              showEstatisticas={showEstatisticas}
              showEstatisticasTorre={showEstatisticasTorre}
              onToggleEstatisticas={() => setShowEstatisticas(!showEstatisticas)}
              onToggleEstatisticasTorre={() => setShowEstatisticasTorre(!showEstatisticasTorre)}
              dataInicio={dataInicio}
              dataFim={dataFiltro}
              apenasPendentes={apenasPendentes}
              onToggleApenasPendentes={() => setApenasPendentes(!apenasPendentes)}
              onExportCSV={async (s) => { const { exportarCSV } = await loadExport(); exportarCSV(s); }}
              onExportPDF={async (s) => { const { exportarPDF } = await loadExport(); exportarPDF(s, 'Vistoria Cyble'); }}
              onExportXLSX={async (s) => { const { exportarXLSX } = await loadExport(); exportarXLSX(s, 'Vistoria Cyble'); }}
              onCompartilharPDF={async (s) => { setCompartilhando('pdf'); const { compartilharPDF } = await loadExport(); await compartilharPDF(s, 'Vistoria Cyble'); setCompartilhando(null); }}
              onCompartilharXLSX={async (s) => { setCompartilhando('xlsx'); const { compartilharXLSX } = await loadExport(); await compartilharXLSX(s, 'Vistoria Cyble'); setCompartilhando(null); }}
              onExportZIP={async (s) => { setExportandoZIP(true); try { const { exportarZIP } = await loadExport(); await exportarZIP(s, 'Vistoria Cyble', { onProgress: () => {} }); } finally { setExportandoZIP(false); } }}
              onRelatorioPDFComFotos={async (s) => { setExportandoFotos(true); try { const { relatorioPDFComFotos } = await loadExport(); await relatorioPDFComFotos(s, 'Vistoria Cyble', { onProgress: () => {} }); } finally { setExportandoFotos(false); } }}
              onExportHTML={async (s) => {
                const { gerarRelatorioHTML, downloadHTML } = await loadExport();
                const fotosMap = new Map<string, { fotoUrl: string; categoria: string }[]>();
                for (const f of fotosOnline) {
                  const key = fotosMapKey(f.bloco, f.apartamento);
                  const arr = fotosMap.get(key) ?? [];
                  arr.push({ fotoUrl: f.foto_url, categoria: f.foto_url.includes('antes') ? 'cyble_antes' : f.foto_url.includes('depois') ? 'cyble_depois' : 'documento' });
                  fotosMap.set(key, arr);
                }
                const html = gerarRelatorioHTML(s, fotosMap, torresExportacao.size > 0 ? torresExportacao : undefined);
                downloadHTML(html, `vistoria-cyble-${new Date().toISOString().slice(0, 10)}.html`);
                logAudit('export_html', `Relatorio HTML gerado (${s.length} aptos)`);
              }}
              onExportJSON={async (s) => { const { exportarJSON } = await loadExportJSON(); exportarJSON(s, 'Vistoria Cyble'); logAudit('export_json', `Export JSON gerado (${s.length} aptos)`); }}
              showPDFOptions={showPDFOptions}
              onTogglePDFOptions={() => setShowPDFOptions(!showPDFOptions)}
              pdfAccentColor={pdfAccentColor}
              onPDFColorChange={setPDFAccentColor}
              onShareReport={async (s) => {
                setCompartilhando('report');
                try {
                  const { gerarRelatorioHTML } = await loadExport();
                  const fotosMap = new Map<string, { fotoUrl: string; categoria: string }[]>();
                  for (const f of fotosOnline) {
                    const key = fotosMapKey(f.bloco, f.apartamento);
                    const arr = fotosMap.get(key) ?? [];
                    arr.push({ fotoUrl: f.foto_url, categoria: f.foto_url.includes('antes') ? 'cyble_antes' : f.foto_url.includes('depois') ? 'cyble_depois' : 'documento' });
                    fotosMap.set(key, arr);
                  }
                  const html = gerarRelatorioHTML(s, fotosMap, torresExportacao.size > 0 ? torresExportacao : undefined);
                  const res = await authFetch('/api/share-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ html, filename: `vistoria-${new Date().toISOString().slice(0, 10)}.html` }),
                  });
                  const data = await res.json();
                  if (data.ok && data.url) {
                    await navigator.clipboard.writeText(data.url);
                    toast('Link copiado para a area de transferencia', 'success');
                    logAudit('export_html', `Link compartilhado (${s.length} aptos)`);
                  } else {
                    toast('Erro ao gerar link: ' + (data.erro || 'desconhecido'), 'error');
                  }
                } catch (err) {
                  toast('Erro ao compartilhar relatório', 'error');
                }
                setCompartilhando(null);
              }}
              compartilhando={compartilhando}
              exportandoZIP={exportandoZIP}
              exportandoFotos={exportandoFotos}
              fotos={allFotos}
              onMarcarDocsOK={async (bloco) => {
                const aptos = lista?.[bloco] || [];
                // Snapshot for undo
                const snapshot = await obterTodasFotos();
                const snapshotDocs = snapshot.filter((f) => f.categoria === 'documento' && normalizeBloco(f.bloco) === normalizeBloco(bloco));
                const count = await marcarTodosDocsOK(bloco, aptos);
                toast(`${count} documentos marcados como OK`, 'success', {
                  onUndo: async () => {
                    // Restore synced=false for affected photos
                    for (const doc of snapshotDocs) {
                      if (doc.id) await desmarcarSincronizada(doc.id);
                    }
                    ultimasFotos(10).then(setFotosRecentes);
                    obterTodasFotos().then(setAllFotos);
                    toast('Ação desfeita', 'info');
                  },
                  undoLabel: 'Desfazer',
                  duration: 8000,
                });
                ultimasFotos(10).then(setFotosRecentes);
                obterTodasFotos().then(setAllFotos);
              }}
              pin={pin || ''}
            />

            {showEstatisticas && (
              <EstatisticasPeriodo fotosOnline={fotosOnline} />
            )}
            {showEstatisticasTorre && (
              <EstatisticasPorTorre status={status} fotosOnline={fotosOnline} lista={lista || {}} />
            )}
          </div>
          </div>
        </main>
        <BottomNav
          active="exportar"
          onNavigate={handleNavigation}
        />
      </>
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
                <p className="text-xs text-content-tertiary mt-0.5">
                  Visao geral por torre e apartamento
                </p>
              </div>
            </motion.div>
            <ProgressHeatmap status={statusMerged} onNavigateToApto={handleNavigateToApto} />
          </div>
        </main>
        <BottomNav
          active="inicio"
          onNavigate={handleNavigation}
        />
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
                <p className="text-xs text-content-tertiary mt-0.5">
                  Progresso de cada torre lado a lado
                </p>
              </div>
            </motion.div>

            <TowerComparison status={status} lista={lista || {}} />
          </div>
        </main>
        <BottomNav
          active="inicio"
          onNavigate={handleNavigation}
        />
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
          onEditar={(ag) => {
            // Use fresh copy from agenda list to avoid stale data
            setAgendamentoEditando({ ...ag });
          }}
        />
        <BottomNav
          active="agenda"
          onNavigate={handleNavigation}
        />
        {showAgendamentoModal && lista && (
          <NovoAgendamentoModal
            blocos={lista}
            statusList={statusMerged}
            onFechar={() => setShowAgendamentoModal(false)}
            onSalvo={() => { setShowAgendamentoModal(false); setAgendaKey((k) => k + 1); toast('Agendamento criado', 'success'); }}
          />
        )}
        {agendamentoEditando && (
          <EditarAgendamentoModal
            agendamento={agendamentoEditando}
            onFechar={() => setAgendamentoEditando(null)}
            onSalvo={() => { setAgendamentoEditando(null); setAgendaKey((k) => k + 1); toast('Agendamento atualizado', 'success'); }}
          />
        )}
      </>
    );
  }

  if (view === 'captura' && blocoAtual && aptoAtual) {
    // Find next pending apto for continuous scan
    const aptoIdx = aptosDoBloco.findIndex((a) => a.apartamento === aptoAtual);
    const proximoApto = aptosDoBloco.slice(aptoIdx + 1).find(
      (a) => !a.cybleAntesFeito || !a.cybleDepoisFeito
    );

    return (
      <>
        <CapturaScreen
          bloco={blocoAtual}
          apartamento={aptoAtual}
          onVoltar={() => { setView('apartamentos'); refreshStatus(); setModoEscaneamento(false); }}
          onFotoSalva={async () => {
            // Refresh status first (needed for confetti detection)
            const freshStatus = await refreshStatus();
            ultimasFotos(10).then(setFotosRecentes);
            // Detect tower completion for bigger confetti
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
            // Start sync after status refresh (non-blocking)
            tentarSincronizar();
          }}
          modoEscaneamento={modoEscaneamento}
          proximoApto={modoEscaneamento && proximoApto ? proximoApto.apartamento : undefined}
          onProximoApto={modoEscaneamento && proximoApto ? () => {
            setAptoAtual(proximoApto.apartamento);
            refreshStatus();
          } : undefined}
          fotosOnline={fotosOnline.filter((f) => normalizeBloco(f.bloco) === normalizeBloco(blocoAtual) && normApto(f.apartamento) === normApto(aptoAtual))}
        />
        <SyncBanner online={online} pendentes={pendentes} onClick={() => setView('syncQueue')} />
      </>
    );
  }

  if (view === 'apartamentos' && blocoAtual) {
    return (
      <main className="min-h-[100dvh] bg-base">
        {/* Context Menu */}
        {ctxMenu.isOpen && (
          <div className="fixed inset-0 z-[70]" onClick={ctxClose}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bg-base-raised border border-base-border rounded-2xl shadow-2xl overflow-hidden min-w-[180px] py-1"
              style={{ left: ctxMenu.position.x, top: ctxMenu.position.y }}
            >
              {ctxMenu.items.map((item, i) => (
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
              onClick={() => setView('blocos')}
              aria-label="Voltar para blocos"
              className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
            >
              <ArrowLeft size={18} weight="bold" aria-hidden="true" />
            </button>
            <div>
              <h1 className={`font-semibold tracking-tight transition-all duration-300 ${headerCollapsed ? 'text-base' : 'text-xl'}`}>{blocoAtual}</h1>
              <p className={`text-content-tertiary mt-0.5 transition-all duration-300 ${headerCollapsed ? 'text-[10px] mt-0 max-h-0 overflow-hidden opacity-0' : 'text-xs mt-0.5 max-h-8 opacity-100'}`}>
                {aptosDoBloco.filter((a) => a.cybleAntesFeito && a.cybleDepoisFeito).length}/{aptosDoBloco.length} concluidos
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
              onChange={(e) => setBusca(e.target.value)}
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
                onClick={() => setOrdem('original')}
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
                onClick={() => setOrdem('pendentes')}
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
                  onClick={() => { haptic('selection'); const next = !modoCompacto; setModoCompactoState(next); setModoCompacto(next); }}
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
                  onClick={() => { haptic('selection'); const next = !altoContraste; setAltoContrasteState(next); setAltoContraste(next); }}
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
                  onClick={() => { haptic('light'); setStatusFilter(key as typeof statusFilter); }}
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
                {busca ? <EmptyStateSearch /> : (
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
                        onAbrir={() => { setAptoAtual(s.apartamento); setView('captura'); }}
                        onAgendar={() => setAgendamentoRapido({ bloco: blocoAtual!, apto: s.apartamento })}
                        onComentario={() => setShowCommentsModal({ bloco: blocoAtual!, apto: s.apartamento })}
                        comentarioCount={comentarioCounts[`${blocoAtual}_${s.apartamento}`] || 0}
                        onDesmarcar={() => setDesmarcarConfirm({ bloco: blocoAtual!, apto: s.apartamento })}
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
                      onClick={() => { setItensPagina(n); setPaginaAtual(1); }}
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
                    onClick={() => { haptic('light'); setPaginaAtual((p) => Math.max(1, p - 1)); }}
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
                            onClick={() => { haptic('light'); setPaginaAtual(p as number); }}
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
                    onClick={() => { haptic('light'); setPaginaAtual((p) => Math.min(totalPaginas, p + 1)); }}
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
        <SyncBanner online={online} pendentes={pendentes} onClick={() => setView('syncQueue')} />
        <AnimatePresence>
          {agendamentoRapido && (
            <QuickScheduleModal
              bloco={agendamentoRapido.bloco}
              apto={agendamentoRapido.apto}
              onFechar={() => setAgendamentoRapido(null)}
              onSalvo={() => { setAgendamentoRapido(null); toast('Agendamento criado', 'success'); setAgendaKey((k) => k + 1); }}
            />
          )}
        </AnimatePresence>
        {showCommentsModal && (
          <CommentsModal
            bloco={showCommentsModal.bloco}
            apartamento={showCommentsModal.apto}
            isOpen={!!showCommentsModal}
            onClose={() => { setShowCommentsModal(null); refreshCommentCounts(showCommentsModal.bloco); }}
            adminMode={userRole === 'admin'}
          />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-base" ref={mainRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <Confetti show={showConfetti} variant={confettiVariant} onComplete={() => setShowConfetti(false)} />
      <SuccessCheck show={showCheck} onComplete={() => setShowCheck(false)} />

      {/* Onboarding Tour */}
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
                onClick={() => { setShowInstallBanner(false); localStorage.setItem('vistoria_install_dismissed', '1'); }}
                className="text-xs font-medium px-3 py-1 rounded-lg bg-base-overlay/20 hover:bg-base-overlay/30 transition-colors"
              >
                Agora não
              </button>
              <button
                onClick={async () => {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
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

      {/* Alerta de espaço quase cheio */}
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
            <h1 className={`tracking-tight transition-all duration-300 ${headerCollapsed ? 'text-lg font-medium' : 'text-2xl font-bold'}`}>Vistoria Cyble</h1>
            <div className="ml-auto flex items-center gap-2">
               <button
                onClick={() => { haptic('selection'); toggleTheme(); }}
                aria-label={theme === 'dark' ? 'Ativar modo claro' : theme === 'light' ? 'Ativar modo automático' : 'Ativar modo escuro'}
                title={theme === 'auto' ? 'Modo automático (dark às 18h, light às 6h)' : undefined}
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
              <span>{rtOnline ? 'Online' : 'Offline'}{rtLastUpdate ? ` · atualizado ${rtLastUpdate}` : ''}</span>
            </div>
          )}
        </motion.div>

        <Dashboard
          status={statusFiltradoPorData}
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
          className="tactile-press w-full flex items-center gap-3 px-4 py-3 bg-base-raised border border-base-border rounded-xl hover:border-accent/30 transition-all"
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
          onSelect={(bloco, apto) => { haptic('light'); setBlocoAtual(bloco); setAptoAtual(apto); setView('captura'); setBuscaGlobal(''); }}
        />

        {!buscaGlobal && (
          <FotosRecentes
            fotos={fotosRecentes}
            onSelect={(bloco, apto) => { setBlocoAtual(bloco); setAptoAtual(apto); setView('captura'); }}
          />
        )}

        {!buscaGlobal && (
          <AtrasadosSection
            aptosEsquecidos={aptosEsquecidos}
            showAtrasados={showAtrasados}
            diasAlerta={diasAlerta}
            onToggle={() => setShowAtrasados(!showAtrasados)}
            onDiasChange={setDiasAlerta}
            onSelect={(bloco, apto) => { setBlocoAtual(bloco); setAptoAtual(apto); setView('captura'); }}
          />
        )}

        <BlocosGrid
          blocos={blocos}
          progressoMap={progressoMap}
          loading={loadingSkeleton}
          onSelect={(b) => { haptic('light'); setSelectedTower(b); }}
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
          onLogout={() => { sessionStorage.removeItem('vistoria_pin'); setPin(null); pinRef.current = null; }}
          onUpdate={() => {
            setUpdateDisponivel(false);
            navigator.serviceWorker?.controller?.postMessage('skipWaiting');
            // Soft refresh: re-fetch data without full page reload
            window.dispatchEvent(new Event('sw-updated'));
          }}
          onEditLista={() => { setListaAnterior(lista); setLista(null); }}
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
            onSalvo={() => { setAgendamentoRapido(null); toast('Agendamento criado', 'success'); }}
          />
        )}
      </AnimatePresence>
      {showCommentsModal && (
        <CommentsModal
          bloco={showCommentsModal.bloco}
          apartamento={showCommentsModal.apto}
          isOpen={!!showCommentsModal}
          onClose={() => { setShowCommentsModal(null); refreshCommentCounts(showCommentsModal.bloco); }}
          adminMode={userRole === 'admin'}
        />
      )}
      {/* Desmarcar como concluido */}
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

function SyncBanner({ online, pendentes, onClick }: { online: boolean; pendentes: number; onClick?: () => void }) {
  if (pendentes === 0) return null;
  return (
    <motion.button
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={spring}
      role="status"
      aria-live="polite"
      onClick={onClick}
      className={`fixed bottom-16 left-2 right-2 border px-4 py-3 text-xs font-semibold flex justify-between items-center z-[60] backdrop-blur-md cursor-pointer hover:opacity-90 transition-opacity rounded-2xl shadow-lg ${
        online
          ? 'bg-accent/95 border-accent text-base'
          : 'bg-danger/95 border-danger text-base'
      }`}
    >
      <span className="flex items-center gap-2">
        {online ? (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-base/40 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-base" />
          </span>
        ) : (
          <CloudSlash size={14} weight="bold" aria-hidden="true" />
        )}
        {online && <ArrowClockwise size={14} weight="bold" className="animate-[spin-slow_2s_linear_infinite]" />}
        {online ? 'Sincronizando...' : 'Sem internet — fotos salvas no aparelho'}
      </span>
      <span className="font-mono tabular-nums bg-base/20 px-2 py-0.5 rounded-lg">{pendentes} foto{pendentes > 1 ? 's' : ''}</span>
    </motion.button>
  );
}

const Dashboard = memo(function Dashboard({ status, pendentes, fotosOnline, datasDisponiveis, dataFiltro, dataInicio, onFiltroDataChange, onFiltroInicioChange }: {
  status: ApartamentoStatus[];
  pendentes: number;
  fotosOnline: FotoOnline[];
  datasDisponiveis: string[];
  dataFiltro: string;
  dataInicio: string;
  onFiltroDataChange: (v: string) => void;
  onFiltroInicioChange: (v: string) => void;
}) {
  const aptosComFotoOnline = useMemo(() => {
    const set = new Set<string>();
    fotosOnline.forEach((f) => set.add(`${f.bloco}__${normApto(f.apartamento)}`));
    return set;
  }, [fotosOnline]);

  const totalAptos = status.length;

  const aptosCompletos = useMemo(() => {
    const set = new Set<string>();
    status.filter((s) => s.cybleAntesFeito && s.cybleDepoisFeito).forEach((s) => {
      set.add(`${s.bloco}__${normApto(s.apartamento)}`);
    });
    aptosComFotoOnline.forEach((key) => set.add(key));
    return set;
  }, [status, aptosComFotoOnline]);

  const aptosAndamento = useMemo(() => {
    const set = new Set<string>();
    status.filter((s) => emAndamento(s)).forEach((s) => {
      const key = `${s.bloco}__${normApto(s.apartamento)}`;
      if (!aptosCompletos.has(key)) set.add(key);
    });
    return set;
  }, [status, aptosCompletos]);

  const completos = aptosCompletos.size;
  const andamento = aptosAndamento.size;
  const totalFotosLocal = status.reduce((acc, s) => acc + s.qtdFotos, 0);
  const totalFotos = Math.max(totalFotosLocal, fotosOnline.length);
  const pct = totalAptos > 0 ? Math.round((completos / totalAptos) * 100) : 0;

  const cards = [
    {
      icon: <CheckCircle size={20} weight="duotone" aria-hidden="true" />,
      value: `${pct}%`,
      label: 'Concluido',
      accent: pct === 100,
      span: 'col-span-2',
      extra: (
        <div className="h-1 bg-base-overlay rounded-full overflow-hidden mt-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ ...spring, delay: 0.5 }}
            className="h-full bg-success rounded-full"
          />
        </div>
      ),
    },
    {
      icon: <Buildings size={20} weight="duotone" aria-hidden="true" />,
      value: `${completos}`,
      sub: `/${totalAptos}`,
      label: 'Aptos feitos',
      accent: false,
      span: 'col-span-1',
    },
    {
      icon: <Camera size={20} weight="duotone" aria-hidden="true" />,
      value: `${totalFotos}`,
      label: 'Fotos tiradas',
      accent: false,
      span: 'col-span-1',
    },
    {
      icon: pendentes > 0 ? <Clock size={20} weight="duotone" aria-hidden="true" /> : <Cloud size={20} weight="duotone" aria-hidden="true" />,
      value: `${pendentes}`,
      label: 'Pendente sync',
      accent: pendentes > 0,
      span: 'col-span-2',
    },
  ];

  return (
    <div className="mb-8">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 mb-4"
      >
        {cards.map((c, i) => (
          <motion.div
            key={i}
            variants={item}
            className={`${c.span} bg-base-raised border border-base-border rounded-2xl p-5 group hover:border-base-border/80 transition-colors`}
          >
            <div className={`mb-3 ${c.accent ? 'text-accent' : 'text-content-tertiary'}`}>
              {c.icon}
            </div>
            <div className="font-mono text-2xl font-bold tracking-tight text-content">
              {c.value}
              {c.sub && <span className="text-base text-content-tertiary font-normal">{c.sub}</span>}
            </div>
            <div className="text-[11px] text-content-tertiary uppercase tracking-widest mt-1">{c.label}</div>
            {c.extra}
          </motion.div>
        ))}
      </motion.div>

      {/* Filtro por período */}
      {datasDisponiveis.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.3 }}
          className="space-y-3"
        >
          {/* Date range inputs */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <Calendar size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => onFiltroInicioChange(e.target.value)}
                aria-label="Data inicial do período"
                className="w-full bg-base-raised border border-base-border rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-content-secondary focus:outline-none focus:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all"
              />
            </div>
            <span className="text-content-tertiary text-xs">até</span>
            <div className="flex-1 relative">
              <Calendar size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
              <input
                type="date"
                value={dataFiltro}
                onChange={(e) => onFiltroDataChange(e.target.value)}
                aria-label="Data final do período"
                className="w-full bg-base-raised border border-base-border rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-content-secondary focus:outline-none focus:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all"
              />
            </div>
            {(dataInicio || dataFiltro) && (
              <button
                onClick={() => {
                  onFiltroInicioChange('');
                  onFiltroDataChange('');
                }}
                aria-label="Limpar filtro de período"
                className="w-9 h-9 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-tertiary hover:text-content transition-colors"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>

          {/* Quick shortcuts */}
          <div className="flex gap-2 flex-wrap">
            {([
              { label: 'Hoje', atalho: 'hoje' as const },
              { label: '7 dias', atalho: 'semana' as const },
              { label: '30 dias', atalho: 'mes' as const },
              { label: '90 dias', atalho: 'trimestre' as const },
            ]).map(({ label, atalho }) => (
              <button
                key={atalho}
                onClick={() => {
                  const periodo = obterPeriodoAtalho(atalho);
                  onFiltroInicioChange(periodo.inicio);
                  onFiltroDataChange(periodo.fim);
                }}
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider bg-base-overlay border border-base-border rounded-lg text-content-tertiary hover:text-content hover:border-accent/30 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
})

function EstatisticasPeriodo({ fotosOnline }: { fotosOnline: FotoOnline[] }) {
  const dados = useMemo(() => {
    const agora = new Date();
    const dias: { data: string; label: string; total: number; porBloco: Record<string, number> }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(agora);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dias.push({ data: key, label, total: 0, porBloco: {} });
    }
    fotosOnline.forEach((f) => {
      const dia = dias.find((d) => d.data === f.data_leitura);
      if (dia) {
        dia.total++;
        dia.porBloco[f.bloco] = (dia.porBloco[f.bloco] || 0) + 1;
      }
    });
    return dias;
  }, [fotosOnline]);

  const maxTotal = Math.max(...dados.map((d) => d.total), 1);
  const totalFotos = dados.reduce((acc, d) => acc + d.total, 0);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-6 bg-base-raised border border-base-border rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">Fotos por dia (14 dias)</span>
        <span className="text-[11px] font-mono text-accent">{totalFotos} total</span>
      </div>
      <div className="flex items-end gap-1 h-24">
        {dados.map((d) => (
          <div key={d.data} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col-reverse" style={{ height: '60px' }}>
              <div
                className="w-full bg-accent/80 rounded-t-sm transition-all duration-300"
                style={{ height: `${(d.total / maxTotal) * 100}%`, minHeight: d.total > 0 ? '2px' : '0' }}
                title={`${d.label}: ${d.total} fotos`}
              />
            </div>
            <span className="text-[8px] text-content-tertiary font-mono -rotate-45 origin-left">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function EstatisticasPorTorre({ status, fotosOnline, lista }: { status: ApartamentoStatus[]; fotosOnline: FotoOnline[]; lista: Record<string, string[]> | null }) {
  const dados = useMemo(() => {
    const porTorre: Record<string, { total: number; feitos: number; fotos: number }> = {};

    // Pre-build status Map for O(1) lookups
    const statusMap = new Map<string, ApartamentoStatus>();
    for (const s of status) {
      statusMap.set(`${normalizeBloco(s.bloco)}__${normApto(s.apartamento)}`, s);
    }

    // Index online photos by bloco (normalized)
    const onlinePorBloco: Record<string, Set<string>> = {};
    fotosOnline.forEach((f) => {
      const key = normalizeBloco(f.bloco);
      if (!onlinePorBloco[key]) onlinePorBloco[key] = new Set();
      onlinePorBloco[key].add(normApto(f.apartamento));
    });

    // Count online photos per apto (normalized)
    const fotosOnlineCount: Record<string, number> = {};
    fotosOnline.forEach((f) => {
      const key = `${normalizeBloco(f.bloco)}__${normApto(f.apartamento)}`;
      fotosOnlineCount[key] = (fotosOnlineCount[key] || 0) + 1;
    });

    // Build merged status per torre using lista + online
    const torres = new Set<string>([...Object.keys(lista || {}), ...fotosOnline.map((f) => normalizeBloco(f.bloco))]);
    for (const torre of torres) {
      const codigosLocais = lista?.[torre] || [];
      const onlineAptos = onlinePorBloco[torre] || new Set();
      const allAptos = new Set<string>([...codigosLocais, ...onlineAptos]);

      porTorre[torre] = { total: 0, feitos: 0, fotos: 0 };
      for (const apto of allAptos) {
        porTorre[torre].total++;
        const local = statusMap.get(`${torre}__${normApto(apto)}`);
        const hasLocal = local && local.cybleAntesFeito && local.cybleDepoisFeito;
        const hasOnline = onlineAptos.has(normApto(apto));
        if (hasLocal || hasOnline) porTorre[torre].feitos++;
        porTorre[torre].fotos += (local?.qtdFotos || 0) + (fotosOnlineCount[`${torre}__${normApto(apto)}`] || 0);
      }
    }

    return Object.entries(porTorre)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([torre, d]) => ({
        torre,
        ...d,
        pct: d.total > 0 ? Math.round((d.feitos / d.total) * 100) : 0,
      }));
  }, [status, fotosOnline, lista]);

  const totalAptos = dados.reduce((a, d) => a + d.total, 0);
  const totalFeitos = dados.reduce((a, d) => a + d.feitos, 0);
  const totalFotos = dados.reduce((a, d) => a + d.fotos, 0);
  const pctGeral = totalAptos > 0 ? Math.round((totalFeitos / totalAptos) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-6 bg-base-raised border border-base-border rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">Progresso por torre</span>
        <span className="text-[11px] font-mono text-accent">{totalFeitos}/{totalAptos} ({pctGeral}%)</span>
      </div>
      <div className="space-y-2">
        {dados.map((d) => (
          <div key={d.torre} className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-content-secondary w-12 flex-shrink-0">{d.torre}</span>
            <div className="flex-1 h-2 bg-base-overlay rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${d.pct}%`,
                  backgroundColor: d.pct === 100 ? 'rgb(52, 211, 153)' : d.pct > 0 ? 'rgb(232, 130, 58)' : 'rgb(239, 68, 68)',
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-content-tertiary w-16 text-right">
              {d.feitos}/{d.total}
            </span>
            <span className="text-[10px] font-mono text-content-tertiary w-10 text-right">
              {d.pct}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
