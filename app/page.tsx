'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import { ExportSection } from '@/components/ExportSection';
import { ProgressHeatmap } from '@/components/ProgressHeatmap';
import { BottomLinks } from '@/components/BottomLinks';
import { haptic } from '@/lib/haptic';
import { spring, stagger, item } from '@/lib/motion';
import PinGate from './PinGate';
import SetupScreen from './SetupScreen';
import CapturaScreen from './CapturaScreen';
import {
  carregarListaApartamentos,
  statusDeTodosApartamentos,
  fotosPendentes,
  marcarSincronizada,
  registrarSync,
  ultimasFotos,
  backupDados,
  restaurarDados,
  checarEspacoStorage,
  criarAgendamento,
  marcarTodosDocsOK,
  obterTodasFotos,
  obterComentarios,
  type ApartamentoStatus,
  type FotoRecord,
} from '@/lib/db';
import { exportarCSV, exportarPDF, exportarXLSX, compartilharPDF, compartilharXLSX, exportarZIP, relatorioPDFComFotos, gerarRelatorioHTML, downloadHTML } from '@/lib/export';
import { useTheme } from '@/lib/theme';
import { Confetti, SuccessCheck } from '@/components/SuccessAnimation';
import {
  fazerBackupManual,
  fazerBackupAutomatico,
  obterUltimoBackup,
  deveFazerBackup,
  formatarTimestampBackup,
} from '@/lib/backup';
import { estaNoIntervalo, obterPeriodoAtalho, formatarDataParaInput, normApto, normalizeBloco } from '@/lib/utils';
import { getDiasAlerta, getItensPagina, getBackupAutomatico, getBackupIntervalo, getModoCompacto, setModoCompacto, getAltoContraste, setAltoContraste } from '@/lib/settings';
import { addNotification, autoDismiss } from '@/lib/notifications';
import { logAudit } from '@/lib/auditLog';
import { APP_VERSION } from '@/lib/version';
import { startAutoBackup, stopAutoBackup } from '@/lib/autoBackup';
import { exportarJSON } from '@/lib/export/json';
import { OnboardingTour, shouldShowTutorial, markTutorialDone } from '@/components/OnboardingTour';
import NotificationCenter from '@/components/NotificationCenter';
import ConfiguracoesClient from '@/app/configuracoes/ConfiguracoesClient';
import TowerReportPanel from '@/components/TowerReportPanel';
import SyncQueueScreen from '@/components/SyncQueueScreen';
import AuditLogScreen from '@/components/AuditLogScreen';
import AgendaScreen from '@/components/AgendaScreen';
import NovoAgendamentoModal from '@/components/NovoAgendamentoModal';
import QuickScheduleModal from '@/components/QuickScheduleModal';
import EditarAgendamentoModal from '@/components/EditarAgendamentoModal';
import { useContextMenu } from '@/components/ContextMenu';
import AptoCard from '@/components/AptoCard';
import TowerComparison from '@/components/TowerComparison';
import CommentsModal from '@/components/CommentsModal';
import { useRealTimeStatus } from '@/hooks/useRealTimeStatus';

type View = 'blocos' | 'apartamentos' | 'captura' | 'configuracoes' | 'syncQueue' | 'auditLog' | 'exportar' | 'heatmap' | 'agenda' | 'comparativo';

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
  const mainRef = useRef<HTMLDivElement>(null);
  const { menu: ctxMenu, openMenu: ctxOpen, closeMenu: ctxClose } = useContextMenu();
  const { status: rtStatus, lastUpdate: rtLastUpdate, online: rtOnline, refresh: rtRefresh } = useRealTimeStatus();
  const [showCommentsModal, setShowCommentsModal] = useState<{ bloco: string; apto: string } | null>(null);
  const [comentarioCounts, setComentarioCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const saved = localStorage.getItem('vistoria_pin');
    const savedRole = localStorage.getItem('vistoria_role') || 'viewer';
    setPin(saved);
    setUserRole(savedRole);
    setPinChecked(true);
    setDiasAlerta(getDiasAlerta());
    setItensPagina(getItensPagina() as 10 | 20 | 50 | 999);
    setModoCompactoState(getModoCompacto());
    setAltoContrasteState(getAltoContraste());
  }, []);

  const lastActivityRef = useRef(Date.now());
  const syncLockRef = useRef(false);

  useEffect(() => {
    if (!pin) return;
    const TIMEOUT_MS = 30 * 60 * 1000;
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    const resetTimer = () => { lastActivityRef.current = Date.now(); };
    events.forEach((e) => window.addEventListener(e, resetTimer));
    const check = setInterval(() => {
      if (Date.now() - lastActivityRef.current > TIMEOUT_MS) {
        localStorage.removeItem('vistoria_pin');
        setPin(null);
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
          window.location.reload();
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update();
      reg.active?.postMessage('checkVersion');
    }).catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('message', handler);
    };
  }, [pin]);

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

  // PWA install prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
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
      if (e && e.pct > 85 && !notified) {
        notified = true;
        addNotification({ tipo: 'storage', titulo: 'Armazenamento quase cheio', mensagem: `${e.pct}% do espaco utilizado. Considere fazer backup e limpar fotos locais.` });
      }
    });
    const interval = setInterval(() => {
      checarEspacoStorage().then((e) => {
        setEspacoStorage(e);
        if (e && e.pct > 85 && !notified) {
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
    const backupAuto = getBackupAutomatico();
    const intervaloMs = getBackupIntervalo() * 60 * 1000;
    const backupInterval = backupAuto ? setInterval(() => {
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
    if (getBackupAutomatico() && pin) {
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

  // Carregar fotos recentes e todas as fotos
  useEffect(() => {
    ultimasFotos(10).then(setFotosRecentes);
    obterTodasFotos().then(setAllFotos);
  }, [status]);

  // Carregar contagem de comentarios por apto
  useEffect(() => {
    if (!blocoAtual || !lista?.[blocoAtual]) return;
    const aptos = lista[blocoAtual];
    Promise.all(aptos.map(async (apto) => {
      const c = await obterComentarios(blocoAtual, apto);
      return [`${blocoAtual}_${apto}`, c.length] as const;
    })).then((entries) => {
      const map: Record<string, number> = {};
      for (const [k, v] of entries) map[k] = v;
      setComentarioCounts(map);
    });
  }, [blocoAtual, lista]);

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
      setPullDistance(diff);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 80) {
      setIsRefreshing(true);
      await refreshStatus();
      ultimasFotos(10).then(setFotosRecentes);
      setIsRefreshing(false);
    }
    setPullDistance(0);
    pullStartY.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pullDistance]);

  // Backup
  async function handleBackup() {
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
  }

  // Restore
  async function handleRestore() {
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
  }

  async function refreshStatus() {
    if (lista) {
      setLoadingSkeleton(true);
      setStatus(await statusDeTodosApartamentos(lista));
      setLoadingSkeleton(false);
    }
    setPendentes((await fotosPendentes()).length);
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
    const on = () => { setOnline(true); tentarSincronizar(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const interval = setInterval(tentarSincronizar, 15000);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function tentarSincronizar() {
    if (!navigator.onLine || !pin) return;
    if (syncLockRef.current) return;
    syncLockRef.current = true;
    try {
    const pendentesLista = await fotosPendentes();
    if (pendentesLista.length === 0) return;

    logAudit('sync_started', `Sincronizando ${pendentesLista.length} foto(s)`);

    // Show progress toast
    const syncId = showSyncProgress(
      pendentesLista.length === 1 ? 'Sincronizando foto...' : 'Sincronizando fotos...',
      pendentesLista.length
    );

    const CONCURRENCY = 3;
    let failed = false;
    let uploadedCount = 0;

    async function uploadOne(foto: FotoRecord) {
      if (failed) return;
      try {
        const form = new FormData();
        form.append('file', foto.blob, `${foto.categoria}.jpg`);
        form.append('bloco', foto.bloco);
        form.append('apartamento', foto.apartamento);
        form.append('categoria', foto.categoria);
        form.append('timestamp', String(foto.timestamp));
        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'x-app-pin': pin! },
          body: form,
        });
        if (resp.ok) {
          const data = await resp.json();
          await marcarSincronizada(foto.id!, data.url);
          await registrarSync({
            timestamp: Date.now(), bloco: foto.bloco, apartamento: foto.apartamento,
            categoria: foto.categoria, url: data.url, ok: true,
          });
          uploadedCount++;
          updateSyncProgress(syncId, uploadedCount);
        } else {
          failed = true;
          await registrarSync({
            timestamp: Date.now(), bloco: foto.bloco, apartamento: foto.apartamento,
            categoria: foto.categoria, url: '', ok: false, erro: `HTTP ${resp.status}`,
          });
        }
      } catch (e: any) {
        failed = true;
        await registrarSync({
          timestamp: Date.now(), bloco: foto.bloco, apartamento: foto.apartamento,
          categoria: foto.categoria, url: '', ok: false, erro: e?.message ?? 'offline',
        });
      }
    }

    for (let i = 0; i < pendentesLista.length; i += CONCURRENCY) {
      if (failed) break;
      const batch = pendentesLista.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(uploadOne));
    }
    if (failed) {
      logAudit('sync_failed', `Falha ao sincronizar ${pendentesLista.length} foto(s)`);
      updateSyncProgress(syncId, uploadedCount, { status: 'error', errorMessage: 'Falha ao enviar. Verifique sua conexao.' });
      const nId = addNotification({ tipo: 'error', titulo: 'Erro na sincronizacao', mensagem: 'Uma ou mais fotos falharam ao enviar. Verifique sua conexao.' });
      autoDismiss(nId, 8000);
    } else if (pendentesLista.length > 0) {
      logAudit('sync_completed', `${pendentesLista.length} foto(s) sincronizada(s)`);
      updateSyncProgress(syncId, pendentesLista.length, { status: 'success' });
      const nId = addNotification({ tipo: 'sync', titulo: 'Sincronizado', mensagem: `${pendentesLista.length} foto(s) enviada(s) com sucesso.` });
      autoDismiss(nId, 5000);
    }
    await refreshStatus();
    } finally {
      syncLockRef.current = false;
    }
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
  }, [fotosOnline, normalizeBloco]);

  const fotosCountMap = useMemo(() => {
    const map = new Map<string, number>();
    fotosOnline.forEach((f) => {
      const key = `${normalizeBloco(f.bloco)}__${normApto(f.apartamento)}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [fotosOnline, normalizeBloco]);

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

  const aptosOnlineDoBloco = useMemo(() => {
    if (!blocoAtual) return new Set<string>();
    const entry = fotosOnlineMap.get(normalizeBloco(blocoAtual));
    return entry?.aptos ?? new Set<string>();
  }, [fotosOnlineMap, blocoAtual, normalizeBloco]);

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
  }, [blocoAtual, lista, statusMap, busca, ordem, statusFilter, aptosOnlineDoBloco, fotosCountMap, normalizeBloco]);

  // Paginacao
  const totalPaginas = itensPagina === 999 ? 1 : Math.ceil(aptosDoBloco.length / itensPagina);
  const aptosPaginados = useMemo(() => {
    if (itensPagina === 999) return aptosDoBloco;
    const start = (paginaAtual - 1) * itensPagina;
    return aptosDoBloco.slice(start, start + itensPagina);
  }, [aptosDoBloco, paginaAtual, itensPagina]);

  useEffect(() => { setPaginaAtual(1); }, [blocoAtual, busca, ordem]);

  // Global search results
  const resultadosBuscaGlobal = useMemo(() => {
    if (!buscaGlobal.trim() || buscaGlobal.length < 2) return [];
    const q = normApto(buscaGlobal.toLowerCase());
    const results: { bloco: string; apto: string; status: ApartamentoStatus | null }[] = [];
    for (const b of blocos) {
      const codigosLocais = (lista?.[b] || []).map(normApto);
      const entry = fotosOnlineMap.get(b);
      const aptosOnline = entry?.aptos ?? new Set<string>();
      const allAptos = new Set<string>([...codigosLocais, ...aptosOnline]);
      for (const c of allAptos) {
        if (normApto(c.toLowerCase()).includes(q)) {
          const normalized = normApto(c);
          const st = statusMap.get(`${b}__${normalized}`) || null;
          results.push({ bloco: b, apto: normalized, status: st });
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
    const cutoff = Date.now() - diasAlerta * 24 * 60 * 60 * 1000;
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
          localStorage.setItem('vistoria_pin', p);
          localStorage.setItem('vistoria_role', role);
          setPin(p);
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
        <ConfiguracoesClient onVoltar={() => setView('blocos')} />
        <BottomNav
          active="config"
          onNavigate={(v) => {
            setActiveNav(v as typeof activeNav);
            haptic('selection');
            if (v === 'camera') setModoEscaneamento(true);
            else if (v === 'config') setView('configuracoes');
            else if (v === 'exportar') setView('exportar');
            else if (v === 'inicio') setView('blocos');
            else if (v === 'agenda') setView('agenda');
          }}
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
          onNavigate={(v) => {
            setActiveNav(v as typeof activeNav);
            haptic('selection');
            if (v === 'camera') setModoEscaneamento(true);
            else if (v === 'config') setView('configuracoes');
            else if (v === 'exportar') setView('exportar');
            else if (v === 'inicio') setView('blocos');
            else if (v === 'agenda') setView('agenda');
          }}
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
          onNavigate={(v) => {
            setActiveNav(v as typeof activeNav);
            haptic('selection');
            if (v === 'camera') setModoEscaneamento(true);
            else if (v === 'config') setView('configuracoes');
            else if (v === 'exportar') setView('exportar');
            else if (v === 'inicio') setView('blocos');
            else if (v === 'agenda') setView('agenda');
          }}
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
              onExportCSV={exportarCSV}
              onExportPDF={(s) => exportarPDF(s, 'Vistoria Cyble')}
              onExportXLSX={(s) => exportarXLSX(s, 'Vistoria Cyble')}
              onCompartilharPDF={async (s) => { setCompartilhando('pdf'); await compartilharPDF(s, 'Vistoria Cyble'); setCompartilhando(null); }}
              onCompartilharXLSX={async (s) => { setCompartilhando('xlsx'); await compartilharXLSX(s, 'Vistoria Cyble'); setCompartilhando(null); }}
              onExportZIP={async (s) => { setExportandoZIP(true); try { await exportarZIP(s, 'Vistoria Cyble', { onProgress: () => {} }); } finally { setExportandoZIP(false); } }}
              onRelatorioPDFComFotos={async (s) => { setExportandoFotos(true); try { await relatorioPDFComFotos(s, 'Vistoria Cyble', { onProgress: () => {} }); } finally { setExportandoFotos(false); } }}
              onExportHTML={(s) => {
                const fotosMap = new Map<string, { fotoUrl: string; categoria: string }[]>();
                for (const f of fotosOnline) {
                  const key = `${f.bloco}_${f.apartamento.replace(/^0+/, '')}`;
                  const arr = fotosMap.get(key) ?? [];
                  arr.push({ fotoUrl: f.foto_url, categoria: f.foto_url.includes('antes') ? 'cyble_antes' : f.foto_url.includes('depois') ? 'cyble_depois' : 'documento' });
                  fotosMap.set(key, arr);
                }
                const html = gerarRelatorioHTML(s, fotosMap, torresExportacao.size > 0 ? torresExportacao : undefined);
                downloadHTML(html, `vistoria-cyble-${new Date().toISOString().slice(0, 10)}.html`);
                logAudit('export_html', `Relatorio HTML gerado (${s.length} aptos)`);
              }}
              onExportJSON={(s) => { exportarJSON(s, 'Vistoria Cyble'); logAudit('export_json', `Export JSON gerado (${s.length} aptos)`); }}
              showPDFOptions={showPDFOptions}
              onTogglePDFOptions={() => setShowPDFOptions(!showPDFOptions)}
              pdfAccentColor={pdfAccentColor}
              onPDFColorChange={setPDFAccentColor}
              onShareReport={async (s) => {
                setCompartilhando('report');
                try {
                  const fotosMap = new Map<string, { fotoUrl: string; categoria: string }[]>();
                  for (const f of fotosOnline) {
                    const key = `${f.bloco}_${f.apartamento.replace(/^0+/, '')}`;
                    const arr = fotosMap.get(key) ?? [];
                    arr.push({ fotoUrl: f.foto_url, categoria: f.foto_url.includes('antes') ? 'cyble_antes' : f.foto_url.includes('depois') ? 'cyble_depois' : 'documento' });
                    fotosMap.set(key, arr);
                  }
                  const html = gerarRelatorioHTML(s, fotosMap, torresExportacao.size > 0 ? torresExportacao : undefined);
                  const res = await fetch('/api/share-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-app-pin': localStorage.getItem('vistoria_pin') || '' },
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
                const count = await marcarTodosDocsOK(bloco, aptos);
                toast(`${count} documentos marcados como OK`, 'success');
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
          onNavigate={(v) => {
            setActiveNav(v as typeof activeNav);
            haptic('selection');
            if (v === 'camera') setModoEscaneamento(true);
            else if (v === 'config') setView('configuracoes');
            else if (v === 'exportar') setView('exportar');
            else if (v === 'inicio') setView('blocos');
            else if (v === 'agenda') setView('agenda');
          }}
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
          onNavigate={(v) => {
            setActiveNav(v as typeof activeNav);
            haptic('selection');
            if (v === 'camera') setModoEscaneamento(true);
            else if (v === 'config') setView('configuracoes');
            else if (v === 'exportar') setView('exportar');
            else if (v === 'inicio') setView('blocos');
            else if (v === 'agenda') setView('agenda');
          }}
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
          onNavigate={(v) => {
            setActiveNav(v as typeof activeNav);
            haptic('selection');
            if (v === 'camera') setModoEscaneamento(true);
            else if (v === 'config') setView('configuracoes');
            else if (v === 'exportar') setView('exportar');
            else if (v === 'inicio') setView('blocos');
            else if (v === 'agenda') setView('agenda');
          }}
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
          onEditar={(ag) => setAgendamentoEditando(ag)}
        />
        <BottomNav
          active="agenda"
          onNavigate={(v) => {
            setActiveNav(v as typeof activeNav);
            haptic('selection');
            if (v === 'camera') setModoEscaneamento(true);
            else if (v === 'config') setView('configuracoes');
            else if (v === 'exportar') setView('exportar');
            else if (v === 'inicio') setView('blocos');
            else if (v === 'agenda') setView('agenda');
          }}
        />
        {showAgendamentoModal && lista && (
          <NovoAgendamentoModal
            blocos={lista}
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
          onFotoSalva={() => {
            refreshStatus();
            tentarSincronizar();
            ultimasFotos(10).then(setFotosRecentes);
            // Detect tower completion for bigger confetti
            const aptosDoBlocoAtual = status.filter((s) => s.bloco === blocoAtual);
            const totalAptosBloco = aptosDoBlocoAtual.length || (lista?.[blocoAtual || '']?.length ?? 0);
            const completosBloco = aptosDoBlocoAtual.filter((s) => s.cybleAntesFeito && s.cybleDepoisFeito).length + 1;
            if (totalAptosBloco > 0 && completosBloco >= totalAptosBloco) {
              setConfettiVariant('tower');
            } else if (completosBloco > 0 && completosBloco % 10 === 0) {
              setConfettiVariant('block');
            } else {
              setConfettiVariant('normal');
            }
            setShowConfetti(true);
            setShowCheck(true);
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOrdem('original')}
                className={`tactile-press px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                  ordem === 'original'
                    ? 'bg-accent-dim border-accent text-accent'
                    : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
                }`}
              >
                <SortAscending size={14} weight="bold" className="inline mr-1.5 -mt-0.5" />
                Numerica
              </button>
              <button
                onClick={() => setOrdem('pendentes')}
                className={`tactile-press px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                  ordem === 'pendentes'
                    ? 'bg-accent-dim border-accent text-accent'
                    : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
                }`}
              >
                <FunnelSimple size={14} weight="bold" className="inline mr-1.5 -mt-0.5" />
                Pendentes primeiro
              </button>
              <div className="flex gap-1 ml-auto shrink-0">
                <button
                  onClick={() => { haptic('selection'); const next = !modoCompacto; setModoCompactoState(next); setModoCompacto(next); }}
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
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'pendente', label: 'Pendente' },
                { key: 'em_andamento', label: 'Andamento' },
                { key: 'concluido', label: 'Concluido' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { haptic('light'); setStatusFilter(key as typeof statusFilter); }}
                  className={`tactile-press px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
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

          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="bg-base-raised border border-base-border rounded-2xl overflow-hidden divide-y divide-base-border"
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
              <div key={`apto-skel-${i}`} className="px-4 py-3 flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1">
                  <div className="skeleton w-16 h-4 rounded-md mb-1.5" />
                  <div className="flex gap-1.5">
                    <div className="skeleton w-2 h-2 rounded-full" />
                    <div className="skeleton w-2 h-2 rounded-full" />
                    <div className="skeleton w-2 h-2 rounded-full" />
                  </div>
                </div>
                <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
              </div>
            ))}
            {aptosPaginados.map((s) => (
              <AptoCard
                key={s.apartamento}
                s={s}
                aptosOnlineDoBloco={aptosOnlineDoBloco}
                modoCompacto={modoCompacto}
                modoEscaneamento={modoEscaneamento}
                blocoAtual={blocoAtual}
                onAbrir={() => { setAptoAtual(s.apartamento); setView('captura'); }}
                onAgendar={() => setAgendamentoRapido({ bloco: blocoAtual!, apto: s.apartamento })}
                onComentario={() => setShowCommentsModal({ bloco: blocoAtual!, apto: s.apartamento })}
                comentarioCount={comentarioCounts[`${blocoAtual}_${s.apartamento}`] || 0}
              />
            ))}
          </motion.div>

          {aptosDoBloco.length > 10 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.2 }}
              className="mt-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {([10, 20, 50, 999] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => { setItensPagina(n); setPaginaAtual(1); }}
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
                <span className="text-[11px] text-content-tertiary font-mono">
                  {paginaAtual}/{totalPaginas}
                </span>
              </div>
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
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
                            onClick={() => setPaginaAtual(p as number)}
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
                    onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual === totalPaginas}
                    className="tactile-press px-3 py-1.5 rounded-xl text-xs font-medium bg-base-raised border border-base-border text-content-secondary hover:text-content disabled:opacity-30 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all"
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
        {espacoStorage && espacoStorage.pct > 85 && (
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
                onClick={() => setModoEscaneamento(!modoEscaneamento)}
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
          onLogout={() => { localStorage.removeItem('vistoria_pin'); setPin(null); }}
          onUpdate={() => { setUpdateDisponivel(false); navigator.serviceWorker?.controller?.postMessage('skipWaiting'); window.location.reload(); }}
          onEditLista={() => { setListaAnterior(lista); setLista(null); }}
          ultimoBackup={ultimoBackup}
        />
      </div>
      <BottomNav
        active={(view === 'blocos' && !blocoAtual) ? 'inicio' : activeNav}
        badges={pendentes > 0 ? { camera: pendentes } : undefined}
        onNavigate={(v) => {
          setActiveNav(v as typeof activeNav);
          haptic('selection');
          if (v === 'camera') {
            setModoEscaneamento(true);
          } else if (v === 'config') {
            setView('configuracoes');
          } else if (v === 'exportar') {
            setView('exportar');
          } else if (v === 'inicio') {
            setView('blocos');
            setBlocoAtual(null);
          } else if (v === 'agenda') {
            setView('agenda');
          }
        }}
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
          onClose={() => setShowCommentsModal(null)}
          adminMode={userRole === 'admin'}
        />
      )}
      <SyncBanner online={online} pendentes={pendentes} onClick={() => setView('syncQueue')} />
    </main>
  );
}

function StatusDot({ done, partial, label }: { done: boolean; partial?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className={`w-2 h-2 rounded-full transition-colors duration-300 ${
          done ? 'bg-success shadow-[0_0_6px_rgba(52,211,153,0.4)]' :
          partial ? 'bg-warn shadow-[0_0_6px_rgba(251,191,36,0.3)]' :
          'bg-base-border'
        }`}
        title={label}
        aria-hidden="true"
      />
    </div>
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

function Dashboard({ status, pendentes, fotosOnline, datasDisponiveis, dataFiltro, dataInicio, onFiltroDataChange, onFiltroInicioChange }: {
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
}

function emAndamento(s: ApartamentoStatus): boolean {
  const temFoto = s.cybleAntesFeito || s.cybleDepoisFeito;
  const completo = s.cybleAntesFeito && s.cybleDepoisFeito;
  return temFoto && !completo;
}

function EstatisticasPeriodo({ fotosOnline }: { fotosOnline: FotoOnline[] }) {
  const dados = useMemo(() => {
    const agora = new Date();
    const dias: { data: string; label: string; total: number; porBloco: Record<string, number> }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(agora);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
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
        const local = status.find((s) => normalizeBloco(s.bloco) === torre && s.apartamento === apto);
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
