import { FotoRecord, fotosPendentes, marcarSincronizada, registrarSync } from './db';
import { getSalvarEm } from './settings';
import { SYNC_CONCURRENCY } from './constants';
import { logAudit } from './auditLog';
import { notifySyncComplete, notifySyncFailed } from './notificationsPush';
import { addNotification, autoDismiss } from './notifications';

export type SyncStatus = 'pending' | 'uploading' | 'success' | 'failed';

export interface SyncQueueItem {
  foto: FotoRecord;
  status: SyncStatus;
  attempts: number;
  lastError?: string;
  nextRetryAt?: number;
}

export interface SyncOptions {
  concurrency?: number;
  onStart?: (total: number) => void;
  onProgress?: (uploaded: number, total: number) => void;
  onSuccess?: (total: number) => void;
  onError?: (error: string, failedCount: number) => void;
  onDone?: () => void;
}

type Listener = () => void;

let queue: SyncQueueItem[] = [];
const listeners: Set<Listener> = new Set();
let isRunning = false;
let abortController: AbortController | null = null;
let syncGeneration = 0;

const MAX_ATTEMPTS = 10;
const BASE_DELAY_MS = 1000;

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getQueue(): SyncQueueItem[] {
  return queue;
}

export function getQueueStats() {
  const pending = queue.filter((i) => i.status === 'pending').length;
  const uploading = queue.filter((i) => i.status === 'uploading').length;
  const success = queue.filter((i) => i.status === 'success').length;
  const failed = queue.filter((i) => i.status === 'failed').length;
  const total = queue.length;
  return { pending, uploading, success, failed, total };
}

export async function loadQueue(): Promise<SyncQueueItem[]> {
  const pendentes = await fotosPendentes();
  const existingIds = new Set(queue.map((i) => i.foto.id));
  const pendentesMap = new Map(pendentes.map((f) => [f.id, f]));

  // Update existing items with fresh photo data (may have GPS, notes, etc.)
  for (const item of queue) {
    const freshFoto = pendentesMap.get(item.foto.id);
    if (freshFoto) {
      item.foto = freshFoto;
    }
  }

  // Add new pending photos not already in queue
  for (const foto of pendentes) {
    if (!existingIds.has(foto.id)) {
      queue.push({
        foto,
        status: 'pending',
        attempts: 0,
      });
    }
  }

  // Remove items whose photos are no longer pending (synced externally)
  const pendingIds = new Set(pendentes.map((f) => f.id));
  for (let i = queue.length - 1; i >= 0; i--) {
    const item = queue[i];
    if (item.status === 'success' || item.status === 'uploading' || !pendingIds.has(item.foto.id)) {
      queue.splice(i, 1);
    }
  }

  emit();
  return queue;
}

function getDelay(attempts: number): number {
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempts), 30000);
}

function canRetry(item: SyncQueueItem): boolean {
  return item.status === 'failed' && item.attempts < MAX_ATTEMPTS;
}

function shouldRetry(item: SyncQueueItem): boolean {
  if (item.status !== 'failed') return false;
  if (item.attempts >= MAX_ATTEMPTS) return false;
  if (!item.nextRetryAt) return false;
  return Date.now() >= item.nextRetryAt;
}

async function uploadOne(item: SyncQueueItem, pin: string): Promise<boolean> {
  // Skip if already synced
  if (item.foto.synced && item.foto.uploadUrl) {
    if (item.foto.id != null) {
      await marcarSincronizada(item.foto.id, item.foto.uploadUrl);
    }
    return true;
  }

  // Skip empty blobs (failed compression)
  if (!item.foto.blob || item.foto.blob.size === 0) {
    await registrarSync({
      timestamp: Date.now(),
      bloco: item.foto.bloco,
      apartamento: item.foto.apartamento,
      categoria: item.foto.categoria,
      url: '',
      ok: false,
      erro: 'Blob vazio (compressao falhou)',
    });
    return false;
  }

  const form = new FormData();
  form.append('file', item.foto.blob, `${item.foto.categoria}.jpg`);
  form.append('bloco', item.foto.bloco);
  form.append('apartamento', item.foto.apartamento);
  form.append('categoria', item.foto.categoria);
  form.append('timestamp', String(item.foto.timestamp));

  const resp = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'x-app-pin': pin },
    body: form,
    signal: abortController?.signal,
  });

  if (resp.ok) {
    const data = await resp.json();
    if (item.foto.id != null) {
      await marcarSincronizada(item.foto.id, data.url);
    }
    await registrarSync({
      timestamp: Date.now(),
      bloco: item.foto.bloco,
      apartamento: item.foto.apartamento,
      categoria: item.foto.categoria,
      url: data.url,
      ok: true,
    });
    return true;
  }

  await registrarSync({
    timestamp: Date.now(),
    bloco: item.foto.bloco,
    apartamento: item.foto.apartamento,
    categoria: item.foto.categoria,
    url: '',
    ok: false,
    erro: `HTTP ${resp.status}`,
  });
  return false;
}

/**
 * Motor de sincronização unificado com concorrência configurável, retry, backoff exponencial,
 * auditoria e telemetria de progresso em tempo real.
 */
export async function syncAll(
  pin: string,
  optionsOrDone?: SyncOptions | (() => void)
): Promise<{ success: boolean; uploaded: number; failed: number }> {
  const options: SyncOptions =
    typeof optionsOrDone === 'function' ? { onDone: optionsOrDone } : optionsOrDone || {};

  if (isRunning || !navigator.onLine || !pin) {
    return { success: false, uploaded: 0, failed: 0 };
  }
  if (getSalvarEm() === 'dispositivo') {
    return { success: true, uploaded: 0, failed: 0 }; // Modo somente dispositivo
  }

  await loadQueue();
  const pendingItems = queue.filter((i) => i.status === 'pending' || canRetry(i) || shouldRetry(i));
  if (pendingItems.length === 0) {
    options.onDone?.();
    return { success: true, uploaded: 0, failed: 0 };
  }

  isRunning = true;
  syncGeneration++;
  const myGeneration = syncGeneration;
  abortController = new AbortController();

  // Watchdog de segurança: reseta lock após 5 minutos caso fique preso
  const watchdog = setTimeout(() => {
    isRunning = false;
  }, 5 * 60 * 1000);

  const total = pendingItems.length;
  let uploadedCount = 0;
  let failedCount = 0;

  logAudit('sync_started', `Sincronizando ${total} foto(s)`);
  options.onStart?.(total);

  const concurrency = options.concurrency ?? SYNC_CONCURRENCY;

  try {
    // Processamento em lotes concorrentes
    for (let i = 0; i < pendingItems.length; i += concurrency) {
      if (!isRunning) break;

      const batch = pendingItems.slice(i, i + concurrency);

      // Marca todos do batch como uploading
      batch.forEach((item) => {
        item.status = 'uploading';
        item.attempts++;
      });
      emit();

      await Promise.all(
        batch.map(async (item) => {
          try {
            const ok = await uploadOne(item, pin);
            if (ok) {
              item.status = 'success';
              uploadedCount++;
            } else {
              item.status = 'failed';
              item.lastError = 'Upload failed';
              failedCount++;
              if (item.attempts < MAX_ATTEMPTS) {
                item.nextRetryAt = Date.now() + getDelay(item.attempts);
              }
            }
          } catch (e: unknown) {
            const err = e instanceof Error ? e : new Error(String(e));
            if (err.name === 'AbortError') {
              item.status = 'pending';
            } else {
              item.status = 'failed';
              item.lastError = err.message ?? 'Connection error';
              failedCount++;
              if (item.attempts < MAX_ATTEMPTS) {
                item.nextRetryAt = Date.now() + getDelay(item.attempts);
              }
            }
          }
        })
      );

      emit();
      options.onProgress?.(uploadedCount, total);
    }

    if (failedCount > 0) {
      logAudit('sync_failed', `Falha ao sincronizar ${failedCount} de ${total} foto(s)`);
      notifySyncFailed(failedCount);
      const nId = addNotification({
        tipo: 'error',
        titulo: 'Erro na sincronização',
        mensagem: 'Uma ou mais fotos falharam ao enviar. Verifique sua conexão.',
      });
      autoDismiss(nId, 8000);
      options.onError?.('Falha ao sincronizar algumas fotos', failedCount);
    } else if (uploadedCount > 0) {
      logAudit('sync_completed', `${uploadedCount} foto(s) sincronizada(s) com sucesso`);
      notifySyncComplete(0, uploadedCount);
      const nId = addNotification({
        tipo: 'sync',
        titulo: 'Sincronizado',
        mensagem: `${uploadedCount} foto(s) enviada(s) com sucesso.`,
      });
      autoDismiss(nId, 5000);
      options.onSuccess?.(uploadedCount);
    }
  } finally {
    clearTimeout(watchdog);
    isRunning = false;
    abortController = null;
    emit();
    options.onDone?.();

    // Remove itens de sucesso após 3 segundos
    setTimeout(() => {
      if (syncGeneration !== myGeneration) return;
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].status === 'success') queue.splice(i, 1);
      }
      emit();
    }, 3000);
  }

  return { success: failedCount === 0, uploaded: uploadedCount, failed: failedCount };
}

export function retryItem(item: SyncQueueItem, pin: string) {
  if (!isRunning) {
    item.status = 'pending';
    item.attempts = 0;
    item.lastError = undefined;
    item.nextRetryAt = undefined;
    emit();
    syncAll(pin).catch(() => {});
  }
}

export function retryFailed(pin: string) {
  queue
    .filter((i) => i.status === 'failed')
    .forEach((i) => {
      i.status = 'pending';
      i.attempts = 0;
      i.lastError = undefined;
      i.nextRetryAt = undefined;
    });
  emit();
  syncAll(pin).catch(() => {});
}

export function clearSuccess() {
  queue = queue.filter((i) => i.status !== 'success');
  emit();
}

export function cancelSync() {
  isRunning = false;
  abortController?.abort();
  abortController = null;
  queue
    .filter((i) => i.status === 'uploading')
    .forEach((i) => {
      i.status = 'pending';
    });
  emit();
}

export function isSyncing() {
  return isRunning;
}

// Auto-retry quando conexão retorna
let onlineListener: (() => void) | null = null;

export function startOfflineAutoRetry(getPin: () => string | null) {
  if (typeof window === 'undefined' || onlineListener) return;
  onlineListener = () => {
    const pin = getPin();
    if (pin && !isRunning) {
      setTimeout(() => syncAll(pin), 2000); // 2s para estabilizar conexão
    }
  };
  window.addEventListener('online', onlineListener);
}

export function stopOfflineAutoRetry() {
  if (onlineListener && typeof window !== 'undefined') {
    window.removeEventListener('online', onlineListener);
    onlineListener = null;
  }
}
