import { openDB, DBSchema, IDBPDatabase } from 'idb';

export type Categoria = 'cyble_antes' | 'cyble_depois' | 'documento';

export interface ApartamentoStatus {
  bloco: string;
  apartamento: string;
  cybleAntesFeito: boolean;
  cybleDepoisFeito: boolean;
  qtdDocumentos: number;
  qtdFotos: number;
}

export interface FotoRecord {
  id?: number;
  bloco: string;
  apartamento: string;
  categoria: Categoria;
  blob: Blob;
  timestamp: number;
  synced: boolean;
  uploadUrl?: string;
  nota?: string;
  gps?: { lat: number; lng: number };
}

export interface SyncLogEntry {
  id?: number;
  timestamp: number;
  bloco: string;
  apartamento: string;
  categoria: string;
  url: string;
  ok: boolean;
  erro?: string;
}

interface VistoriaDB extends DBSchema {
  fotos: {
    key: number;
    value: FotoRecord;
  };
  syncLog: {
    key: number;
    value: SyncLogEntry;
  };
  config: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<VistoriaDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<VistoriaDB>('vistoria-cyble', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('fotos', { keyPath: 'id', autoIncrement: true });
          db.createObjectStore('config');
        }
        if (oldVersion < 2) {
          db.createObjectStore('syncLog', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

// --- Configuracao: lista de blocos/apartamentos ---
export async function salvarListaApartamentos(lista: Record<string, string[]>) {
  const db = await getDb();
  await db.put('config', lista, 'blocos');
}

export async function carregarListaApartamentos(): Promise<Record<string, string[]>> {
  const db = await getDb();
  return (await db.get('config', 'blocos')) ?? {};
}

export async function salvarPin(pin: string) {
  const db = await getDb();
  await db.put('config', pin, 'pin');
}

export async function carregarPin(): Promise<string | null> {
  const db = await getDb();
  return (await db.get('config', 'pin')) ?? null;
}

// --- Fotos ---
export async function salvarFoto(rec: Omit<FotoRecord, 'id'>) {
  const db = await getDb();
  return db.add('fotos', rec as FotoRecord);
}

export async function fotosDoApartamento(bloco: string, apartamento: string) {
  const db = await getDb();
  const all = await db.getAll('fotos');
  return all.filter((f) => f.bloco === bloco && f.apartamento === apartamento);
}

export async function fotosPendentes() {
  const db = await getDb();
  const all = await db.getAll('fotos');
  return all.filter((f) => !f.synced);
}

export async function deletarFoto(id: number) {
  const db = await getDb();
  await db.delete('fotos', id);
}

export async function atualizarNota(id: number, nota: string) {
  const db = await getDb();
  const rec = await db.get('fotos', id);
  if (rec) {
    rec.nota = nota;
    await db.put('fotos', rec);
  }
}

export async function marcarSincronizada(id: number, url: string) {
  const db = await getDb();
  const rec = await db.get('fotos', id);
  if (rec) {
    rec.synced = true;
    rec.uploadUrl = url;
    await db.put('fotos', rec);
  }
}

export async function statusDeTodosApartamentos(
  lista: Record<string, string[]>
): Promise<ApartamentoStatus[]> {
  const db = await getDb();
  const all = await db.getAll('fotos');
  const result: ApartamentoStatus[] = [];
  for (const bloco of Object.keys(lista)) {
    for (const apto of lista[bloco]) {
      const fotos = all.filter((f) => f.bloco === bloco && f.apartamento === apto);
      result.push({
        bloco,
        apartamento: apto,
        cybleAntesFeito: fotos.some((f) => f.categoria === 'cyble_antes'),
        cybleDepoisFeito: fotos.some((f) => f.categoria === 'cyble_depois'),
        qtdDocumentos: fotos.filter((f) => f.categoria === 'documento').length,
        qtdFotos: fotos.length,
      });
    }
  }
  return result;
}

// --- Compressao de imagem ---
export async function comprimirImagem(file: File, maxLargura = 1920, qualidade = 0.75): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, maxLargura / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.convertToBlob({ type: 'image/jpeg', quality: qualidade });
}

// --- Ultimas fotos (para acesso rapido) ---
export async function ultimasFotos(limite = 10): Promise<FotoRecord[]> {
  const db = await getDb();
  const all = await db.getAll('fotos');
  return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limite);
}

// --- Historico de sincronizacao ---
export async function registrarSync(entry: Omit<SyncLogEntry, 'id'>) {
  const db = await getDb();
  await db.add('syncLog', entry as SyncLogEntry);
}

export async function historicoSync(): Promise<SyncLogEntry[]> {
  const db = await getDb();
  const all = await db.getAll('syncLog');
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

// --- Backup / Restore ---
export async function backupDados(): Promise<Blob> {
  const db = await getDb();
  const fotos = await db.getAll('fotos');
  const syncLog = await db.getAll('syncLog');
  const blocos = await db.get('config', 'blocos');

  const fotosSerializadas = await Promise.all(
    fotos.map(async (f) => {
      let blobBase64 = '';
      if (f.blob && f.blob.size > 0) {
        blobBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(f.blob);
        });
      }
      return { ...f, blobBase64, blob: undefined };
    })
  );

  const dados = {
    versao: 2,
    data: new Date().toISOString(),
    fotos: fotosSerializadas,
    syncLog,
    blocos,
  };

  return new Blob([JSON.stringify(dados)], { type: 'application/json' });
}

export async function restaurarDados(json: string): Promise<{ fotos: number; syncLog: number }> {
  const dados = JSON.parse(json);
  const db = await getDb();

  // Limpar dados existentes
  await db.clear('fotos');
  await db.clear('syncLog');
  await db.clear('config');

  // Restaurar blocos
  if (dados.blocos) {
    await db.put('config', dados.blocos, 'blocos');
  }

  // Restaurar fotos
  let fotosCount = 0;
  if (dados.fotos) {
    for (const f of dados.fotos) {
      let blob: Blob;
      if (f.blobBase64) {
        const res = await fetch(f.blobBase64);
        blob = await res.blob();
      } else {
        blob = new Blob([], { type: 'image/jpeg' });
      }
      const { blobBase64, ...rest } = f;
      await db.add('fotos', { ...rest, blob } as FotoRecord);
      fotosCount++;
    }
  }

  // Restaurar syncLog
  let syncCount = 0;
  if (dados.syncLog) {
    for (const entry of dados.syncLog) {
      await db.add('syncLog', entry as SyncLogEntry);
      syncCount++;
    }
  }

  return { fotos: fotosCount, syncLog: syncCount };
}

// --- Checar espaço do IndexedDB ---
export async function checarEspacoStorage(): Promise<{ usado: number; total: number; pct: number } | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const est = await navigator.storage.estimate();
    const usado = est.usage ?? 0;
    const total = est.quota ?? 0;
    return { usado, total, pct: total > 0 ? Math.round((usado / total) * 100) : 0 };
  } catch {
    return null;
  }
}
