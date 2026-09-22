'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/Toast';
import { useSyncProgress } from '@/components/ProgressToast';
import BottomNav from '@/components/BottomNav';
import ConfirmDialog from '@/components/ConfirmDialog';
import { haptic } from '@/lib/haptic';
import { authFetch } from '@/lib/api';
import { spring } from '@/lib/motion';
import PinGate from './PinGate';
import SetupScreen from './SetupScreen';
import CapturaScreen from './CapturaScreen';
import { restaurarDados } from '@/lib/db';
import { useTheme } from '@/lib/theme';
import { fazerBackupManual, formatarTimestampBackup, obterUltimoBackup } from '@/lib/backup';
import { normApto, normalizeBloco } from '@/lib/utils';
import { setModoCompacto, setAltoContraste } from '@/lib/settings';
import ConfiguracoesClient from '@/app/configuracoes/ConfiguracoesClient';
import { useKeyboardShortcuts, buildMainShortcuts } from '@/hooks/useKeyboardShortcuts';
import SyncQueueScreen from '@/components/SyncQueueScreen';
import AuditLogScreen from '@/components/AuditLogScreen';
import StatusScreen from '@/components/StatusScreen';
import AgendaScreen from '@/components/AgendaScreen';
import NovoAgendamentoModal from '@/components/NovoAgendamentoModal';
import EditarAgendamentoModal from '@/components/EditarAgendamentoModal';
import { useContextMenu } from '@/components/ContextMenu';
import { useRealTimeStatus } from '@/hooks/useRealTimeStatus';

// Views e hooks modularizados
import { SyncBanner } from '@/components/SyncBanner';
import { ExportarView } from '@/components/views/ExportarView';
import { ApartamentosView } from '@/components/views/ApartamentosView';
import { BlocosView } from '@/components/views/BlocosView';
import { HeatmapView } from '@/components/views/HeatmapView';
import { ComparativoView } from '@/components/views/ComparativoView';
import { useVistoriaState } from '@/hooks/useVistoriaState';
import { useApartamentosFilter } from '@/hooks/useApartamentosFilter';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';

type View =
  | 'blocos'
  | 'apartamentos'
  | 'captura'
  | 'configuracoes'
  | 'syncQueue'
  | 'auditLog'
  | 'exportar'
  | 'heatmap'
  | 'agenda'
  | 'comparativo'
  | 'status';

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
  const [modoEscaneamento, setModoEscaneamento] = useState(false);
  const [diasAlerta, setDiasAlerta] = useState(7);
  const { theme, toggle: toggleTheme } = useTheme();
  const { toast } = useToast();
  const { showSyncProgress, updateSyncProgress } = useSyncProgress();
  const [activeNav, setActiveNav] = useState<'inicio' | 'camera' | 'galeria' | 'agenda' | 'exportar' | 'config'>('inicio');

  // Modais de agendamento e comentários
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [agendamentoRapido, setAgendamentoRapido] = useState<{ bloco: string; apto: string } | null>(null);
  const [agendaKey, setAgendaKey] = useState(0);
  const [agendamentoEditando, setAgendamentoEditando] = useState<Agendamento | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState<{ bloco: string; apto: string } | null>(null);
  const [desmarcarConfirm, setDesmarcarConfirm] = useState<{ bloco: string; apto: string } | null>(null);

  const pinRef = useRef<string | null>(null);
  const { menu: ctxMenu, closeMenu: ctxClose } = useContextMenu();
  const { lastUpdate: rtLastUpdate, online: rtOnline } = useRealTimeStatus();

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

  // Função unificada de sincronização com Vercel Blob e OneDrive
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

  // Inicialização do PIN e listeners de background
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
    else if (v === 'inicio') {
      setView('blocos');
      setBlocoAtual(null);
    } else if (v === 'agenda') setView('agenda');
  }, []);

  // Scroll to top ao trocar de view
  useEffect(() => {
    window.scrollTo(0, 0);
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

  const handleKeyboardBloco = useCallback(
    (idx: number) => {
      if (view !== 'blocos' || blocoAtual) return;
      const key = blocoKeys[idx];
      if (!key) return;
      const full = blocos.find((b) => b.replace(/^Torre\s+/i, '').trim().toUpperCase() === key);
      if (full) {
        haptic('light');
        setBlocoAtual(full);
        setView('apartamentos');
      }
    },
    [view, blocoAtual, blocoKeys, blocos]
  );

  useKeyboardShortcuts(
    buildMainShortcuts({
      onSearch: handleKeyboardSearch,
      onBack: handleKeyboardBack,
      onBloco: handleKeyboardBloco,
    }),
    !!pin
  );

  // Desmarcar apartamento concluído
  const handleDesmarcarExecutar = useCallback(async () => {
    if (!desmarcarConfirm) return;
    const { bloco, apto } = desmarcarConfirm;
    setDesmarcarConfirm(null);
    haptic('heavy');
    try {
      const { desmarcarConcluidoLocal } = await import('@/lib/db');
      await desmarcarConcluidoLocal(bloco, apto);

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
        toast(data.error || 'Erro ao desmarcar na nuvem', 'warning');
        await refreshStatus();
      }
    } catch {
      toast('Erro ao desmarcar apartamento', 'error');
    }
  }, [desmarcarConfirm, toast, refreshCommentCounts, refreshStatus]);

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

  // Atualizar tudo ao dar refresh manual / pull-to-refresh
  const handleRefreshAll = useCallback(async () => {
    await refreshStatus();
    refreshFotosOnline();
    await refreshCommentCounts(blocoAtual ?? undefined);
  }, [refreshStatus, refreshFotosOnline, refreshCommentCounts, blocoAtual]);

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
      <HeatmapView
        statusMerged={statusMerged}
        onVoltar={() => setView('blocos')}
        onNavigateToApto={(bloco, apto) => {
          setBlocoAtual(bloco);
          setAptoAtual(apto);
          setView('captura');
        }}
        onNavigate={handleNavigation}
      />
    );
  }

  if (view === 'comparativo') {
    return (
      <ComparativoView
        status={status}
        lista={lista || {}}
        onVoltar={() => setView('blocos')}
        onNavigate={handleNavigation}
      />
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
            await refreshStatus();
            tentarSincronizar();
          }}
          modoEscaneamento={modoEscaneamento}
          proximoApto={modoEscaneamento && proximoApto ? proximoApto.apartamento : undefined}
          onProximoApto={
            modoEscaneamento && proximoApto
              ? () => {
                  setAptoAtual(proximoApto.apartamento);
                  refreshStatus();
                }
              : undefined
          }
          fotosOnline={fotosOnline.filter(
            (f) =>
              normalizeBloco(f.bloco) === normalizeBloco(blocoAtual) &&
              normApto(f.apartamento) === normApto(aptoAtual)
          )}
        />
        <SyncBanner online={online} pendentes={pendentes} onClick={() => setView('syncQueue')} />
      </>
    );
  }

  if (view === 'apartamentos' && blocoAtual) {
    return (
      <motion.div
        key={`view-apartamentos-${blocoAtual}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={spring}
      >
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
          headerCollapsed={false}
          loadingSkeleton={loadingSkeleton}
          paginaAtual={paginaAtual}
          totalPaginas={totalPaginas}
          itensPagina={itensPagina}
          onPaginaChange={setPaginaAtual}
          onItensPaginaChange={(n) => {
            setItensPagina(n);
            setPaginaAtual(1);
          }}
          onVoltar={() => {
            setView('blocos');
            setBlocoAtual(null);
          }}
          onAbrirApto={(apto) => {
            setAptoAtual(apto);
            setView('captura');
          }}
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
      </motion.div>
    );
  }

  // View principal: BlocosGrid com Dashboard, Busca, Atrasados e Links
  return (
    <>
      <BlocosView
        status={status}
        statusMerged={statusMerged}
        statusMap={statusMap}
        fotosOnline={fotosOnline}
        fotosOnlineMap={fotosOnlineMap}
        fotosCountMap={fotosCountMap}
        fotosRecentes={fotosRecentes}
        blocos={blocos}
        progressoMap={progressoMap}
        aptosEsquecidos={aptosEsquecidos}
        lista={lista}
        pendentes={pendentes}
        loadingSkeleton={loadingSkeleton}
        online={online}
        espacoStorage={espacoStorage}
        updateDisponivel={updateDisponivel}
        versaoNova={versaoNova}
        ultimoBackup={ultimoBackup}
        showTutorial={showTutorial}
        setShowTutorial={setShowTutorial}
        deferredPrompt={deferredPrompt}
        setDeferredPrompt={setDeferredPrompt}
        showInstallBanner={showInstallBanner}
        setShowInstallBanner={setShowInstallBanner}
        theme={theme}
        toggleTheme={toggleTheme}
        modoEscaneamento={modoEscaneamento}
        setModoEscaneamento={setModoEscaneamento}
        rtOnline={rtOnline}
        rtLastUpdate={rtLastUpdate}
        userRole={userRole}
        onRefreshAll={handleRefreshAll}
        onSelectBloco={(b) => {
          setBlocoAtual(b);
          setView('apartamentos');
        }}
        onAbrirCapturaApto={(b, a) => {
          setBlocoAtual(b);
          setAptoAtual(a);
          setView('captura');
        }}
        onNavigate={(v) => {
          if (v === 'captura') setView('captura');
          else if (v === 'heatmap') setView('heatmap');
          else if (v === 'comparativo') setView('comparativo');
          else handleNavigation(v);
        }}
        onBackup={handleBackup}
        onRestore={handleRestore}
        onLogout={() => {
          sessionStorage.removeItem('vistoria_pin');
          setPin(null);
          pinRef.current = null;
        }}
        onEditLista={() => {
          setListaAnterior(lista);
          setLista(null);
        }}
        onDesmarcarConfirm={(bloco, apto) => setDesmarcarConfirm({ bloco, apto })}
        toast={toast}
        refreshCommentCounts={refreshCommentCounts}
      />

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
    </>
  );
}
