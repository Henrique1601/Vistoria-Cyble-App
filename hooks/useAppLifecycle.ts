'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { INACTIVITY_TIMEOUT_MS, STORAGE_WARNING_PCT } from '@/lib/constants';
import { APP_VERSION } from '@/lib/version';
import { addNotification } from '@/lib/notifications';
import { notifyOnline, notifyOffline } from '@/lib/notificationsPush';
import { checarEspacoStorage } from '@/lib/db';
import {
  fazerBackupManual,
  fazerBackupAutomatico,
  obterUltimoBackup,
  deveFazerBackup,
  formatarTimestampBackup,
} from '@/lib/backup';
import { getSalvarEm, getBackupIntervalo } from '@/lib/settings';
import { logAudit } from '@/lib/auditLog';
import { shouldShowTutorial } from '@/components/OnboardingTour';

interface UseAppLifecycleProps {
  pin: string | null;
  onLogout: () => void;
  onAutoSync?: () => void;
}

export function useAppLifecycle({ pin, onLogout, onAutoSync }: UseAppLifecycleProps) {
  const { toast } = useToast();
  const [online, setOnline] = useState(true);
  const [updateDisponivel, setUpdateDisponivel] = useState(false);
  const [versaoAtual, setVersaoAtual] = useState(APP_VERSION);
  const [versaoNova, setVersaoNova] = useState(APP_VERSION);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [espacoStorage, setEspacoStorage] = useState<{ usado: number; total: number; pct: number } | null>(null);
  const [ultimoBackup, setUltimoBackup] = useState<string>('Nunca');
  const lastActivityRef = useRef(Date.now());

  // Timeout de inatividade (30 minutos)
  useEffect(() => {
    if (!pin) return;
    const TIMEOUT_MS = INACTIVITY_TIMEOUT_MS;
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    const resetTimer = () => { lastActivityRef.current = Date.now(); };
    events.forEach((e) => window.addEventListener(e, resetTimer));
    const check = setInterval(() => {
      if (Date.now() - lastActivityRef.current > TIMEOUT_MS) {
        onLogout();
      }
    }, 60000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      clearInterval(check);
    };
  }, [pin, onLogout]);

  // Checar atualização — fetch direto
  useEffect(() => {
    if (!pin) return;

    let mounted = true;
    const verAplicada = APP_VERSION;

    async function checarVersao() {
      try {
        const resp = await fetch('/api/version', { cache: 'no-store' });
        const data = await resp.json();
        if (!mounted) return;
        setVersaoAtual(verAplicada);
        setVersaoNova(data.version);
        if (data.version !== verAplicada) {
          setUpdateDisponivel(true);
          toast('Nova versao disponivel!', 'info', {
            duration: 0,
            undoLabel: 'Atualizar',
            onUndo: () => {
              setUpdateDisponivel(false);
              navigator.serviceWorker?.controller?.postMessage('skipWaiting');
              window.location.reload();
            },
          });
        }
      } catch { /* offline or error — ignore */ }
    }

    checarVersao();
    const interval = setInterval(checarVersao, 60000);
    return () => { mounted = false; clearInterval(interval); };
  }, [pin, toast]);

  // Conectividade online/offline
  useEffect(() => {
    const timer = setTimeout(() => {
      setOnline(navigator.onLine);
      if (navigator.onLine) {
        fetch('/api/version', { method: 'HEAD', cache: 'no-store' })
          .then(() => setOnline(true))
          .catch(() => setOnline(false));
      }
    }, 500);

    const on = () => {
      setOnline(true);
      notifyOnline();
      navigator.serviceWorker?.controller?.postMessage('requestSync');
      onAutoSync?.();
    };

    const off = () => {
      setOnline(false);
      notifyOffline();
    };

    window.addEventListener('online', on);
    window.addEventListener('offline', off);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [onAutoSync]);

  // Checar espaço de armazenamento
  useEffect(() => {
    if (!pin) return;
    let notified = false;
    checarEspacoStorage().then((e) => {
      setEspacoStorage(e);
      if (e && e.pct > STORAGE_WARNING_PCT && !notified) {
        notified = true;
        addNotification({
          tipo: 'storage',
          titulo: 'Armazenamento quase cheio',
          mensagem: `${e.pct}% do espaco utilizado. Considere fazer backup e limpar fotos locais.`,
        });
      }
    });

    const interval = setInterval(() => {
      checarEspacoStorage().then((e) => {
        setEspacoStorage(e);
        if (e && e.pct > STORAGE_WARNING_PCT && !notified) {
          notified = true;
          addNotification({
            tipo: 'storage',
            titulo: 'Armazenamento quase cheio',
            mensagem: `${e.pct}% do espaco utilizado. Considere fazer backup e limpar fotos locais.`,
          });
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [pin]);

  // Backup automático
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
  }, [pin, toast]);

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

  // Onboarding & Tutorial
  useEffect(() => {
    if (pin && shouldShowTutorial()) {
      setShowTutorial(true);
    }
  }, [pin]);


  return {
    online,
    updateDisponivel,
    setUpdateDisponivel,
    versaoAtual,
    versaoNova,
    showTutorial,
    setShowTutorial,
    showOnboarding,
    setShowOnboarding,
    deferredPrompt,
    setDeferredPrompt,
    showInstallBanner,
    setShowInstallBanner,
    espacoStorage,
    ultimoBackup,
    setUltimoBackup,
  };
}
