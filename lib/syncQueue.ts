import { FotoRecord, fotosPendentes, marcarSincronizada, registrarSync } from './db';

export type SyncStatus = 'pending' | 'uploading' | 'success' | 'failed';

export interface SyncQueueItem {
  foto: FotoRecord;
  status: SyncStatus;
  attempts: number;
  lastError?: string;
  nextRetryAt?: number;
}

type Listener = () => void;

let queue: SyncQueueItem[] = [];
const listeners: Set<Listener> = new Set();
let isRunning = false;
let abortController: AbortController | null = null;

const MAX_ATTEMPTS = 5;
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

export async function loadQueue() {
  const pendentes = await fotosPendentes();
  const existingIds = new Set(queue.map((i) => i.foto.id));

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
  queue = queue.filter((i) => {
    if (i.status === 'success') return false;
    if (i.status === 'uploading') return false;
    return pendingIds.has(i.foto.id);
  });

  emit();
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
    await marcarSincronizada(item.foto.id!, data.url);
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

export async function syncAll(pin: string, onDone?: () => void) {
  if (isRunning || !navigator.onLine || !pin) return;
  isRunning = true;
  abortController = new AbortController();

  const pendingItems = queue.filter((i) => i.status === 'pending' || canRetry(i));

  for (const item of pendingItems) {
    if (!isRunning) break;

    item.status = 'uploading';
    item.attempts++;
    emit();

    try {
      const ok = await uploadOne(item, pin);
      if (ok) {
        item.status = 'success';
      } else {
        item.status = 'failed';
        item.lastError = 'Upload failed';
        if (item.attempts < MAX_ATTEMPTS) {
          item.nextRetryAt = Date.now() + getDelay(item.attempts);
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        item.status = 'pending';
      } else {
        item.status = 'failed';
        item.lastError = e?.message ?? 'Connection error';
        if (item.attempts < MAX_ATTEMPTS) {
          item.nextRetryAt = Date.now() + getDelay(item.attempts);
        }
      }
    }
    emit();
  }

  // Remove success items after a delay
  setTimeout(() => {
    queue = queue.filter((i) => i.status !== 'success');
    emit();
  }, 3000);

  isRunning = false;
  abortController = null;
  emit();
  onDone?.();
}

export function retryItem(item: SyncQueueItem, pin: string) {
  if (!isRunning) {
    item.status = 'pending';
    item.attempts = 0;
    item.lastError = undefined;
    item.nextRetryAt = undefined;
    emit();
    syncAll(pin);
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
  syncAll(pin);
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
