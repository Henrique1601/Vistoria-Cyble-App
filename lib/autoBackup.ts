import { backupDados } from './db';
import { getBackupIntervalo, getSalvarEm } from './settings';
import { addNotification, autoDismiss } from './notifications';
import { authFetch } from './api';
import { notifyBackupComplete } from './notificationsPush';

let autoBackupTimer: ReturnType<typeof setInterval> | null = null;
let initialDelayTimer: ReturnType<typeof setTimeout> | null = null;
const LAST_AUTO_BACKUP_KEY = 'vistoria_lastAutoBackup';

function getIntervalMs(): number {
  const min = getBackupIntervalo();
  return min * 60 * 1000;
}

function getLastAutoBackup(): number | null {
  try {
    const v = localStorage.getItem(LAST_AUTO_BACKUP_KEY);
    return v ? parseInt(v, 10) : null;
  } catch { return null; }
}

function setLastAutoBackup(ts: number) {
  try { localStorage.setItem(LAST_AUTO_BACKUP_KEY, String(ts)); } catch {}
}

export async function execAutoBackup(): Promise<boolean> {
  try {
    const blob = await backupDados();
    const ts = Date.now();
    const fileName = `backup-auto-${new Date(ts).toISOString().slice(0, 10)}.json`;

    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('timestamp', ts.toString());

    const res = await authFetch('/api/backup', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      setLastAutoBackup(ts);
      notifyBackupComplete();
      const nId = addNotification({
        tipo: 'backup',
        titulo: 'Backup automatico',
        mensagem: `Backup salvo com sucesso em ${new Date(ts).toLocaleString('pt-BR')}`,
      });
      autoDismiss(nId, 5000);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function startInterval() {
  if (autoBackupTimer) return;
  const interval = getIntervalMs();
  autoBackupTimer = setInterval(() => {
    if (navigator.onLine) {
      execAutoBackup();
    }
  }, interval);
}

export function startAutoBackup() {
  if (autoBackupTimer || initialDelayTimer) return;
  if (getSalvarEm() === 'dispositivo') return;

  const interval = getIntervalMs();

  // Check if enough time has passed since last backup
  const last = getLastAutoBackup();
  const now = Date.now();
  if (last && now - last < interval) {
    // Schedule first backup after remaining time
    const nextIn = interval - (now - last);
    initialDelayTimer = setTimeout(() => {
      initialDelayTimer = null;
      if (navigator.onLine) {
        execAutoBackup();
      }
      startInterval();
    }, nextIn);
    return;
  }

  // Start immediate interval
  startInterval();

  // Execute first backup if online
  if (navigator.onLine) {
    execAutoBackup();
  }
}

export function stopAutoBackup() {
  if (initialDelayTimer) {
    clearTimeout(initialDelayTimer);
    initialDelayTimer = null;
  }
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
  }
}

export function isAutoBackupRunning(): boolean {
  return autoBackupTimer !== null || initialDelayTimer !== null;
}

export function getAutoBackupInfo(): { running: boolean; lastBackup: number | null; interval: number } {
  return {
    running: autoBackupTimer !== null || initialDelayTimer !== null,
    lastBackup: getLastAutoBackup(),
    interval: getBackupIntervalo(),
  };
}
