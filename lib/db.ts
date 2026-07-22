import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AcaoDesenho } from './drawing';

export type Categoria = 'cyble_antes' | 'cyble_depois' | 'documento';

export interface ApartamentoStatus {
  bloco: string;
  apartamento: string;
  cybleAntesFeito: boolean;
  cybleDepoisFeito: boolean;
  qtdDocumentos: number;
  qtdFotos: number;
  notas?: string[];
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
  anotacoes?: AcaoDesenho[];
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

  const fotosMap = new Map<string, FotoRecord[]>();
  for (const f of all) {
    const key = `${f.bloco}__${f.apartamento}`;
    const arr = fotosMap.get(key) || [];
    arr.push(f);
    fotosMap.set(key, arr);
  }

  const result: ApartamentoStatus[] = [];
  for (const bloco of Object.keys(lista)) {
    for (const apto of lista[bloco]) {
      const key = `${bloco}__${apto}`;
      const fotos = fotosMap.get(key) || [];
      const notas = fotos.map((f) => f.nota).filter((n): n is string => !!n && n.trim().length > 0);
      result.push({
        bloco,
        apartamento: apto,
        cybleAntesFeito: fotos.some((f) => f.categoria === 'cyble_antes'),
        cybleDepoisFeito: fotos.some((f) => f.categoria === 'cyble_depois'),
        qtdDocumentos: fotos.filter((f) => f.categoria === 'documento').length,
        qtdFotos: fotos.length,
        notas: notas.length > 0 ? notas : undefined,
      });
    }
  }
  return result;
}

// --- Compressao de imagem ---
const MAX_IMAGE_WIDTH = 1920;
const IMAGE_QUALITY = 0.75;

export async function comprimirImagem(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, MAX_IMAGE_WIDTH / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.convertToBlob({ type: 'image/jpeg', quality: IMAGE_QUALITY });
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

// --- Backup / Restore ---
export async function backupDados(): Promise<Blob> {
  const db = await getDb();
  const fotos = await db.getAll('fotos');
  const syncLog = await db.getAll('syncLog');
  const blocos = await db.get('config', 'blocos');

  const fotosSerializadas = await Promise.all(
    fotos.map(async (f) => {
      let blobBase64 = '';
      if (f.blob && f.blob.size > 0 && !f.synced) {
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
    tipo: 'completo',
    data: new Date().toISOString(),
    fotos: fotosSerializadas,
    syncLog,
    blocos,
  };

  return new Blob([JSON.stringify(dados)], { type: 'application/json' });
}

export async function backupBlocos(): Promise<Blob> {
  const db = await getDb();
  const blocos = await db.get('config', 'blocos');
  const dados = {
    versao: 2,
    tipo: 'configuracao',
    data: new Date().toISOString(),
    blocos: blocos || {},
  };
  return new Blob([JSON.stringify(dados)], { type: 'application/json' });
}

export async function backupFotos(): Promise<Blob> {
  const db = await getDb();
  const fotos = await db.getAll('fotos');
  const syncLog = await db.getAll('syncLog');

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
    tipo: 'fotos',
    data: new Date().toISOString(),
    fotos: fotosSerializadas,
    syncLog,
  };
  return new Blob([JSON.stringify(dados)], { type: 'application/json' });
}

export async function restaurarDados(json: string): Promise<{ fotos: number; syncLog: number; blocos: number }> {
  const dados = JSON.parse(json);
  const db = await getDb();
  const tipo = dados.tipo || 'completo';

  let blocosCount = 0;
  let fotosCount = 0;
  let syncCount = 0;

  if (tipo === 'configuracao') {
    if (dados.blocos && typeof dados.blocos === 'object' && !Array.isArray(dados.blocos)) {
      await db.put('config', dados.blocos, 'blocos');
      blocosCount = Object.keys(dados.blocos).length;
    }
    return { fotos: 0, syncLog: 0, blocos: blocosCount };
  }

  await db.clear('fotos');
  await db.clear('syncLog');
  await db.clear('config');

  if (dados.blocos && typeof dados.blocos === 'object' && !Array.isArray(dados.blocos)) {
    await db.put('config', dados.blocos, 'blocos');
    blocosCount = Object.keys(dados.blocos).length;
  } else if (dados.lista && typeof dados.lista === 'object' && !Array.isArray(dados.lista)) {
    await db.put('config', dados.lista, 'blocos');
    blocosCount = Object.keys(dados.lista).length;
  } else if (dados.config && typeof dados.config === 'object' && !Array.isArray(dados.config)) {
    await db.put('config', dados.config, 'blocos');
    blocosCount = Object.keys(dados.config).length;
  }

  if (dados.fotos) {
    const tx = db.transaction('fotos', 'readwrite');
    const store = tx.objectStore('fotos');
    for (const f of dados.fotos) {
      let blob: Blob;
      if (f.blobBase64) {
        const res = await fetch(f.blobBase64);
        blob = await res.blob();
      } else {
        blob = new Blob([], { type: 'image/jpeg' });
      }
      const { blobBase64, ...rest } = f;
      await store.add({ ...rest, blob } as FotoRecord);
      fotosCount++;
    }
    await tx.done;
  }

  if (dados.syncLog) {
    for (const entry of dados.syncLog) {
      await db.add('syncLog', entry as SyncLogEntry);
      syncCount++;
    }
  }

  return { fotos: fotosCount, syncLog: syncCount, blocos: blocosCount };
}

// --- Checar espaco do IndexedDB ---
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

// --- Export configuracao CSV ---
export async function exportarConfigCSV(): Promise<Blob> {
  const blocos = await carregarListaApartamentos();
  const header = 'Torre;Apartamentos\n';
  const rows = Object.entries(blocos)
    .map(([torre, aptos]) => `${torre};${aptos.join(',')}`)
    .join('\n');
  return new Blob(['\uFEFF' + header + rows + '\n'], { type: 'text/csv;charset=utf-8;' });
}

// --- Import configuracao CSV ---
export async function importarConfigCSV(text: string): Promise<{ blocos: number; aptos: number }> {
  const blocos: Record<string, string[]> = {};
  let aptos = 0;
  const lines = text.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    if (line.startsWith('Torre;')) continue;
    const sep = line.indexOf(';');
    if (sep === -1) continue;
    const torre = line.substring(0, sep).trim();
    const aptosList = line
      .substring(sep + 1)
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    if (torre && aptosList.length > 0) {
      blocos[torre] = aptosList;
      aptos += aptosList.length;
    }
  }
  if (Object.keys(blocos).length === 0) throw new Error('Nenhum bloco encontrado no CSV');
  await salvarListaApartamentos(blocos);
  return { blocos: Object.keys(blocos).length, aptos };
}

// --- Export configuracao XLSX ---
export async function exportarConfigXLSX(): Promise<Blob> {
  const XLSX = await import('xlsx');
  const blocos = await carregarListaApartamentos();
  const wb = XLSX.utils.book_new();
  const data: any[][] = [['Torre', 'Apartamentos']];
  for (const [torre, aptos] of Object.entries(blocos)) {
    data.push([torre, aptos.join(', ')]);
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 15 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Configuracao');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// --- Import configuracao XLSX ---
export async function importarConfigXLSX(file: File): Promise<{ blocos: number; aptos: number }> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
  const blocos: Record<string, string[]> = {};
  let aptos = 0;
  for (const row of rows) {
    if (!row || !row[0] || row[0] === 'Torre') continue;
    const torre = String(row[0]).trim();
    const aptosRaw = row[1] ? String(row[1]) : '';
    const aptosList = aptosRaw
      .split(/[,;]+/)
      .map((a) => a.trim())
      .filter(Boolean);
    if (torre && aptosList.length > 0) {
      blocos[torre] = aptosList;
      aptos += aptosList.length;
    }
  }
  if (Object.keys(blocos).length === 0) throw new Error('Nenhum bloco encontrado na planilha');
  await salvarListaApartamentos(blocos);
  return { blocos: Object.keys(blocos).length, aptos };
}
