import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AcaoDesenho } from './drawing';
import { normApto, normalizeBloco } from './utils';
import { getQualidadeFoto } from './settings';
import { comprimirImagemComWorker } from './imageProcessor';

export type Categoria = 'cyble_antes' | 'cyble_depois' | 'documento';

export interface ApartamentoStatus {
  bloco: string;
  apartamento: string;
  cybleAntesFeito: boolean;
  cybleDepoisFeito: boolean;
  qtdDocumentos: number;
  qtdFotos: number;
  notas?: string[];
  isConcluido?: boolean;
  qtdPendentes?: number;
  qtdSynced?: number;
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

export interface Agendamento {
  id?: number;
  bloco: string;
  apartamento: string;
  data: string;
  hora?: string;
  concluido: boolean;
  observacao?: string;
  criadoEm: number;
}

export interface NotaApto {
  id?: number;
  bloco: string;
  apartamento: string;
  texto: string;
  atualizadoEm: number;
}

export interface ComentarioApto {
  id?: number;
  bloco: string;
  apartamento: string;
  autor: string;
  texto: string;
  criadoEm: number;
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
  agendamentos: {
    key: number;
    value: Agendamento;
  };
  notas: {
    key: number;
    value: NotaApto;
    indexes: { 'by-bloco-apto': [string, string] };
  };
  comentarios: {
    key: number;
    value: ComentarioApto;
    indexes: { 'by-bloco-apto': [string, string] };
  };
}

let dbPromise: Promise<IDBPDatabase<VistoriaDB>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<VistoriaDB>('vistoria-cyble', 4, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('fotos', { keyPath: 'id', autoIncrement: true });
          db.createObjectStore('config');
        }
        if (oldVersion < 2) {
          db.createObjectStore('syncLog', { keyPath: 'id', autoIncrement: true });
        }
        if (oldVersion < 3) {
          db.createObjectStore('agendamentos', { keyPath: 'id', autoIncrement: true });
        }
        if (oldVersion < 4) {
          const notasStore = db.createObjectStore('notas', { keyPath: 'id', autoIncrement: true });
          notasStore.createIndex('by-bloco-apto', ['bloco', 'apartamento']);
          const comentariosStore = db.createObjectStore('comentarios', { keyPath: 'id', autoIncrement: true });
          comentariosStore.createIndex('by-bloco-apto', ['bloco', 'apartamento']);
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

export async function atualizarGpsFoto(bloco: string, apartamento: string, categoria: string, gps: { lat: number; lng: number }) {
  const db = await getDb();
  const normA = normApto(apartamento);
  const letter = bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
  const isSingleLetter = letter.length === 1 && /^[A-H]$/.test(letter);
  // Use cursor to find most recent photo matching criteria
  let last: FotoRecord | null = null;
  let cursor = await db.transaction('fotos', 'readonly').store.openCursor();
  while (cursor) {
    const f = cursor.value;
    const fLetter = f.bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const blocoMatch = isSingleLetter ? fLetter === letter : f.bloco === bloco;
    if (blocoMatch && normApto(f.apartamento) === normA && f.categoria === categoria) {
      if (!last || f.timestamp > last.timestamp) {
        last = f;
      }
    }
    cursor = await cursor.continue();
  }
  if (last && last.id) {
    await db.put('fotos', { ...last, gps }, last.id);
  }
}

export async function fotosDoApartamento(bloco: string, apartamento: string) {
  const db = await getDb();
  const normA = normApto(apartamento);
  const letter = bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
  const isSingleLetter = letter.length === 1 && /^[A-H]$/.test(letter);
  // Use cursor to avoid loading ALL photos into memory
  const result: FotoRecord[] = [];
  let cursor = await db.transaction('fotos', 'readonly').store.openCursor();
  while (cursor) {
    const f = cursor.value;
    const fLetter = f.bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const blocoMatch = isSingleLetter ? fLetter === letter : f.bloco === bloco;
    if (blocoMatch && normApto(f.apartamento) === normA) {
      result.push(f);
    }
    cursor = await cursor.continue();
  }
  return result;
}

export async function fotosPendentes() {
  const db = await getDb();
  // Use cursor to avoid loading ALL photo blobs into memory
  const result: FotoRecord[] = [];
  let cursor = await db.transaction('fotos', 'readonly').store.openCursor();
  while (cursor) {
    if (!cursor.value.synced) {
      result.push(cursor.value);
    }
    cursor = await cursor.continue();
  }
  return result;
}

export async function fotosPendentesCount(): Promise<number> {
  const db = await getDb();
  let count = 0;
  let cursor = await db.transaction('fotos', 'readonly').store.openCursor();
  while (cursor) {
    if (!cursor.value.synced) count++;
    cursor = await cursor.continue();
  }
  return count;
}

export async function deletarFoto(id: number) {
  const db = await getDb();
  await db.delete('fotos', id);
}

export async function deletarFotosApartamento(bloco: string, apartamento: string): Promise<number> {
  const db = await getDb();
  const bNorm = normalizeBloco(bloco);
  const aNorm = normApto(apartamento);
  const ids: number[] = [];
  let cursor = await db.transaction('fotos', 'readonly').store.openCursor();
  while (cursor) {
    const f = cursor.value;
    if (normalizeBloco(f.bloco) === bNorm && normApto(f.apartamento) === aNorm && f.id !== undefined) {
      ids.push(f.id);
    }
    cursor = await cursor.continue();
  }
  if (ids.length > 0) {
    const tx = db.transaction('fotos', 'readwrite');
    for (const id of ids) {
      await tx.store.delete(id);
    }
    await tx.done;
  }
  return ids.length;
}

export async function atualizarNota(id: number, nota: string) {
  const db = await getDb();
  const rec = await db.get('fotos', id);
  if (rec) {
    rec.nota = nota;
    await db.put('fotos', rec);
  }
}

export async function moverFotoCategoria(id: number, novaCategoria: Categoria) {
  const db = await getDb();
  const rec = await db.get('fotos', id);
  if (rec) {
    rec.categoria = novaCategoria;
    await db.put('fotos', rec);
  }
}

export async function reordenarFotos(ids: number[]) {
  const db = await getDb();
  const tx = db.transaction('fotos', 'readwrite');
  for (let i = 0; i < ids.length; i++) {
    const rec = await tx.store.get(ids[i]);
    if (rec) {
      rec.timestamp = Date.now() + i;
      await tx.store.put(rec);
    }
  }
  await tx.done;
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

export async function desmarcarSincronizada(id: number) {
  const db = await getDb();
  const rec = await db.get('fotos', id);
  if (rec) {
    rec.synced = false;
    rec.uploadUrl = undefined;
    await db.put('fotos', rec);
  }
}

export async function statusDeTodosApartamentos(
  lista: Record<string, string[]>
): Promise<ApartamentoStatus[]> {
  const db = await getDb();
  const concluidos = await carregarConcluidos();

  // Build letter-to-full-name map for normalization
  const letterToFull = new Map<string, string>();
  for (const blocoNome of Object.keys(lista)) {
    const match = blocoNome.match(/([A-H])$/i);
    if (match) letterToFull.set(match[1].toUpperCase(), blocoNome);
  }

  // Use cursor to avoid loading all blobs into memory
  const fotosMap = new Map<string, { bloco: string; apartamento: string; categoria: Categoria; nota?: string; synced: boolean; uploadUrl?: string }[]>();
  let cursor = await db.transaction('fotos', 'readonly').store.openCursor();
  while (cursor) {
    const f = cursor.value;
    // Normalize bloco to match lista keys
    let blocoKey = f.bloco;
    const letter = blocoKey.replace(/^Torre\s+/i, '').trim();
    if (letter.length === 1 && /^[A-H]$/i.test(letter)) {
      blocoKey = letterToFull.get(letter.toUpperCase()) || blocoKey;
    }
    const key = `${blocoKey}__${normApto(f.apartamento)}`;
    const arr = fotosMap.get(key) || [];
    arr.push({ bloco: blocoKey, apartamento: f.apartamento, categoria: f.categoria, nota: f.nota, synced: f.synced, uploadUrl: f.uploadUrl });
    fotosMap.set(key, arr);
    cursor = await cursor.continue();
  }

  const result: ApartamentoStatus[] = [];
  for (const bloco of Object.keys(lista)) {
    const concluidosBloco = new Set(concluidos[bloco] || []);
    for (const apto of lista[bloco]) {
      const key = `${bloco}__${normApto(apto)}`;
      const fotos = fotosMap.get(key) || [];
      const isConcluido = concluidosBloco.has(apto);
      const notas = fotos.map((f) => f.nota).filter((n): n is string => !!n && n.trim().length > 0);
      const qtdPendentes = fotos.filter((f) => !f.synced).length;
      const qtdSynced = fotos.filter((f) => f.synced).length;
      result.push({
        bloco,
        apartamento: apto,
        cybleAntesFeito: isConcluido || fotos.some((f) => f.categoria === 'cyble_antes'),
        cybleDepoisFeito: isConcluido || fotos.some((f) => f.categoria === 'cyble_depois'),
        qtdDocumentos: fotos.filter((f) => f.categoria === 'documento').length,
        qtdFotos: fotos.length,
        notas: notas.length > 0 ? notas : undefined,
        isConcluido,
        qtdPendentes,
        qtdSynced,
      });
    }
  }
  return result;
}

// --- Compressao de imagem ---
const MAX_IMAGE_WIDTH_DEFAULT = 2560;
const MAX_IMAGE_WIDTH_FULL = 4096;
const QUALIDADE_MAP: Record<string, number> = { '50': 0.50, '75': 0.75, '90': 0.90, '100': 1.0 };

function loadImageFromBlob(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let settled = false;
    const cleanup = () => { URL.revokeObjectURL(img.src); };

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('Image load timeout'));
      }
    }, 15000);

    img.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve(img);
      }
    };
    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cleanup();
        reject(new Error('Failed to load image'));
      }
    };
    img.src = URL.createObjectURL(file);
  });
}

function getExifOrientation(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const timer = setTimeout(() => {
      try { reader.abort(); } catch {}
      resolve(1);
    }, 8000);
    reader.onload = () => {
      clearTimeout(timer);
      try {
        const view = new DataView(reader.result as ArrayBuffer);
        if (view.getUint16(0, false) !== 0xFFD8) { resolve(1); return; }
        let offset = 2;
        while (offset < view.byteLength - 2) {
          const marker = view.getUint16(offset, false);
          offset += 2;
          if (marker === 0xFFE1) {
            const length = view.getUint16(offset, false);
            if (view.getUint32(offset + 2, false) === 0x45786966) {
              const tiffOffset = offset + 8;
              const bigEndian = view.getUint16(tiffOffset, false) === 0x4D4D;
              const ifdOffset = view.getUint32(tiffOffset + 4, bigEndian) + tiffOffset;
              const numEntries = view.getUint16(ifdOffset, bigEndian);
              for (let i = 0; i < numEntries; i++) {
                const entryOffset = ifdOffset + 2 + i * 12;
                if (entryOffset + 12 > view.byteLength) break;
                if (view.getUint16(entryOffset, bigEndian) === 0x0112) {
                  resolve(view.getUint16(entryOffset + 8, bigEndian));
                  return;
                }
              }
            }
            offset += length;
          } else if ((marker & 0xFF00) === 0xFF00) {
            offset += view.getUint16(offset, false);
          } else {
            break;
          }
        }
        resolve(1);
      } catch {
        resolve(1);
      }
    };
    reader.onerror = () => { clearTimeout(timer); resolve(1); };
    reader.readAsArrayBuffer(file.slice(0, 65536));
  });
}

function drawImageWithOrientation(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  img: HTMLImageElement,
  orientation: number,
  dw: number,
  dh: number
) {
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  ctx.save();
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, dw, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, dw, dh); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, dh); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); ctx.scale(dw / sh, dh / sw); ctx.drawImage(img, 0, 0, sh, sw); ctx.restore(); return;
    case 6: ctx.transform(0, 1, -1, 0, dw, 0); ctx.scale(dw / sh, dh / sw); ctx.drawImage(img, 0, 0, sh, sw); ctx.restore(); return;
    case 7: ctx.transform(0, -1, -1, 0, dw, dh); ctx.scale(dw / sh, dh / sw); ctx.drawImage(img, 0, 0, sh, sw); ctx.restore(); return;
    case 8: ctx.transform(0, -1, 1, 0, 0, dh); ctx.scale(dw / sh, dh / sw); ctx.drawImage(img, 0, 0, sh, sw); ctx.restore(); return;
  }
  ctx.drawImage(img, 0, 0, dw, dh);
  ctx.restore();
}

export async function comprimirImagemLocal(
  file: File
): Promise<Blob> {
  const [img, orientation] = await Promise.all([loadImageFromBlob(file), getExifOrientation(file)]);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const isRotated = orientation >= 5;
  const realW = isRotated ? srcH : srcW;
  const realH = isRotated ? srcW : srcH;
  const qualidade = QUALIDADE_MAP[getQualidadeFoto()] ?? 0.75;
  // When quality is 100%, skip scaling entirely to preserve original resolution
  const w = qualidade >= 1.0 ? realW : Math.round(realW * Math.min(1, MAX_IMAGE_WIDTH_DEFAULT / Math.max(realW, realH)));
  const h = qualidade >= 1.0 ? realH : Math.round(realH * Math.min(1, MAX_IMAGE_WIDTH_DEFAULT / Math.max(realW, realH)));
  // OffscreenCanvas fallback: use regular canvas on older browsers/iOS
  const isOffscreen = typeof OffscreenCanvas !== 'undefined';
  const rawCanvas = isOffscreen ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  if (!isOffscreen) { (rawCanvas as HTMLCanvasElement).width = w; (rawCanvas as HTMLCanvasElement).height = h; }
  const canvas = rawCanvas as unknown as OffscreenCanvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Nao foi possivel criar canvas (getContext retornou null)');
  drawImageWithOrientation(ctx, img, orientation, w, h);

  const BLOB_TIMEOUT_MS = 15000;
  // convertToBlob only on OffscreenCanvas; toBlob on regular canvas fallback
  if (isOffscreen) {
    return Promise.race([
      canvas.convertToBlob({ type: 'image/jpeg', quality: qualidade }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Canvas convertToBlob timeout')), BLOB_TIMEOUT_MS)),
    ]);
  }
  // Fallback: wrap HTMLCanvasElement.toBlob in a Promise
  return Promise.race([
    new Promise<Blob>((resolve, reject) => {
      (rawCanvas as HTMLCanvasElement).toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
        'image/jpeg',
        qualidade,
      );
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Canvas toBlob timeout')), BLOB_TIMEOUT_MS)),
  ]);
}

export async function comprimirImagem(file: File): Promise<Blob> {
  return comprimirImagemComWorker(file, comprimirImagemLocal);
}

// --- Marca d'agua (aplicada no save final) ---
export async function aplicarMarcaDagua(
  blob: Blob,
  texto: string,
  bloco?: string,
  apartamento?: string
): Promise<Blob> {
  // Convert Blob to File for loadImageFromBlob
  const file = new File([blob], 'foto.jpg', { type: blob.type || 'image/jpeg' });
  const img = await loadImageFromBlob(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const isOffscreen = typeof OffscreenCanvas !== 'undefined';
  const rawCanvas = isOffscreen ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  if (!isOffscreen) { (rawCanvas as HTMLCanvasElement).width = w; (rawCanvas as HTMLCanvasElement).height = h; }
  const canvas = rawCanvas as unknown as OffscreenCanvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return blob; // fallback: return original

  // Draw image
  ctx.drawImage(img, 0, 0);

  // Draw watermark
  const fontSize = Math.max(16, Math.round(h * 0.025));
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textBaseline = 'bottom';

  const lines: string[] = [];
  if (bloco && apartamento) {
    lines.push(`${bloco} - Apto ${apartamento}`);
  }
  lines.push(texto);

  const padding = Math.round(w * 0.015);
  const lineHeight = fontSize + 6;
  const blockH = lines.length * lineHeight + padding * 2;
  const blockW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2;

  const x = w - blockW - padding;
  const y = h - blockH - padding;

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.roundRect(x, y, blockW, blockH, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  lines.forEach((line, i) => {
    ctx.fillText(line, x + padding, y + padding + lineHeight * (i + 1) - 4);
  });

  // Export at quality 1.0 (no recompression, just watermark overlay)
  if (isOffscreen) {
    return canvas.convertToBlob({ type: 'image/jpeg', quality: 1.0 });
  }
  return new Promise<Blob>((resolve, reject) => {
    (rawCanvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
      'image/jpeg',
      1.0,
    );
  });
}

// --- Ultimas fotos (para acesso rapido) ---
export async function ultimasFotos(limite = 10): Promise<FotoRecord[]> {
  const db = await getDb();
  // Use cursor to avoid loading all blobs into memory; collect all, sort, take top N
  // Note: without a timestamp index, we must scan all records
  const result: FotoRecord[] = [];
  let cursor = await db.transaction('fotos', 'readonly').store.openCursor();
  while (cursor) {
    result.push(cursor.value);
    cursor = await cursor.continue();
  }
  result.sort((a, b) => b.timestamp - a.timestamp);
  return result.slice(0, limite);
}

// --- Todas as fotos (para relatorios) ---
export async function obterTodasFotos(): Promise<FotoRecord[]> {
  const db = await getDb();
  return db.getAll('fotos');
}

// --- Historico de sincronizacao ---
export async function registrarSync(entry: Omit<SyncLogEntry, 'id'>) {
  const db = await getDb();
  await db.add('syncLog', entry as SyncLogEntry);
}

// --- Agendamentos ---
export async function criarAgendamento(ag: Omit<Agendamento, 'id' | 'criadoEm'>): Promise<number> {
  const db = await getDb();
  return db.add('agendamentos', { ...ag, criadoEm: Date.now() } as Agendamento);
}

export async function listarAgendamentos(): Promise<Agendamento[]> {
  const db = await getDb();
  return db.getAll('agendamentos');
}

export async function toggleConcluidoAgendamento(id: number) {
  const db = await getDb();
  const ag = await db.get('agendamentos', id);
  if (ag) {
    ag.concluido = !ag.concluido;
    await db.put('agendamentos', ag);
  }
}

export async function excluirAgendamento(id: number) {
  const db = await getDb();
  await db.delete('agendamentos', id);
}

export async function editarAgendamento(id: number, dados: { data?: string; observacao?: string; apartamento?: string; hora?: string }) {
  const db = await getDb();
  const ag = await db.get('agendamentos', id);
  if (ag) {
    if (dados.data !== undefined) ag.data = dados.data;
    if (dados.observacao !== undefined) ag.observacao = dados.observacao;
    if (dados.apartamento !== undefined) ag.apartamento = dados.apartamento;
    if (dados.hora !== undefined) ag.hora = dados.hora;
    await db.put('agendamentos', ag);
  }
}

export async function excluirAgendamentosConcluidos(): Promise<number> {
  const db = await getDb();
  // Use cursor + batch delete in single transaction
  const ids: number[] = [];
  let cursor = await db.transaction('agendamentos', 'readonly').store.openCursor();
  while (cursor) {
    if (cursor.value.concluido && cursor.value.id !== undefined) {
      ids.push(cursor.value.id);
    }
    cursor = await cursor.continue();
  }
  if (ids.length > 0) {
    const tx = db.transaction('agendamentos', 'readwrite');
    for (const id of ids) tx.store.delete(id);
    await tx.done;
  }
  return ids.length;
}

export async function salvarAgendamentosLote(agendamentos: Agendamento[]): Promise<number> {
  const db = await getDb();
  const tx = db.transaction('agendamentos', 'readwrite');
  const existing = await tx.store.getAll();
  const seen = new Set(existing.map((e) => `${normalizeBloco(e.bloco)}__${normApto(e.apartamento)}__${e.data}`));
  let count = 0;
  for (const ag of agendamentos) {
    const key = `${normalizeBloco(ag.bloco)}__${normApto(ag.apartamento)}__${ag.data}`;
    if (!seen.has(key)) {
      const { id: _id, ...rest } = ag;
      await tx.store.add({ ...rest, criadoEm: rest.criadoEm || Date.now() } as Agendamento);
      seen.add(key);
      count++;
    }
  }
  await tx.done;
  return count;
}

// --- Backup / Restore ---
const BACKUP_BATCH_SIZE = 50;

export async function backupDados(): Promise<Blob> {
  const db = await getDb();
  const fotos = await db.getAll('fotos');
  const syncLog = await db.getAll('syncLog');
  const blocos = await db.get('config', 'blocos');
  const concluidos = await db.get('config', 'concluidos');
  const agendamentos = await db.getAll('agendamentos');
  const notas = await db.getAll('notas');
  const comentarios = await db.getAll('comentarios');

  // Process photos in batches to avoid OOM on large datasets
  const fotosSerializadas: { bloco: string; apartamento: string; categoria: string; timestamp: number; synced: boolean; uploadUrl?: string; nota?: string; gps?: { lat: number; lng: number }; blobBase64: string }[] = [];
  for (let i = 0; i < fotos.length; i += BACKUP_BATCH_SIZE) {
    const batch = fotos.slice(i, i + BACKUP_BATCH_SIZE);
    const processed = await Promise.all(
      batch.map(async (f) => {
        let blobBase64 = '';
        if (f.blob && f.blob.size > 0 && !f.synced) {
          blobBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(f.blob);
          });
        }
        return { bloco: f.bloco, apartamento: f.apartamento, categoria: f.categoria, timestamp: f.timestamp, synced: f.synced, uploadUrl: f.uploadUrl, nota: f.nota, gps: f.gps, blobBase64 };
      })
    );
    fotosSerializadas.push(...processed);
  }

  const dados = {
    versao: 4,
    tipo: 'completo',
    data: new Date().toISOString(),
    fotos: fotosSerializadas,
    syncLog,
    blocos,
    concluidos,
    agendamentos,
    notas,
    comentarios,
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

  // Process in batches to avoid OOM
  const fotosSerializadas: { bloco: string; apartamento: string; categoria: string; timestamp: number; synced: boolean; uploadUrl?: string; nota?: string; gps?: { lat: number; lng: number }; blobBase64: string }[] = [];
  for (let i = 0; i < fotos.length; i += BACKUP_BATCH_SIZE) {
    const batch = fotos.slice(i, i + BACKUP_BATCH_SIZE);
    const processed = await Promise.all(
      batch.map(async (f) => {
        let blobBase64 = '';
        if (f.blob && f.blob.size > 0) {
          blobBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(f.blob);
          });
        }
        return { bloco: f.bloco, apartamento: f.apartamento, categoria: f.categoria, timestamp: f.timestamp, synced: f.synced, uploadUrl: f.uploadUrl, nota: f.nota, gps: f.gps, blobBase64 };
      })
    );
    fotosSerializadas.push(...processed);
  }

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
  let dados: unknown;
  try {
    dados = JSON.parse(json);
  } catch {
    throw new Error('Arquivo JSON invalido');
  }

  // Basic schema validation
  if (!dados || typeof dados !== 'object') {
    throw new Error('Formato de backup invalido: dados nao sao um objeto');
  }
  const d = dados as Record<string, unknown>;
  if (d.tipo && typeof d.tipo !== 'string') {
    throw new Error('Formato de backup invalido: tipo invalido');
  }
  if (d.blocos && (typeof d.blocos !== 'object' || Array.isArray(d.blocos))) {
    throw new Error('Formato de backup invalido: blocos invalidos');
  }
  if (d.fotos && !Array.isArray(d.fotos)) {
    throw new Error('Formato de backup invalido: fotos devem ser um array');
  }
  const db = await getDb();
  const backupData = d as {
    tipo?: string;
    blocos?: Record<string, string[]>;
    lista?: Record<string, string[]>;
    config?: Record<string, string[]>;
    concluidos?: Record<string, string[]>;
    agendamentos?: Array<Record<string, unknown>>;
    notas?: Array<Record<string, unknown>>;
    comentarios?: Array<Record<string, unknown>>;
    fotos?: Array<Record<string, unknown> & { blobBase64?: string }>;
    syncLog?: Array<Record<string, unknown>>;
  };
  const tipo = backupData.tipo || 'completo';

  let blocosCount = 0;
  let fotosCount = 0;
  let syncCount = 0;

  if (tipo === 'configuracao') {
    if (backupData.blocos && typeof backupData.blocos === 'object' && !Array.isArray(backupData.blocos)) {
      await db.put('config', backupData.blocos, 'blocos');
      blocosCount = Object.keys(backupData.blocos).length;
    }
    return { fotos: 0, syncLog: 0, blocos: blocosCount };
  }

  // Dry-run validation: validate ALL photos before clearing any data
  if (backupData.fotos && backupData.fotos.length > 0) {
    for (let i = 0; i < backupData.fotos.length; i++) {
      const f = backupData.fotos[i];
      if (!f.bloco || !f.apartamento || !f.categoria) {
        throw new Error(`Foto #${i + 1} invalida: campos obrigatorios ausentes (bloco, apartamento, categoria)`);
      }
      if (f.blobBase64 && typeof f.blobBase64 === 'string') {
        // Validate base64 format
        if (!f.blobBase64.startsWith('data:image/') && !f.blobBase64.startsWith('data:application/')) {
          throw new Error(`Foto #${i + 1}: formato blobBase64 invalido`);
        }
      }
    }
  }

  // Only clear AFTER validation passes
  // Use a single transaction for clear + restore to prevent data loss on crash
  const tx = db.transaction(['fotos', 'syncLog', 'config', 'agendamentos', 'notas', 'comentarios'], 'readwrite');
  
  // Clear stores within the transaction
  await Promise.all([
    tx.objectStore('fotos').clear(),
    tx.objectStore('syncLog').clear(),
    tx.objectStore('config').clear(),
    tx.objectStore('agendamentos').clear(),
    tx.objectStore('notas').clear(),
    tx.objectStore('comentarios').clear(),
  ]);

  if (backupData.blocos && typeof backupData.blocos === 'object' && !Array.isArray(backupData.blocos)) {
    tx.objectStore('config').put(backupData.blocos, 'blocos');
    blocosCount = Object.keys(backupData.blocos).length;
  } else if (backupData.lista && typeof backupData.lista === 'object' && !Array.isArray(backupData.lista)) {
    tx.objectStore('config').put(backupData.lista, 'blocos');
    blocosCount = Object.keys(backupData.lista).length;
  } else if (backupData.config && typeof backupData.config === 'object' && !Array.isArray(backupData.config)) {
    tx.objectStore('config').put(backupData.config, 'blocos');
    blocosCount = Object.keys(backupData.config).length;
  }

  if (backupData.concluidos && typeof backupData.concluidos === 'object' && !Array.isArray(backupData.concluidos)) {
    tx.objectStore('config').put(backupData.concluidos, 'concluidos');
  }

  if (backupData.fotos) {
    const fotoStore = tx.objectStore('fotos');
    for (const f of backupData.fotos) {
      let blob: Blob;
      if (f.blobBase64) {
        const res = await fetch(f.blobBase64);
        blob = await res.blob();
      } else {
        blob = new Blob([], { type: 'image/jpeg' });
      }
      const { blobBase64, ...rest } = f;
      await fotoStore.add({ ...rest, blob } as FotoRecord);
      fotosCount++;
    }
  }

  if (backupData.syncLog) {
    const logStore = tx.objectStore('syncLog');
    for (const entry of backupData.syncLog) {
      await logStore.add(entry as unknown as SyncLogEntry);
      syncCount++;
    }
  }

  if (backupData.agendamentos && Array.isArray(backupData.agendamentos)) {
    const agStore = tx.objectStore('agendamentos');
    for (const ag of backupData.agendamentos) {
      const { id: _id, ...rest } = ag;
      await agStore.add(rest as unknown as Agendamento);
    }
  }

  if (backupData.notas && Array.isArray(backupData.notas)) {
    const notasStore = tx.objectStore('notas');
    for (const n of backupData.notas) {
      const { id: _id, ...rest } = n;
      await notasStore.add(rest as unknown as NotaApto);
    }
  }

  if (backupData.comentarios && Array.isArray(backupData.comentarios)) {
    const comStore = tx.objectStore('comentarios');
    for (const c of backupData.comentarios) {
      const { id: _id, ...rest } = c;
      await comStore.add(rest as unknown as ComentarioApto);
    }
  }

  await tx.done;
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

// --- Concluidos (lista de aptos ja trocados sem fotos) ---
// Cache for concluidos to avoid repeated API calls
let _concluidosCache: Record<string, string[]> | null = null;
let _concluidosCacheTime = 0;
const CONCLUIDOS_CACHE_TTL = 30_000; // 30 seconds

export async function salvarConcluidos(lista: Record<string, string[]>) {
  const db = await getDb();
  await db.put('config', lista, 'concluidos');
  _concluidosCache = lista;
  _concluidosCacheTime = Date.now();
  syncConcluidosToAPI(lista).catch((err) => console.warn('syncConcluidosToAPI error:', err));
}

export async function desmarcarConcluidoLocal(bloco: string, apto: string) {
  const db = await getDb();
  const bNorm = normalizeBloco(bloco);
  const aNorm = normApto(apto);
  const concluidos = (await db.get('config', 'concluidos')) ?? {};
  if (concluidos[bNorm]) {
    concluidos[bNorm] = concluidos[bNorm].filter((a: string) => normApto(a) !== aNorm);
    await db.put('config', concluidos, 'concluidos');
    _concluidosCache = concluidos;
    _concluidosCacheTime = Date.now();
    syncConcluidosToAPI(concluidos).catch((err) => console.warn('syncConcluidosToAPI error:', err));
  }
  await deletarFotosApartamento(bloco, apto);
}

export async function carregarConcluidos(): Promise<Record<string, string[]>> {
  // Return cached data if fresh
  if (_concluidosCache && Date.now() - _concluidosCacheTime < CONCLUIDOS_CACHE_TTL) {
    return _concluidosCache;
  }

  const db = await getDb();
  const local = (await db.get('config', 'concluidos')) ?? {};

  // When online, fetch remote and merge without resurrecting deleted local items
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const { authFetch } = await import('@/lib/api');
      const resp = await authFetch('/api/concluidos');
      if (resp.ok) {
        const remote = await resp.json();
        const merged: Record<string, string[]> = { ...remote };
        // If local has entries for blocks, local state takes precedence so unmarking is preserved
        for (const [bloco, aptos] of Object.entries(local)) {
          merged[bloco] = aptos as string[];
        }
        await db.put('config', merged, 'concluidos');
        _concluidosCache = merged;
        _concluidosCacheTime = Date.now();
        return merged;
      }
    } catch {}
  }

  // Offline: return local data
  _concluidosCache = local;
  _concluidosCacheTime = Date.now();
  return local;
}

let _syncConcluidosLock = false;

async function syncConcluidosToAPI(lista: Record<string, string[]>) {
  if (_syncConcluidosLock) return;
  _syncConcluidosLock = true;
  try {
    const { authFetch } = await import('@/lib/api');
    await authFetch('/api/concluidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lista),
    });
  } catch (err) {
    console.warn('syncConcluidosToAPI failed:', err);
  } finally {
    _syncConcluidosLock = false;
  }
}

export async function limparConcluidos() {
  const db = await getDb();
  await db.delete('config', 'concluidos');
  _concluidosCache = {};
  _concluidosCacheTime = Date.now();
  try {
    const { authFetch } = await import('@/lib/api');
    await authFetch('/api/concluidos', { method: 'DELETE' });
  } catch (err) {
    console.warn('syncConcluidosToAPI DELETE error:', err);
  }
}

/**
 * Retorna todos os apartamentos concluídos consolidados:
 * Une os concluídos marcados manualmente (ou importados) com os apartamentos
 * que possuem as fotos obrigatórias (cyble_antes E cyble_depois).
 */
export async function carregarTodosConcluidosConsolidados(): Promise<Record<string, string[]>> {
  const db = await getDb();
  const manual = await carregarConcluidos();
  const mapa: Record<string, Set<string>> = {};

  // 1. Concluídos manuais / importados
  for (const [bloco, aptos] of Object.entries(manual)) {
    const bNorm = normalizeBloco(bloco);
    if (!mapa[bNorm]) mapa[bNorm] = new Set();
    for (const a of aptos) {
      const aNorm = normApto(a);
      if (aNorm) mapa[bNorm].add(aNorm);
    }
  }

  // 2. Concluídos via fotos (tem cyble_antes e cyble_depois)
  const antesMap = new Set<string>();
  const depoisMap = new Set<string>();

  let cursor = await db.transaction('fotos', 'readonly').store.openCursor();
  while (cursor) {
    const f = cursor.value;
    const bNorm = normalizeBloco(f.bloco);
    const aNorm = normApto(f.apartamento);
    if (aNorm) {
      const key = `${bNorm}__${aNorm}`;
      if (f.categoria === 'cyble_antes') antesMap.add(key);
      if (f.categoria === 'cyble_depois') depoisMap.add(key);
    }
    cursor = await cursor.continue();
  }

  // Se tem antes e depois, inclui nos concluídos
  for (const key of antesMap) {
    if (depoisMap.has(key)) {
      const [bloco, apto] = key.split('__');
      if (!mapa[bloco]) mapa[bloco] = new Set();
      mapa[bloco].add(apto);
    }
  }

  // 3. Concluídos via fotos na nuvem (API /api/fotos)
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const { authFetch } = await import('@/lib/api');
      const resp = await authFetch('/api/fotos');
      if (resp.ok) {
        const data = await resp.json();
        const fotos: Array<{ bloco: string; apartamento: string }> = data.fotos || [];
        for (const f of fotos) {
          const bNorm = normalizeBloco(f.bloco);
          const aNorm = normApto(f.apartamento);
          if (bNorm && aNorm) {
            if (!mapa[bNorm]) mapa[bNorm] = new Set();
            mapa[bNorm].add(aNorm);
          }
        }
      }
    } catch {}
  }

  const result: Record<string, string[]> = {};
  for (const [bloco, set] of Object.entries(mapa)) {
    result[bloco] = Array.from(set).sort((a, b) => Number(a) - Number(b));
  }
  return result;
}

export async function importarConcluidosTxt(text: string): Promise<{ blocos: number; aptos: number }> {
  const mapa: Record<string, Set<string>> = {};
  const lines = text.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    // Regex flexível: Torre A-APTO0101, Torre A - Apto 101, Bloco B 101, Torre A 101
    const match = line.trim().match(/^(?:Torre|Bloco)?\s*([A-Za-z0-9]+)\s*[-–—/]?\s*(?:APTO|APT)?\s*(\d+)$/i);
    if (!match) continue;
    const bloco = `Torre ${match[1].toUpperCase()}`;
    const apto = normApto(match[2]);
    if (!apto) continue;
    if (!mapa[bloco]) mapa[bloco] = new Set();
    mapa[bloco].add(apto);
  }
  if (Object.keys(mapa).length === 0) throw new Error('Nenhum apartamento encontrado no arquivo (ex: "Torre A-APTO0077")');
  const existing = await carregarConcluidos();
  const merged: Record<string, string[]> = {};
  let aptos = 0;
  for (const [bloco, aptosSet] of Object.entries(mapa)) {
    const prev = new Set(existing[bloco] || []);
    for (const a of aptosSet) prev.add(a);
    merged[bloco] = [...prev].sort((a, b) => Number(a) - Number(b));
    aptos += merged[bloco].length;
  }
  for (const [bloco, aptosList] of Object.entries(existing)) {
    if (!merged[bloco]) merged[bloco] = aptosList;
  }
  await salvarConcluidos(merged);
  return { blocos: Object.keys(merged).length, aptos };
}

// --- Export concluidos TXT ---
export async function exportarConcluidosTxt(): Promise<Blob> {
  const concluidos = await carregarTodosConcluidosConsolidados();
  const lines: string[] = [];
  for (const [bloco, aptos] of Object.entries(concluidos)) {
    const match = bloco.match(/([A-Za-z0-9]+)$/);
    const letter = match ? match[1].toUpperCase() : bloco.replace(/^Torre\s+/i, '').trim();
    for (const a of aptos) {
      lines.push(`Torre ${letter}-APTO${a.padStart(4, '0')}`);
    }
  }
  lines.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return new Blob([lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
}

// --- Export configuracao CSV ---
export async function exportarConfigCSV(): Promise<Blob> {
  const blocos = await carregarListaApartamentos();
  const concluidos = await carregarTodosConcluidosConsolidados();
  const agendamentos = await listarAgendamentos();

  let content = '\uFEFF# CONFIGURACAO_TORRES\nTorre;Apartamentos\n';
  for (const [torre, aptos] of Object.entries(blocos)) {
    content += `${torre};${aptos.join(',')}\n`;
  }

  content += '\n# CONCLUIDOS\nTorre;Apartamentos\n';
  for (const [torre, aptos] of Object.entries(concluidos)) {
    content += `${torre};${aptos.join(',')}\n`;
  }

  content += '\n# AGENDAMENTOS\nTorre;Apartamento;Data;Hora;Observacao;Concluido\n';
  for (const ag of agendamentos) {
    content += `${ag.bloco};${ag.apartamento};${ag.data};${ag.hora || ''};${ag.observacao || ''};${ag.concluido ? '1' : '0'}\n`;
  }

  return new Blob([content], { type: 'text/csv;charset=utf-8;' });
}

// --- Import configuracao CSV ---
export async function importarConfigCSV(text: string): Promise<{ blocos: number; aptos: number; concluidos?: number; agendamentos?: number }> {
  const blocos: Record<string, string[]> = {};
  const concluidos: Record<string, Set<string>> = {};
  const agendamentos: Agendamento[] = [];
  let aptos = 0;

  type Section = 'blocos' | 'concluidos' | 'agendamentos';
  let currentSection: Section = 'blocos';

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith('# CONFIGURACAO_TORRES')) {
      currentSection = 'blocos';
      continue;
    }
    if (line.startsWith('# CONCLUIDOS')) {
      currentSection = 'concluidos';
      continue;
    }
    if (line.startsWith('# AGENDAMENTOS')) {
      currentSection = 'agendamentos';
      continue;
    }
    if (line.startsWith('Torre;')) continue;

    if (currentSection === 'blocos') {
      const sep = line.indexOf(';');
      if (sep === -1) continue;
      const torre = normalizeBloco(line.substring(0, sep).trim());
      const aptosList = line
        .substring(sep + 1)
        .split(',')
        .map((a) => normApto(a.trim()))
        .filter(Boolean);
      const seen = new Set<string>();
      const deduped = aptosList.filter((a) => { if (seen.has(a)) return false; seen.add(a); return true; });
      if (torre && deduped.length > 0) {
        blocos[torre] = deduped;
        aptos += deduped.length;
      }
    } else if (currentSection === 'concluidos') {
      const sep = line.indexOf(';');
      if (sep === -1) continue;
      const torre = normalizeBloco(line.substring(0, sep).trim());
      const aptosList = line
        .substring(sep + 1)
        .split(',')
        .map((a) => normApto(a.trim()))
        .filter(Boolean);
      if (torre && aptosList.length > 0) {
        if (!concluidos[torre]) concluidos[torre] = new Set();
        for (const a of aptosList) concluidos[torre].add(a);
      }
    } else if (currentSection === 'agendamentos') {
      const parts = line.split(';');
      if (parts.length >= 3) {
        const [bloco, apto, data, hora, observacao, concluido] = parts;
        agendamentos.push({
          bloco: normalizeBloco(bloco),
          apartamento: normApto(apto),
          data,
          hora: hora || undefined,
          observacao: observacao || undefined,
          concluido: concluido === '1',
          criadoEm: Date.now(),
        });
      }
    }
  }

  if (Object.keys(blocos).length === 0) throw new Error('Nenhum bloco encontrado no CSV');
  await salvarListaApartamentos(blocos);

  let concluidosCount = 0;
  if (Object.keys(concluidos).length > 0) {
    const mergedConcluidos: Record<string, string[]> = {};
    for (const [t, s] of Object.entries(concluidos)) {
      mergedConcluidos[t] = Array.from(s).sort((a, b) => Number(a) - Number(b));
      concluidosCount += mergedConcluidos[t].length;
    }
    await salvarConcluidos(mergedConcluidos);
  }

  if (agendamentos.length > 0) {
    await salvarAgendamentosLote(agendamentos);
  }

  return { blocos: Object.keys(blocos).length, aptos, concluidos: concluidosCount, agendamentos: agendamentos.length };
}

// --- Export configuracao XLSX ---
export async function exportarConfigXLSX(): Promise<Blob> {
  const XLSX = await import('xlsx');
  const blocos = await carregarListaApartamentos();
  const concluidos = await carregarTodosConcluidosConsolidados();
  const agendamentos = await listarAgendamentos();

  const wb = XLSX.utils.book_new();

  // Aba 1: Apartamentos
  const dataBlocos: any[][] = [['Torre', 'Apartamentos']];
  for (const [torre, aptos] of Object.entries(blocos)) {
    dataBlocos.push([torre, aptos.join(', ')]);
  }
  const wsBlocos = XLSX.utils.aoa_to_sheet(dataBlocos);
  wsBlocos['!cols'] = [{ wch: 15 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsBlocos, 'Apartamentos');

  // Aba 2: Concluidos
  const dataConcluidos: any[][] = [['Torre', 'Apartamento']];
  for (const [torre, aptos] of Object.entries(concluidos)) {
    for (const apto of aptos) {
      dataConcluidos.push([torre, apto]);
    }
  }
  const wsConcluidos = XLSX.utils.aoa_to_sheet(dataConcluidos);
  wsConcluidos['!cols'] = [{ wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsConcluidos, 'Concluidos');

  // Aba 3: Agenda
  const dataAgenda: any[][] = [['Torre', 'Apartamento', 'Data', 'Hora', 'Observacao', 'Status']];
  for (const ag of agendamentos) {
    dataAgenda.push([
      ag.bloco,
      ag.apartamento,
      ag.data,
      ag.hora || '',
      ag.observacao || '',
      ag.concluido ? 'Concluido' : 'Pendente',
    ]);
  }
  const wsAgenda = XLSX.utils.aoa_to_sheet(dataAgenda);
  wsAgenda['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsAgenda, 'Agenda');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// --- Import configuracao XLSX ---
export async function importarConfigXLSX(file: File): Promise<{ blocos: number; aptos: number; concluidos?: number; agendamentos?: number }> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  // 1. Sheet de Apartamentos (ou a primeira aba)
  const sheetNameBlocos = wb.SheetNames.find((n) => /apartamento|config/i.test(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetNameBlocos];
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
  const blocos: Record<string, string[]> = {};
  let aptos = 0;
  for (const row of rows) {
    if (!row || !row[0] || row[0] === 'Torre') continue;
    const torre = normalizeBloco(String(row[0]).trim());
    const aptosRaw = row[1] ? String(row[1]) : '';
    const aptosList = aptosRaw
      .split(/[,;]+/)
      .map((a) => normApto(a.trim()))
      .filter(Boolean);
    const seenXlsx = new Set<string>();
    const dedupedXlsx = aptosList.filter((a) => { if (seenXlsx.has(a)) return false; seenXlsx.add(a); return true; });
    if (torre && dedupedXlsx.length > 0) {
      blocos[torre] = dedupedXlsx;
      aptos += dedupedXlsx.length;
    }
  }
  if (Object.keys(blocos).length === 0) throw new Error('Nenhum bloco encontrado na planilha');
  await salvarListaApartamentos(blocos);

  // 2. Sheet de Concluídos (se existir)
  let concluidosCount = 0;
  const sheetNameConcluidos = wb.SheetNames.find((n) => /concluid/i.test(n));
  if (sheetNameConcluidos) {
    const wsConc = wb.Sheets[sheetNameConcluidos];
    const concRows = XLSX.utils.sheet_to_json<any[]>(wsConc, { header: 1 });
    const concMap: Record<string, Set<string>> = {};
    for (const row of concRows) {
      if (!row || !row[0] || row[0] === 'Torre') continue;
      const torre = normalizeBloco(String(row[0]).trim());
      const apto = normApto(String(row[1] || '').trim());
      if (torre && apto) {
        if (!concMap[torre]) concMap[torre] = new Set();
        concMap[torre].add(apto);
      }
    }
    if (Object.keys(concMap).length > 0) {
      const merged: Record<string, string[]> = {};
      for (const [t, s] of Object.entries(concMap)) {
        merged[t] = Array.from(s).sort((a, b) => Number(a) - Number(b));
        concluidosCount += merged[t].length;
      }
      await salvarConcluidos(merged);
    }
  }

  // 3. Sheet de Agenda (se existir)
  let agendaCount = 0;
  const sheetNameAgenda = wb.SheetNames.find((n) => /agenda/i.test(n));
  if (sheetNameAgenda) {
    const wsAgenda = wb.Sheets[sheetNameAgenda];
    const agendaRows = XLSX.utils.sheet_to_json<any[]>(wsAgenda, { header: 1 });
    const ags: Agendamento[] = [];
    for (const row of agendaRows) {
      if (!row || !row[0] || row[0] === 'Torre') continue;
      const bloco = normalizeBloco(String(row[0]).trim());
      const apto = normApto(String(row[1] || '').trim());
      const data = String(row[2] || '').trim();
      if (bloco && apto && data) {
        ags.push({
          bloco,
          apartamento: apto,
          data,
          hora: row[3] ? String(row[3]).trim() : undefined,
          observacao: row[4] ? String(row[4]).trim() : undefined,
          concluido: String(row[5] || '').toLowerCase().includes('conclui'),
          criadoEm: Date.now(),
        });
      }
    }
    if (ags.length > 0) {
      agendaCount = await salvarAgendamentosLote(ags);
    }
  }

  return { blocos: Object.keys(blocos).length, aptos, concluidos: concluidosCount, agendamentos: agendaCount };
}

// --- Notas por Apartamento ---
// Helper: find nota by bloco/apartamento using cursor (avoids loading all)
async function findNota(bloco: string, apartamento: string): Promise<NotaApto | null> {
  const db = await getDb();
  const letter = bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
  const isSingleLetter = letter.length === 1 && /^[A-H]$/.test(letter);
  let cursor = await db.transaction('notas', 'readonly').store.openCursor();
  while (cursor) {
    const n = cursor.value;
    const nLetter = n.bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const blocoMatch = isSingleLetter ? nLetter === letter : n.bloco === bloco;
    if (blocoMatch && normApto(n.apartamento) === normApto(apartamento)) {
      return n;
    }
    cursor = await cursor.continue();
  }
  return null;
}

export async function salvarNotaApto(bloco: string, apartamento: string, texto: string): Promise<void> {
  const db = await getDb();
  const match = await findNota(bloco, apartamento);
  if (match?.id) {
    await db.put('notas', { ...match, texto, atualizadoEm: Date.now() });
  } else {
    await db.add('notas', { bloco, apartamento, texto, atualizadoEm: Date.now() });
  }
}

export async function obterNotaApto(bloco: string, apartamento: string): Promise<string> {
  const match = await findNota(bloco, apartamento);
  return match?.texto || '';
}

export async function excluirNotaApto(bloco: string, apartamento: string): Promise<void> {
  const db = await getDb();
  const match = await findNota(bloco, apartamento);
  if (match?.id) await db.delete('notas', match.id);
}

export async function salvarNotasLote(notas: Array<{ bloco: string; apartamento: string; texto: string }>): Promise<number> {
  const db = await getDb();
  const tx = db.transaction('notas', 'readwrite');
  let count = 0;
  for (const n of notas) {
    if (n.bloco && n.apartamento && n.texto) {
      await tx.store.add({ bloco: n.bloco, apartamento: n.apartamento, texto: n.texto, atualizadoEm: Date.now() });
      count++;
    }
  }
  await tx.done;
  return count;
}

export async function salvarComentariosLote(comentarios: Array<{ bloco: string; apartamento: string; autor: string; texto: string; criadoEm?: number }>): Promise<number> {
  const db = await getDb();
  const tx = db.transaction('comentarios', 'readwrite');
  let count = 0;
  for (const c of comentarios) {
    if (c.bloco && c.apartamento && c.texto) {
      await tx.store.add({ bloco: c.bloco, apartamento: c.apartamento, autor: c.autor || 'Admin', texto: c.texto, criadoEm: c.criadoEm || Date.now() });
      count++;
    }
  }
  await tx.done;
  return count;
}

// --- Comentarios por Apartamento ---
export async function adicionarComentario(bloco: string, apartamento: string, autor: string, texto: string): Promise<number> {
  const db = await getDb();
  return db.add('comentarios', { bloco, apartamento, autor, texto, criadoEm: Date.now() });
}

export async function obterComentarios(bloco: string, apartamento: string): Promise<ComentarioApto[]> {
  const db = await getDb();
  const letter = bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
  const isSingleLetter = letter.length === 1 && /^[A-H]$/.test(letter);
  // Use cursor to avoid loading ALL comments into memory
  const result: ComentarioApto[] = [];
  let cursor = await db.transaction('comentarios', 'readonly').store.openCursor();
  while (cursor) {
    const c = cursor.value;
    const cLetter = c.bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const blocoMatch = isSingleLetter ? cLetter === letter : c.bloco === bloco;
    if (blocoMatch && normApto(c.apartamento) === normApto(apartamento)) {
      result.push(c);
    }
    cursor = await cursor.continue();
  }
  return result;
}

/** Batch version: returns comment counts for all aptos in a block using a single DB read */
export async function contarComentariosBloco(bloco: string): Promise<Record<string, number>> {
  const db = await getDb();
  const letter = bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
  const isSingleLetter = letter.length === 1 && /^[A-H]$/.test(letter);
  const counts: Record<string, number> = {};
  // Use cursor to avoid loading ALL comments into memory
  let cursor = await db.transaction('comentarios', 'readonly').store.openCursor();
  while (cursor) {
    const c = cursor.value;
    const cLetter = c.bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const blocoMatch = isSingleLetter ? cLetter === letter : c.bloco === bloco;
    if (blocoMatch) {
      const key = `${bloco}_${c.apartamento}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    cursor = await cursor.continue();
  }
  return counts;
}

export async function excluirComentario(id: number): Promise<void> {
  const db = await getDb();
  await db.delete('comentarios', id);
}

// --- Marcar todos docs como OK ---
export async function marcarTodosDocsOK(bloco: string, apartamentos: string[]): Promise<number> {
  const db = await getDb();
  let count = 0;
  const aptoSet = new Set(apartamentos);

  const letter = bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
  const isSingleLetter = letter.length === 1 && /^[A-H]$/.test(letter);

  // Use cursor + batch transaction instead of loading all + individual puts
  const updates: { record: FotoRecord; id: number }[] = [];
  let cursor = await db.transaction('fotos', 'readonly').store.openCursor();
  while (cursor) {
    const f = cursor.value;
    const fLetter = f.bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const blocoMatch = isSingleLetter ? fLetter === letter : f.bloco === bloco;
    if (blocoMatch && aptoSet.has(normApto(f.apartamento)) && f.categoria === 'documento' && !f.synced) {
      updates.push({ record: { ...f, synced: true }, id: f.id! });
    }
    cursor = await cursor.continue();
  }

  // Batch write in single transaction
  if (updates.length > 0) {
    const tx = db.transaction('fotos', 'readwrite');
    for (const { record, id } of updates) {
      tx.store.put(record, id);
      count++;
    }
    await tx.done;
  }
  return count;
}
