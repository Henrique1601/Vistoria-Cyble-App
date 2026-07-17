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
  SignOut,
  MagnifyingGlass,
  ArrowLeft,
  ArrowUpRight,
  SortAscending,
  Cloud,
  CloudSlash,
  PencilSimple,
  FileCsv,
  FilePdf,
  FunnelSimple,
  Images,
  ShareNetwork,
  Calendar,
  X,
  Sun,
  Moon,
  TrendUp,
  Scan,
  ChartBar,
  ArrowDown,
  ArrowClockwise,
  Download,
  Upload,
  Info,
} from '@phosphor-icons/react';
import { useToast } from '@/components/Toast';
import BottomNav from '@/components/BottomNav';
import ProgressRing from '@/components/ProgressRing';
import { EmptyStateBlocks, EmptyStateSearch, EmptyStatePhotos } from '@/components/EmptyState';
import { haptic } from '@/lib/haptic';
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
  type ApartamentoStatus,
  type FotoRecord,
} from '@/lib/db';
import { exportarCSV, exportarPDF, exportarXLSX, compartilharPDF, compartilharXLSX, exportarZIP, relatorioPDFComFotos } from '@/lib/export';
import { useTheme } from '@/lib/theme';
import { Confetti, SuccessCheck } from '@/components/SuccessAnimation';

type View = 'blocos' | 'apartamentos' | 'captura';

interface FotoOnline {
  id: number;
  bloco: string;
  apartamento: string;
  data_leitura: string;
  foto_url: string;
  foto_index: number;
}

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };
const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring },
};

export default function Home() {
  const [pin, setPin] = useState<string | null>(null);
  const [pinChecked, setPinChecked] = useState(false);
  const [lista, setLista] = useState<Record<string, string[]> | null>(null);
  const [status, setStatus] = useState<ApartamentoStatus[]>([]);
  const [view, setView] = useState<View>('blocos');
  const [blocoAtual, setBlocoAtual] = useState<string | null>(null);
  const [aptoAtual, setAptoAtual] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<'original' | 'pendentes'>('original');
  const [pendentes, setPendentes] = useState(0);
  const [online, setOnline] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [fotosOnline, setFotosOnline] = useState<FotoOnline[]>([]);
  const [buscaGlobal, setBuscaGlobal] = useState('');
  const [dataFiltro, setDataFiltro] = useState('');
  const [compartilhando, setCompartilhando] = useState<'pdf' | 'xlsx' | null>(null);
  const [modoEscaneamento, setModoEscaneamento] = useState(false);
  const [fotosRecentes, setFotosRecentes] = useState<FotoRecord[]>([]);
  const [torresExportacao, setTorresExportacao] = useState<Set<string>>(new Set());
  const [showEstatisticas, setShowEstatisticas] = useState(false);
  const [showEstatisticasTorre, setShowEstatisticasTorre] = useState(false);
  const [diasAlerta, setDiasAlerta] = useState(7);
  const [showAtrasados, setShowAtrasados] = useState(false);
  const [itensPagina, setItensPagina] = useState<10 | 20 | 50 | 999>(20);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const { theme, toggle: toggleTheme } = useTheme();
  const { toast } = useToast();
  const [activeNav, setActiveNav] = useState<'inicio' | 'camera' | 'galeria' | 'exportar' | 'config'>('inicio');
  const [loadingSkeleton, setLoadingSkeleton] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportandoZIP, setExportandoZIP] = useState(false);
  const [exportandoFotos, setExportandoFotos] = useState(false);
  const APP_VERSION = '2.4.0';
  const [updateDisponivel, setUpdateDisponivel] = useState(false);
  const [versaoAtual, setVersaoAtual] = useState(APP_VERSION);
  const [versaoNova, setVersaoNova] = useState(APP_VERSION);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [espacoStorage, setEspacoStorage] = useState<{ usado: number; total: number; pct: number } | null>(null);
  const pullStartY = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('vistoria_pin');
    setPin(saved);
    setPinChecked(true);
  }, []);

  useEffect(() => {
    if (!pin) return;
    const TIMEOUT_MS = 30 * 60 * 1000;
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    const resetTimer = () => setLastActivity(Date.now());
    events.forEach((e) => window.addEventListener(e, resetTimer));
    const check = setInterval(() => {
      if (Date.now() - lastActivity > TIMEOUT_MS) {
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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'versionCheck') {
          setVersaoAtual(event.data.currentVersion);
          setVersaoNova(event.data.latestVersion);
          setUpdateDisponivel(event.data.hasUpdate);
        }
      });
      navigator.serviceWorker.ready?.then((reg) => {
        reg.active?.postMessage('checkVersion');
      });
    }
  }, [pin]);

  useEffect(() => {
    if (pin) {
      carregarListaApartamentos().then((l) => setLista(Object.keys(l).length ? l : null));
    }
  }, [pin]);

  useEffect(() => {
    fetch('/api/fotos')
      .then((r) => r.json())
      .then((data) => setFotosOnline(data.fotos || []))
      .catch(() => {});
  }, []);

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
    if (pin && !localStorage.getItem('vistoria_onboarding_done')) {
      setShowOnboarding(true);
    }
  }, [pin]);

  // Checar espaço do IndexedDB
  useEffect(() => {
    if (!pin) return;
    checarEspacoStorage().then(setEspacoStorage);
    const interval = setInterval(() => {
      checarEspacoStorage().then(setEspacoStorage);
    }, 60000);
    return () => clearInterval(interval);
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
  }, [pin]);

  // Carregar fotos recentes
  useEffect(() => {
    ultimasFotos(10).then(setFotosRecentes);
  }, [status]);

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
  }, [pullDistance]);

  // Backup
  async function handleBackup() {
    haptic('medium');
    const blob = await backupDados();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vistoria-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup salvo com sucesso', 'success');
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
  }, [lista]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); tentarSincronizar(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const interval = setInterval(tentarSincronizar, 15000);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      clearInterval(interval);
    };
  }, [pin]);

  async function tentarSincronizar() {
    if (!navigator.onLine || !pin) return;
    const pendentesLista = await fotosPendentes();
    for (const foto of pendentesLista) {
      try {
        const form = new FormData();
        form.append('file', foto.blob, `${foto.categoria}.jpg`);
        form.append('bloco', foto.bloco);
        form.append('apartamento', foto.apartamento);
        form.append('categoria', foto.categoria);
        form.append('timestamp', String(foto.timestamp));
        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'x-app-pin': pin },
          body: form,
        });
        if (resp.ok) {
          const data = await resp.json();
          await marcarSincronizada(foto.id!, data.url);
          await registrarSync({
            timestamp: Date.now(), bloco: foto.bloco, apartamento: foto.apartamento,
            categoria: foto.categoria, url: data.url, ok: true,
          });
        } else {
          await registrarSync({
            timestamp: Date.now(), bloco: foto.bloco, apartamento: foto.apartamento,
            categoria: foto.categoria, url: '', ok: false, erro: `HTTP ${resp.status}`,
          });
          break;
        }
      } catch (e: any) {
        await registrarSync({
          timestamp: Date.now(), bloco: foto.bloco, apartamento: foto.apartamento,
          categoria: foto.categoria, url: '', ok: false, erro: e?.message ?? 'offline',
        });
        break;
      }
    }
    await refreshStatus();
  }

  // Pre-computed maps for O(1) lookups
  const statusMap = useMemo(() => {
    const map = new Map<string, ApartamentoStatus>();
    for (const s of status) {
      map.set(`${s.bloco}__${s.apartamento}`, s);
    }
    return map;
  }, [status]);

  const fotosOnlineMap = useMemo(() => {
    const map = new Map<string, { count: number; aptos: Set<string> }>();
    fotosOnline.forEach((f) => {
      const key = f.bloco;
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
      const key = `${f.bloco}__${normApto(f.apartamento)}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [fotosOnline]);

  const blocos = useMemo(() => {
    const fromLista = lista ? Object.keys(lista) : [];
    const fromOnline = [...fotosOnlineMap.keys()];
    const merged = new Set([...fromLista, ...fromOnline]);
    return [...merged].sort();
  }, [lista, fotosOnlineMap]);

  const aptosOnlineDoBloco = useMemo(() => {
    if (!blocoAtual) return new Set<string>();
    const entry = fotosOnlineMap.get(blocoAtual);
    return entry?.aptos ?? new Set<string>();
  }, [fotosOnlineMap, blocoAtual]);

  const aptosDoBloco = useMemo(() => {
    if (!blocoAtual) return [];

    const codigosLocais = lista?.[blocoAtual] || [];
    const aptosOnlineList = [...aptosOnlineDoBloco];

    const allAptos = new Set<string>([
      ...codigosLocais,
      ...aptosOnlineList,
    ]);

    const result = [...allAptos]
      .map((c) => {
        const local = statusMap.get(`${blocoAtual}__${c}`);
        if (local) return local;
        const cNorm = normApto(c);
        const temFotoOnline = aptosOnlineDoBloco.has(cNorm);
        return {
          bloco: blocoAtual, apartamento: c,
          cybleAntesFeito: temFotoOnline, cybleDepoisFeito: temFotoOnline,
          qtdDocumentos: 0, qtdFotos: fotosCountMap.get(`${blocoAtual}__${cNorm}`) || 0,
        };
      })
      .filter((s) => s.apartamento.toLowerCase().includes(busca.toLowerCase()));

    if (ordem === 'pendentes') {
      result.sort((a, b) => {
        const aC = a.cybleAntesFeito && a.cybleDepoisFeito;
        const bC = b.cybleAntesFeito && b.cybleDepoisFeito;
        if (aC === bC) return 0;
        return aC ? 1 : -1;
      });
    } else {
      result.sort((a, b) => a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true }));
    }

    return result;
  }, [blocoAtual, lista, statusMap, busca, ordem, aptosOnlineDoBloco, fotosCountMap]);

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
    const q = buscaGlobal.toLowerCase();
    const results: { bloco: string; apto: string; status: ApartamentoStatus | null }[] = [];
    for (const b of blocos) {
      const codigosLocais = lista?.[b] || [];
      const entry = fotosOnlineMap.get(b);
      const aptosOnline = entry?.aptos ?? new Set<string>();
      const allAptos = new Set<string>([...codigosLocais, ...aptosOnline]);
      for (const c of allAptos) {
        if (c.toLowerCase().includes(q)) {
          const st = statusMap.get(`${b}__${c}`) || null;
          results.push({ bloco: b, apto: c, status: st });
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
    if (!dataFiltro) return status;
    const aptosComFotoNaData = new Set<string>();
    fotosOnline.forEach((f) => {
      if (f.data_leitura === dataFiltro) aptosComFotoNaData.add(`${f.bloco}__${normApto(f.apartamento)}`);
    });
    return status.filter((s) => aptosComFotoNaData.has(`${s.bloco}__${s.apartamento}`));
  }, [status, dataFiltro, fotosOnline]);

  const progressoMap = useMemo(() => {
    const map = new Map<string, { texto: string; pct: number }>();
    for (const b of blocos) {
      const codigosLocais = lista?.[b] || [];
      const entry = fotosOnlineMap.get(b);
      const aptosOnline = entry?.aptos ?? new Set<string>();
      const allAptos = new Set<string>([...codigosLocais, ...aptosOnline]);
      const total = allAptos.size;
      const completos = [...allAptos].filter((c) => {
        const st = statusMap.get(`${b}__${c}`);
        const feitoLocal = st && st.cybleAntesFeito && st.cybleDepoisFeito;
        const feitoOnline = aptosOnline.has(normApto(c));
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
        // Local photos don't have a clean date, so include them as "has photo"
        aptosComFotoRecente.add(`${s.bloco}__${s.apartamento}`);
      }
    });
    const result: { bloco: string; apartamento: string }[] = [];
    for (const b of blocos) {
      const codigosLocais = lista?.[b] || [];
      const entry = fotosOnlineMap.get(b);
      const aptosOnline = entry?.aptos ?? new Set<string>();
      const allAptos = new Set<string>([...codigosLocais, ...aptosOnline]);
      for (const c of allAptos) {
        if (!aptosComFotoRecente.has(`${b}__${c}`) && !aptosComFotoRecente.has(`${b}__${normApto(c)}`)) {
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
      const key = `${s.bloco}__${s.apartamento}`;
      merged.set(key, { ...s });
    }

    // 2. Adicionar aptos que existem apenas online (nao na lista local)
    for (const b of blocos) {
      const codigosLocais = new Set(lista?.[b] || []);
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
  }, [status, blocos, lista, fotosOnlineMap, fotosCountMap]);

  // Status filtrado para exportação (por torre selecionada)
  const statusExportacao = useMemo(() => {
    if (torresExportacao.size === 0) return statusMerged;
    return statusMerged.filter((s) => torresExportacao.has(s.bloco));
  }, [statusMerged, torresExportacao]);

  if (!pinChecked) return null;

  if (!pin) {
    return (
      <PinGate
        onOk={(p) => {
          localStorage.setItem('vistoria_pin', p);
          setPin(p);
        }}
      />
    );
  }

  if (!lista) {
    return <SetupScreen onDone={(l) => setLista(l)} />;
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
          onFotoSalva={() => { refreshStatus(); tentarSincronizar(); ultimasFotos(10).then(setFotosRecentes); setShowConfetti(true); setShowCheck(true); }}
          modoEscaneamento={modoEscaneamento}
          proximoApto={modoEscaneamento && proximoApto ? proximoApto.apartamento : undefined}
          onProximoApto={modoEscaneamento && proximoApto ? () => {
            setAptoAtual(proximoApto.apartamento);
            refreshStatus();
          } : undefined}
          fotosOnline={fotosOnline.filter((f) => f.bloco === blocoAtual && normApto(f.apartamento) === normApto(aptoAtual))}
        />
        <SyncBanner online={online} pendentes={pendentes} />
      </>
    );
  }

  if (view === 'apartamentos' && blocoAtual) {
    return (
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
              aria-label="Voltar para blocos"
              className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
            >
              <ArrowLeft size={18} weight="bold" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{blocoAtual}</h1>
              <p className="text-xs text-content-tertiary mt-0.5">
                {aptosDoBloco.length} apartamento{aptosDoBloco.length !== 1 ? 's' : ''}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            className="relative mb-4"
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
            className="flex gap-2 mb-4"
          >
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
          </motion.div>

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
            {aptosPaginados.map((s) => (
              <motion.div
                key={s.apartamento}
                variants={item}
                role="button"
                tabIndex={0}
                onClick={() => { haptic('light'); setAptoAtual(s.apartamento); setView('captura'); setModoEscaneamento(modoEscaneamento); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic('light'); setAptoAtual(s.apartamento); setView('captura'); setModoEscaneamento(modoEscaneamento); } }}
                className="tactile-press flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-base-overlay/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium">{s.apartamento}</span>
                  {s.qtdFotos > 0 && (
                    <span className="text-[11px] font-mono text-content-tertiary bg-base-overlay px-2 py-0.5 rounded-md">
                      {s.qtdFotos} foto{s.qtdFotos > 1 ? 's' : ''}
                    </span>
                  )}
                  {aptosOnlineDoBloco.has(normApto(s.apartamento)) && s.qtdFotos === 0 && (
                    <span className="text-[11px] font-mono text-success bg-success/10 px-2 py-0.5 rounded-md">
                      online
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusDot done={s.cybleAntesFeito} partial={emAndamento(s)} label="Antes" />
                  <StatusDot done={s.cybleDepoisFeito} partial={emAndamento(s)} label="Depois" />
                  <StatusDot done={s.qtdDocumentos > 0} label="Doc" />
                </div>
              </motion.div>
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
        <SyncBanner online={online} pendentes={pendentes} />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-base" ref={mainRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />
      <SuccessCheck show={showCheck} onComplete={() => setShowCheck(false)} />

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

      {/* Onboarding Tour */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-base/90 backdrop-blur-sm z-[70] flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-base-raised border border-base-border rounded-2xl p-6 max-w-sm w-full"
            >
              {[
                { title: 'Bem-vindo ao Vistoria Cyble!', desc: 'Este app ajuda a registrar fotos das vistorias de troca de Cyble. Vamos te mostrar como funciona.' },
                { title: 'Tirar fotos', desc: 'Toque em um apartamento e escolha a categoria (Antes, Depois ou Documento). As fotos são salvas no aparelho automaticamente.' },
                { title: 'Modo escaneamento', desc: 'Ative o modo escaneamento no header para ir direto à câmera sem navegar pelos menus.' },
                { title: 'Sincronização', desc: 'As fotos são enviadas automaticamente quando o aparelho fica online. Você pode trabalhar 100% offline.' },
                { title: 'Exportar relatórios', desc: 'Use os botões de exportar para gerar PDF, XLSX, CSV ou ZIP com todas as fotos.' },
              ][onboardingStep] && (
                <>
                  <h2 className="text-lg font-bold text-content mb-2">
                    {[, 'Tirar fotos', 'Modo escaneamento', 'Sincronização', 'Exportar relatórios'][onboardingStep]}
                  </h2>
                  <p className="text-sm text-content-secondary leading-relaxed mb-6">
                    {[
                      'Bem-vindo ao Vistoria Cyble! Este app ajuda a registrar fotos das vistorias de troca de Cyble.',
                      'Toque em um apartamento e escolha a categoria (Antes, Depois ou Documento). As fotos são salvas no aparelho automaticamente.',
                      'Ative o modo escaneamento no header para ir direto à câmera sem navegar pelos menus.',
                      'As fotos são enviadas automaticamente quando o aparelho fica online. Você pode trabalhar 100% offline.',
                      'Use os botões de exportar para gerar PDF, XLSX, CSV ou ZIP com todas as fotos.',
                    ][onboardingStep]}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === onboardingStep ? 'bg-accent' : 'bg-base-overlay'}`} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {onboardingStep > 0 && (
                        <button
                          onClick={() => setOnboardingStep(onboardingStep - 1)}
                          className="text-xs font-medium px-4 py-2 rounded-xl bg-base-overlay text-content-secondary hover:text-content transition-colors"
                        >
                          Voltar
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (onboardingStep < 4) {
                            setOnboardingStep(onboardingStep + 1);
                          } else {
                            setShowOnboarding(false);
                            localStorage.setItem('vistoria_onboarding_done', '1');
                          }
                        }}
                        className="text-xs font-semibold px-4 py-2 rounded-xl bg-accent text-base hover:bg-accent-hover transition-colors"
                      >
                        {onboardingStep < 4 ? 'Próximo' : 'Começar'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
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
            <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_0_4px_rgba(232,130,58,0.2)]" />
            <h1 className="text-2xl font-bold tracking-tight">Vistoria Cyble</h1>
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
            </div>
          </div>
          <p className="text-sm text-content-tertiary ml-5">
            {modoEscaneamento ? 'Modo escaneamento: toque no apto e tire a foto direto' : 'Selecione o bloco para comecar.'}
          </p>
        </motion.div>

        <Dashboard status={statusFiltradoPorData} pendentes={pendentes} fotosOnline={fotosOnline} datasDisponiveis={datasDisponiveis} dataFiltro={dataFiltro} onFiltroDataChange={setDataFiltro} />

        {/* Busca Global */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="relative mb-4"
        >
          <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
          <input
            type="text"
            placeholder="Buscar apto em todos os blocos\u2026"
            value={buscaGlobal}
            onChange={(e) => setBuscaGlobal(e.target.value)}
            aria-label="Buscar apartamento em todos os blocos"
            className="w-full bg-base-raised border border-base-border rounded-xl pl-10 pr-10 py-3 text-sm text-content placeholder:text-content-tertiary focus:outline-none focus:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all"
          />
          {buscaGlobal && (
            <button
              onClick={() => setBuscaGlobal('')}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </motion.div>

        {/* Resultados da busca global */}
        <AnimatePresence mode="wait">
          {resultadosBuscaGlobal.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 bg-base-raised border border-accent/20 rounded-2xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-base-border">
                <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                  {resultadosBuscaGlobal.length} resultado{resultadosBuscaGlobal.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="divide-y divide-base-border max-h-64 overflow-y-auto">
                {resultadosBuscaGlobal.map((r) => {
                   const completo = r.status && r.status.cybleAntesFeito && r.status.cybleDepoisFeito;
                  const temFoto = r.status && (r.status.cybleAntesFeito || r.status.cybleDepoisFeito);
                  return (
                    <button
                      key={`${r.bloco}__${r.apto}`}
                      onClick={() => { haptic('light'); setBlocoAtual(r.bloco); setAptoAtual(r.apto); setView('captura'); setBuscaGlobal(''); }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-base-overlay/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-accent">{r.bloco}</span>
                        <span className="font-mono text-sm font-medium">{r.apto}</span>
                        {r.status && r.status.qtdFotos > 0 && (
                          <span className="text-[11px] font-mono text-content-tertiary bg-base-overlay px-2 py-0.5 rounded-md">
                            {r.status.qtdFotos} foto{r.status.qtdFotos > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusDot done={r.status?.cybleAntesFeito || false} partial={r.status ? emAndamento(r.status) : false} label="Antes" />
                        <StatusDot done={r.status?.cybleDepoisFeito || false} partial={r.status ? emAndamento(r.status) : false} label="Depois" />
                        <StatusDot done={r.status?.qtdDocumentos ? r.status.qtdDocumentos > 0 : false} label="Doc" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fotos recentes */}
        {!buscaGlobal && fotosRecentes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.15 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">Fotos recentes</span>
              <a href="/galeria" className="text-[11px] text-accent hover:text-accent-hover transition-colors">Ver todas</a>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {fotosRecentes.map((f) => {
                const src = f.synced && f.uploadUrl ? f.uploadUrl : (f.blob.size > 0 ? URL.createObjectURL(f.blob) : '');
                return (
                  <button
                    key={f.id}
                    onClick={() => { setBlocoAtual(f.bloco); setAptoAtual(f.apartamento); setView('captura'); }}
                    className="tactile-press flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-base-border hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors relative group"
                    aria-label={`Ver ${f.bloco} ${f.apartamento}`}
                  >
                    {src ? (
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-base-overlay flex items-center justify-center">
                        <Camera size={16} className="text-content-tertiary" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-base/80 text-[8px] text-content-tertiary text-center py-0.5 font-mono">
                      {f.apartamento}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Dashboard de atrasados */}
        {!buscaGlobal && aptosEsquecidos.length > 0 && (() => {
          const porBloco = aptosEsquecidos.reduce((acc, a) => {
            if (!acc[a.bloco]) acc[a.bloco] = [];
            acc[a.bloco].push(a);
            return acc;
          }, {} as Record<string, typeof aptosEsquecidos>);
          const blocosOrdenados = Object.keys(porBloco).sort();
          return (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.2 }}
              className="mb-6 bg-danger/5 border border-danger/20 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setShowAtrasados(!showAtrasados)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                aria-expanded={showAtrasados}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Warning size={14} weight="bold" className="text-danger flex-shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-danger">
                      {aptosEsquecidos.length} atrasado{aptosEsquecidos.length !== 1 ? 's' : ''}
                    </span>
                    {!showAtrasados && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {blocosOrdenados.map((b) => (
                          <span key={b} className="text-[10px] font-mono text-danger/70 bg-danger/10 px-1.5 py-0.5 rounded">
                            {b}: {porBloco[b].length}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!showAtrasados && (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setDiasAlerta(Math.max(1, diasAlerta - 1))}
                        className="tactile-press w-6 h-6 rounded-lg bg-danger/10 text-danger text-xs font-bold hover:bg-danger/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                        aria-label="Diminuir dias"
                      >
                        -
                      </button>
                      <span className="text-[11px] font-mono text-danger w-8 text-center">{diasAlerta}d</span>
                      <button
                        onClick={() => setDiasAlerta(diasAlerta + 1)}
                        className="tactile-press w-6 h-6 rounded-lg bg-danger/10 text-danger text-xs font-bold hover:bg-danger/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                        aria-label="Aumentar dias"
                      >
                        +
                      </button>
                    </div>
                  )}
                  <motion.span
                    animate={{ rotate: showAtrasados ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-danger"
                  >
                    <ArrowDown size={14} weight="bold" />
                  </motion.span>
                </div>
              </button>

              <AnimatePresence>
                {showAtrasados && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      <div className="flex items-center justify-end gap-1.5 mb-2">
                        <button
                          onClick={() => setDiasAlerta(Math.max(1, diasAlerta - 1))}
                          className="tactile-press w-6 h-6 rounded-lg bg-danger/10 text-danger text-xs font-bold hover:bg-danger/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                          aria-label="Diminuir dias"
                        >
                          -
                        </button>
                        <span className="text-[11px] font-mono text-danger w-8 text-center">{diasAlerta}d</span>
                        <button
                          onClick={() => setDiasAlerta(diasAlerta + 1)}
                          className="tactile-press w-6 h-6 rounded-lg bg-danger/10 text-danger text-xs font-bold hover:bg-danger/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                          aria-label="Aumentar dias"
                        >
                          +
                        </button>
                      </div>
                      <div className="space-y-2">
                        {blocosOrdenados.map((bloco) => (
                          <div key={bloco} className="bg-danger/5 rounded-xl p-2.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-semibold text-danger">{bloco}</span>
                              <span className="text-[10px] font-mono text-danger/70">{porBloco[bloco].length} apto{porBloco[bloco].length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {porBloco[bloco].map((a) => (
                                <button
                                  key={`${a.bloco}__${a.apartamento}`}
                                  onClick={() => { setBlocoAtual(a.bloco); setAptoAtual(a.apartamento); setView('captura'); }}
                                  className="tactile-press text-[10px] font-mono bg-danger/10 text-danger px-1.5 py-0.5 rounded hover:bg-danger/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                                >
                                  {a.apartamento}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })()}

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-3 mb-6"
        >
          {loadingSkeleton && blocos.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={`skel-${i}`} className="bg-base-raised border border-base-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="skeleton w-9 h-9 rounded-xl" />
                      <div>
                        <div className="skeleton w-20 h-4 rounded-md mb-1.5" />
                        <div className="skeleton w-28 h-3 rounded-md" />
                      </div>
                    </div>
                    <div className="skeleton w-10 h-10 rounded-full" />
                  </div>
                  <div className="skeleton w-full h-1 rounded-full" />
                </div>
              ))
            : blocos.length === 0
              ? <EmptyStateBlocks />
              : blocos.map((b) => {
              const prog = progressoMap.get(b) || { texto: '0/0', pct: 0 };
              return (
                <motion.div
                  key={b}
                  variants={item}
                  role="button"
                  tabIndex={0}
                  onClick={() => { haptic('light'); setBlocoAtual(b); setView('apartamentos'); setBusca(''); refreshStatus(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic('light'); setBlocoAtual(b); setView('apartamentos'); setBusca(''); refreshStatus(); } }}
                  className="tactile-press group bg-base-raised border border-base-border rounded-2xl p-5 cursor-pointer hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none hover:shadow-diffusion transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-base-overlay border border-base-border-subtle flex items-center justify-center group-hover:border-accent/30 transition-colors">
                      <Buildings size={18} weight="duotone" className="text-content-secondary group-hover:text-accent transition-colors" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{b}</div>
                      <div className="text-[11px] text-content-tertiary font-mono">{prog.texto} concluidos</div>
                    </div>
                  </div>
                  <ProgressRing percentage={prog.pct} size={40} strokeWidth={3} />
                </div>
                <div className="h-1 bg-base-overlay rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${prog.pct}%` }}
                    transition={{ ...spring, delay: 0.3 }}
                    className="h-full bg-success rounded-full"
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.4 }}
          className="mb-4"
        >
          {/* Filtro de torre para exportação */}
          <div className="mb-3">
            <div className="flex gap-3">
              <button
                onClick={() => setShowEstatisticas(!showEstatisticas)}
                className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
              >
                <ChartBar size={13} weight="bold" aria-hidden="true" />
                {showEstatisticas ? 'Ocultar periodo' : 'Periodo'}
              </button>
              <button
                onClick={() => setShowEstatisticasTorre(!showEstatisticasTorre)}
                className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
              >
                <Buildings size={13} weight="bold" aria-hidden="true" />
                {showEstatisticasTorre ? 'Ocultar torres' : 'Por torre'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setTorresExportacao(new Set())}
                className={`tactile-press px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                  torresExportacao.size === 0
                    ? 'bg-accent-dim border-accent text-accent'
                    : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
                }`}
              >
                Todas
              </button>
              {blocos.map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setTorresExportacao((prev) => {
                      const next = new Set(prev);
                      if (next.has(b)) next.delete(b); else next.add(b);
                      return next;
                    });
                  }}
                  className={`tactile-press px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                    torresExportacao.has(b)
                      ? 'bg-accent-dim border-accent text-accent'
                      : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mb-3">
            <button
              onClick={() => exportarCSV(statusExportacao)}
              disabled={statusExportacao.length === 0}
              aria-label="Exportar dados em CSV"
              className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <FileCsv size={16} weight="bold" aria-hidden="true" />
              CSV
            </button>
            <button
              onClick={() => exportarPDF(statusExportacao, 'Vistoria Cyble')}
              disabled={statusExportacao.length === 0}
              aria-label="Baixar relatorio em PDF"
              className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <FilePdf size={16} weight="bold" aria-hidden="true" />
              PDF
            </button>
            <button
              onClick={() => exportarXLSX(statusExportacao, 'Vistoria Cyble')}
              disabled={statusExportacao.length === 0}
              aria-label="Baixar planilha Excel XLSX"
              className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <FileCsv size={16} weight="bold" aria-hidden="true" />
              XLSX
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={async () => { setCompartilhando('pdf'); await compartilharPDF(statusExportacao, 'Vistoria Cyble'); setCompartilhando(null); }}
              disabled={statusExportacao.length === 0 || compartilhando !== null}
              aria-label="Compartilhar relatorio PDF"
              className="tactile-press flex-1 flex items-center justify-center gap-2 bg-accent-dim border border-accent/30 rounded-xl px-4 py-3 text-sm font-medium text-accent hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <ShareNetwork size={16} weight="bold" aria-hidden="true" />
              {compartilhando === 'pdf' ? 'Compartilhando\u2026' : 'Compartilhar PDF'}
            </button>
            <button
              onClick={async () => { setCompartilhando('xlsx'); await compartilharXLSX(statusExportacao, 'Vistoria Cyble'); setCompartilhando(null); }}
              disabled={statusExportacao.length === 0 || compartilhando !== null}
              aria-label="Compartilhar planilha XLSX"
              className="tactile-press flex-1 flex items-center justify-center gap-2 bg-accent-dim border border-accent/30 rounded-xl px-4 py-3 text-sm font-medium text-accent hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <ShareNetwork size={16} weight="bold" aria-hidden="true" />
              {compartilhando === 'xlsx' ? 'Compartilhando\u2026' : 'Compartilhar XLSX'}
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                setExportandoZIP(true);
                try {
                  await exportarZIP(statusExportacao, 'Vistoria Cyble', { onProgress: () => {} });
                } finally { setExportandoZIP(false); }
              }}
              disabled={statusExportacao.length === 0 || exportandoZIP}
              aria-label="Baixar fotos como ZIP"
              className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <Download size={16} weight="bold" aria-hidden="true" />
              {exportandoZIP ? 'Compactando\u2026' : 'Fotos ZIP'}
            </button>
            <button
              onClick={async () => {
                setExportandoFotos(true);
                try {
                  await relatorioPDFComFotos(statusExportacao, 'Vistoria Cyble', { onProgress: () => {} });
                } finally { setExportandoFotos(false); }
              }}
              disabled={statusExportacao.length === 0 || exportandoFotos}
              aria-label="Baixar relatorio com fotos em PDF"
              className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <FilePdf size={16} weight="bold" aria-hidden="true" />
              {exportandoFotos ? 'Gerando\u2026' : 'PDF + Fotos'}
            </button>
          </div>
        </motion.div>
        {showEstatisticas && (
          <EstatisticasPeriodo fotosOnline={fotosOnline} />
        )}
        {showEstatisticasTorre && (
          <EstatisticasPorTorre status={status} fotosOnline={fotosOnline} lista={lista || {}} />
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap gap-4 mb-4"
        >
          <a
            href="/galeria"
            aria-label="Abrir galeria de fotos"
            className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <Images size={13} weight="bold" aria-hidden="true" />
            Galeria
          </a>
          <button
            onClick={() => setLista(null)}
            aria-label="Editar lista de apartamentos"
            className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <PencilSimple size={13} weight="bold" aria-hidden="true" />
            Editar lista
          </button>
          <button
            onClick={handleBackup}
            aria-label="Fazer backup dos dados"
            className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <Download size={13} weight="bold" aria-hidden="true" />
            Backup
          </button>
          <button
            onClick={handleRestore}
            aria-label="Restaurar dados de backup"
            className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <Upload size={13} weight="bold" aria-hidden="true" />
            Restaurar
          </button>
          <button
            onClick={() => { localStorage.removeItem('vistoria_pin'); setPin(null); }}
            aria-label="Sair da aplicacao"
            className="tactile-press flex items-center gap-1.5 text-xs text-danger hover:text-danger/80 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <SignOut size={13} weight="bold" aria-hidden="true" />
            Sair
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-2 text-[10px] text-content-tertiary/50"
        >
          <Info size={10} weight="bold" aria-hidden="true" />
          <span>Vistoria Cyble v{APP_VERSION}</span>
          {!online && <span className="text-danger font-semibold">• offline</span>}
          {espacoStorage && (
            <span className={espacoStorage.pct > 85 ? 'text-warning font-semibold' : ''}>
              • {espacoStorage.pct}% storage
            </span>
          )}
          {updateDisponivel && (
            <button
              onClick={() => {
                setUpdateDisponivel(false);
                navigator.serviceWorker?.controller?.postMessage('skipWaiting');
                window.location.reload();
              }}
              className="text-accent font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              • nova versão disponível (v{versaoNova})
            </button>
          )}
        </motion.div>
      </div>
      <BottomNav
        active={(view === 'blocos' && !blocoAtual) ? 'inicio' : activeNav}
        onNavigate={(v) => {
          setActiveNav(v as typeof activeNav);
          haptic('selection');
          if (v === 'camera') {
            setModoEscaneamento(true);
          }
        }}
      />
      <SyncBanner online={online} pendentes={pendentes} />
    </main>
  );
}

function StatusDot({ done, partial, label }: { done: boolean; partial?: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
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

function SyncBanner({ online, pendentes }: { online: boolean; pendentes: number }) {
  if (pendentes === 0) return null;
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={spring}
      role="status"
      aria-live="polite"
      className={`fixed bottom-0 left-0 right-0 border-t px-4 py-3 text-xs font-medium flex justify-between items-center z-50 backdrop-blur-md ${
        online
          ? 'bg-base-raised/90 border-accent/20 text-accent'
          : 'bg-base-raised/90 border-danger/20 text-danger'
      }`}
    >
      <span className="flex items-center gap-2">
        {online ? <Cloud size={14} weight="bold" aria-hidden="true" /> : <CloudSlash size={14} weight="bold" aria-hidden="true" />}
        {online ? 'Sincronizando\u2026' : 'Sem internet \u2014 fotos salvas no aparelho'}
      </span>
      <span className="font-mono tabular-nums">{pendentes} pendente(s)</span>
    </motion.div>
  );
}

function normApto(s: string) { return s.replace(/^0+/, '') || '0'; }

function Dashboard({ status, pendentes, fotosOnline, datasDisponiveis, dataFiltro, onFiltroDataChange }: {
  status: ApartamentoStatus[];
  pendentes: number;
  fotosOnline: FotoOnline[];
  datasDisponiveis: string[];
  dataFiltro: string;
  onFiltroDataChange: (v: string) => void;
}) {
  const aptosComFotoOnline = useMemo(() => {
    const set = new Set<string>();
    fotosOnline.forEach((f) => set.add(`${f.bloco}__${normApto(f.apartamento)}`));
    return set;
  }, [fotosOnline]);

  const totalAptos = status.length;
  const completosLocal = status.filter((s) => s.cybleAntesFeito && s.cybleDepoisFeito).length;
  const completosOnline = aptosComFotoOnline.size;
  const completos = Math.max(completosLocal, completosOnline);
  const andamento = status.filter((s) => emAndamento(s)).length;
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

      {/* Filtro por data */}
      {datasDisponiveis.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.3 }}
          className="relative"
        >
          <Calendar size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
          <select
            value={dataFiltro}
            onChange={(e) => onFiltroDataChange(e.target.value)}
            aria-label="Filtrar por data de leitura"
            className="w-full bg-base-raised border border-base-border rounded-xl pl-9 pr-10 py-2.5 text-xs font-medium text-content-secondary appearance-none focus:outline-none focus:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all"
          >
            <option value="">Todas as datas</option>
            {datasDisponiveis.map((d) => (
              <option key={d} value={d}>{new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')}</option>
            ))}
          </select>
          {dataFiltro && (
            <button
              onClick={() => onFiltroDataChange('')}
              aria-label="Limpar filtro de data"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content"
            >
              <X size={12} weight="bold" />
            </button>
          )}
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

    // Index online photos by bloco
    const onlinePorBloco: Record<string, Set<string>> = {};
    fotosOnline.forEach((f) => {
      if (!onlinePorBloco[f.bloco]) onlinePorBloco[f.bloco] = new Set();
      onlinePorBloco[f.bloco].add(normApto(f.apartamento));
    });

    // Count online photos per apto
    const fotosOnlineCount: Record<string, number> = {};
    fotosOnline.forEach((f) => {
      const key = `${f.bloco}__${normApto(f.apartamento)}`;
      fotosOnlineCount[key] = (fotosOnlineCount[key] || 0) + 1;
    });

    // Build merged status per torre using lista + online
    const torres = new Set<string>([...Object.keys(lista || {}), ...fotosOnline.map((f) => f.bloco)]);
    for (const torre of torres) {
      const codigosLocais = lista?.[torre] || [];
      const onlineAptos = onlinePorBloco[torre] || new Set();
      const allAptos = new Set<string>([...codigosLocais, ...onlineAptos]);

      porTorre[torre] = { total: 0, feitos: 0, fotos: 0 };
      for (const apto of allAptos) {
        porTorre[torre].total++;
        const local = status.find((s) => s.bloco === torre && s.apartamento === apto);
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
