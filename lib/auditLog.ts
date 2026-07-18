export type AuditAction =
  | 'photo_captured'
  | 'photo_deleted'
  | 'photo_annotated'
  | 'photo_shared'
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'export_csv'
  | 'export_pdf'
  | 'export_xlsx'
  | 'export_zip'
  | 'export_html'
  | 'backup_created'
  | 'backup_restored'
  | 'settings_changed'
  | 'login'
  | 'logout';

export interface AuditEntry {
  id: number;
  timestamp: number;
  action: AuditAction;
  details: string;
  meta?: {
    bloco?: string;
    apartamento?: string;
    categoria?: string;
    arquivo?: string;
    valor?: string;
  };
}

const DB_NAME = 'vistoria-audit';
const STORE = 'logs';
const DB_VERSION = 1;
const MAX_ENTRIES = 500;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('action', 'action');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function logAudit(action: AuditAction, details: string, meta?: AuditEntry['meta']): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  store.add({ timestamp: Date.now(), action, details, meta });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Trim old entries
  const countTx = db.transaction(STORE, 'readonly');
  const countReq = countTx.objectStore(STORE).count();
  const count = await new Promise<number>((res) => {
    countReq.onsuccess = () => res(countReq.result);
    countReq.onerror = () => res(0);
  });

  if (count > MAX_ENTRIES) {
    const trimTx = db.transaction(STORE, 'readwrite');
    const trimStore = trimTx.objectStore(STORE);
    const idx = trimStore.index('timestamp');
    let deleted = 0;
    const toDelete = count - MAX_ENTRIES;
    const cursor = idx.openCursor();
    await new Promise<void>((resolve) => {
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c && deleted < toDelete) {
          c.delete();
          deleted++;
          c.continue();
        } else {
          resolve();
        }
      };
      cursor.onerror = () => resolve();
    });
  }
}

export async function getAuditLog(limit = 100, filter?: AuditAction): Promise<AuditEntry[]> {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const store = tx.objectStore(STORE);

  return new Promise((resolve) => {
    const results: AuditEntry[] = [];
    const idx = store.index('timestamp');
    const req = idx.openCursor(null, 'prev'); // newest first
    let count = 0;

    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor && count < limit) {
        const entry = cursor.value as AuditEntry;
        if (!filter || entry.action === filter) {
          results.push(entry);
          count++;
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => resolve([]);
  });
}

export async function searchAuditLog(query: string): Promise<AuditEntry[]> {
  const all = await getAuditLog(500);
  const q = query.toLowerCase();
  return all.filter(
    (e) =>
      e.details.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      e.meta?.bloco?.toLowerCase().includes(q) ||
      e.meta?.apartamento?.toLowerCase().includes(q) ||
      e.meta?.categoria?.toLowerCase().includes(q)
  );
}

export async function clearAuditLog(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
}

const ACTION_LABELS: Record<AuditAction, string> = {
  photo_captured: 'Foto capturada',
  photo_deleted: 'Foto deletada',
  photo_annotated: 'Foto anotada',
  photo_shared: 'Foto compartilhada',
  sync_started: 'Sync iniciada',
  sync_completed: 'Sync concluída',
  sync_failed: 'Sync falhou',
  export_csv: 'CSV exportado',
  export_pdf: 'PDF exportado',
  export_xlsx: 'XLSX exportado',
  export_zip: 'ZIP exportado',
  export_html: 'HTML exportado',
  backup_created: 'Backup criado',
  backup_restored: 'Backup restaurado',
  settings_changed: 'Configuração alterada',
  login: 'Login',
  logout: 'Logout',
};

export function getActionLabel(action: AuditAction): string {
  return ACTION_LABELS[action] ?? action;
}

const ACTION_COLORS: Record<AuditAction, string> = {
  photo_captured: 'text-accent',
  photo_deleted: 'text-danger',
  photo_annotated: 'text-info',
  photo_shared: 'text-success',
  sync_started: 'text-accent',
  sync_completed: 'text-success',
  sync_failed: 'text-danger',
  export_csv: 'text-content-secondary',
  export_pdf: 'text-content-secondary',
  export_xlsx: 'text-content-secondary',
  export_zip: 'text-content-secondary',
  export_html: 'text-content-secondary',
  backup_created: 'text-success',
  backup_restored: 'text-info',
  settings_changed: 'text-warn',
  login: 'text-content-tertiary',
  logout: 'text-content-tertiary',
};

export function getActionColor(action: AuditAction): string {
  return ACTION_COLORS[action] ?? 'text-content-secondary';
}
