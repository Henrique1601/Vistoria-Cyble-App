import { backupDados } from './db';

const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LAST_BACKUP_KEY = 'lastBackupTimestamp';

export async function obterUltimoBackup(): Promise<number | null> {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(LAST_BACKUP_KEY);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

export async function salvarUltimoBackup(timestamp: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_BACKUP_KEY, timestamp.toString());
  } catch { /* ignore */ }
}

export async function deveFazerBackup(): Promise<boolean> {
  const ultimo = await obterUltimoBackup();
  if (!ultimo) return true;
  return Date.now() - ultimo > BACKUP_INTERVAL_MS;
}

export async function fazerBackupManual(): Promise<{
  ok: boolean;
  downloadUrl?: string;
  blobUrl?: string;
  erro?: string;
}> {
  try {
    const blob = await backupDados();
    const timestamp = Date.now();
    const fileName = `backup-${new Date(timestamp).toISOString().slice(0, 10)}.json`;

    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

    let blobUrl: string | undefined;
    try {
      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('timestamp', timestamp.toString());

      const res = await fetch('/api/backup', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        blobUrl = data.url;
      }
    } catch {
      // Upload online falhou, mas download local OK
    }

    await salvarUltimoBackup(timestamp);

    return { ok: true, downloadUrl, blobUrl };
  } catch (err) {
    return { ok: false, erro: String(err) };
  }
}

export async function fazerBackupAutomatico(): Promise<{
  ok: boolean;
  blobUrl?: string;
  erro?: string;
}> {
  try {
    const blob = await backupDados();
    const timestamp = Date.now();
    const fileName = `backup-auto-${new Date(timestamp).toISOString().slice(0, 10)}.json`;

    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('timestamp', timestamp.toString());

    const res = await fetch('/api/backup', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      return { ok: false, erro: `HTTP ${res.status}` };
    }

    const data = await res.json();
    await salvarUltimoBackup(timestamp);

    return { ok: true, blobUrl: data.url };
  } catch (err) {
    return { ok: false, erro: String(err) };
  }
}

export function formatarTimestampBackup(ts: number | null): string {
  if (!ts) return 'Nunca';
  const d = new Date(ts);
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const ano = d.getFullYear();
  const hora = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${dia}/${mes}/${ano} ${hora}:${min}`;
}
