import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AcaoDesenho } from './drawing';
import { normApto } from './utils';
import { getQualidadeFoto } from './settings';

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

function getDb() {
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

export async function fotosDoApartamento(bloco: string, apartamento: string) {
  const db = await getDb();
  const all = await db.getAll('fotos');
  const normA = normApto(apartamento);
  const letter = bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
  const isSingleLetter = letter.length === 1 && /^[A-H]$/.test(letter);
  return all.filter((f) => {
    const fLetter = f.bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const blocoMatch = isSingleLetter ? fLetter === letter : f.bloco === bloco;
    return blocoMatch && normApto(f.apartamento) === normA;
  });
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

export async function statusDeTodosApartamentos(
  lista: Record<string, string[]>
): Promise<ApartamentoStatus[]> {
  const db = await getDb();
  const all = await db.getAll('fotos');
  const concluidos = await carregarConcluidos();

  const letterToFull = new Map<string, string>();
  for (const blocoNome of Object.keys(lista)) {
    const match = blocoNome.match(/([A-H])$/i);
    if (match) letterToFull.set(match[1].toUpperCase(), blocoNome);
  }

  const fotosMap = new Map<string, FotoRecord[]>();
  for (const f of all) {
    let blocoKey = f.bloco;
    const letter = blocoKey.replace(/^Torre\s+/i, '').trim();
    if (letter.length === 1 && /^[A-H]$/i.test(letter)) {
      blocoKey = letterToFull.get(letter.toUpperCase()) || blocoKey;
    }
    const key = `${blocoKey}__${normApto(f.apartamento)}`;
    const arr = fotosMap.get(key) || [];
    arr.push(f);
    fotosMap.set(key, arr);
  }

  const result: ApartamentoStatus[] = [];
  for (const bloco of Object.keys(lista)) {
    const concluidosBloco = new Set(concluidos[bloco] || []);
    for (const apto of lista[bloco]) {
      const key = `${bloco}__${normApto(apto)}`;
      const fotos = fotosMap.get(key) || [];
      const isConcluido = concluidosBloco.has(apto);
      const notas = fotos.map((f) => f.nota).filter((n): n is string => !!n && n.trim().length > 0);
      result.push({
        bloco,
        apartamento: apto,
        cybleAntesFeito: isConcluido || fotos.some((f) => f.categoria === 'cyble_antes'),
        cybleDepoisFeito: isConcluido || fotos.some((f) => f.categoria === 'cyble_depois'),
        qtdDocumentos: fotos.filter((f) => f.categoria === 'documento').length,
        qtdFotos: isConcluido ? 0 : fotos.length,
        notas: notas.length > 0 ? notas : undefined,
        isConcluido,
      });
    }
  }
  return result;
}

// --- Compressao de imagem ---
const MAX_IMAGE_WIDTH = 1920;
const QUALIDADE_MAP: Record<string, number> = { '50': 0.50, '75': 0.75, '90': 0.90 };

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
    reader.onload = () => {
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
    };
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

export async function comprimirImagem(
  file: File,
  watermark?: { texto: string; bloco?: string; apartamento?: string }
): Promise<Blob> {
  const [img, orientation] = await Promise.all([loadImageFromBlob(file), getExifOrientation(file)]);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const isRotated = orientation >= 5;
  const realW = isRotated ? srcH : srcW;
  const realH = isRotated ? srcW : srcH;
  const escala = Math.min(1, MAX_IMAGE_WIDTH / Math.max(realW, realH));
  const w = Math.round(realW * escala);
  const h = Math.round(realH * escala);
  // OffscreenCanvas fallback: use regular canvas on older browsers/iOS
  const isOffscreen = typeof OffscreenCanvas !== 'undefined';
  const rawCanvas = isOffscreen ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  if (!isOffscreen) { (rawCanvas as HTMLCanvasElement).width = w; (rawCanvas as HTMLCanvasElement).height = h; }
  const canvas = rawCanvas as unknown as OffscreenCanvas;
  const ctx = canvas.getContext('2d')!;
  drawImageWithOrientation(ctx, img, orientation, w, h);

  if (watermark) {
    const fontSize = Math.max(16, Math.round(h * 0.025));
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textBaseline = 'bottom';

    const lines: string[] = [];
    if (watermark.bloco && watermark.apartamento) {
      lines.push(`${watermark.bloco} - Apto ${watermark.apartamento}`);
    }
    lines.push(watermark.texto);

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
  }

  const qualidade = QUALIDADE_MAP[getQualidadeFoto()] ?? 0.75;
  // convertToBlob only on OffscreenCanvas; toBlob on regular canvas fallback
  if (isOffscreen) {
    return canvas.convertToBlob({ type: 'image/jpeg', quality: qualidade });
  }
  // Fallback: wrap HTMLCanvasElement.toBlob in a Promise
  return new Promise<Blob>((resolve, reject) => {
    (rawCanvas as HTMLCanvasElement).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
      'image/jpeg',
      qualidade,
    );
  });
}

// --- Ultimas fotos (para acesso rapido) ---
export async function ultimasFotos(limite = 10): Promise<FotoRecord[]> {
  const db = await getDb();
  const all = await db.getAll('fotos');
  return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limite);
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

export async function agendamentosDoDia(data: string): Promise<Agendamento[]> {
  const db = await getDb();
  const all = await db.getAll('agendamentos');
  return all.filter((a) => a.data === data);
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

export async function editarAgendamento(id: number, dados: { data?: string; observacao?: string; apartamento?: string }) {
  const db = await getDb();
  const ag = await db.get('agendamentos', id);
  if (ag) {
    if (dados.data !== undefined) ag.data = dados.data;
    if (dados.observacao !== undefined) ag.observacao = dados.observacao;
    if (dados.apartamento !== undefined) ag.apartamento = dados.apartamento;
    await db.put('agendamentos', ag);
  }
}

export async function excluirAgendamentosConcluidos(): Promise<number> {
  const db = await getDb();
  const all = await db.getAll('agendamentos');
  const concluidos = all.filter((a) => a.concluido);
  for (const ag of concluidos) {
    if (ag.id !== undefined) await db.delete('agendamentos', ag.id);
  }
  return concluidos.length;
}

// --- Backup / Restore ---
export async function backupDados(): Promise<Blob> {
  const db = await getDb();
  const fotos = await db.getAll('fotos');
  const syncLog = await db.getAll('syncLog');
  const blocos = await db.get('config', 'blocos');
  const concluidos = await db.get('config', 'concluidos');

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
    versao: 3,
    tipo: 'completo',
    data: new Date().toISOString(),
    fotos: fotosSerializadas,
    syncLog,
    blocos,
    concluidos,
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

  await db.clear('fotos');
  await db.clear('syncLog');
  await db.clear('config');

  if (backupData.blocos && typeof backupData.blocos === 'object' && !Array.isArray(backupData.blocos)) {
    await db.put('config', backupData.blocos, 'blocos');
    blocosCount = Object.keys(backupData.blocos).length;
  } else if (backupData.lista && typeof backupData.lista === 'object' && !Array.isArray(backupData.lista)) {
    await db.put('config', backupData.lista, 'blocos');
    blocosCount = Object.keys(backupData.lista).length;
  } else if (backupData.config && typeof backupData.config === 'object' && !Array.isArray(backupData.config)) {
    await db.put('config', backupData.config, 'blocos');
    blocosCount = Object.keys(backupData.config).length;
  }

  if (backupData.concluidos && typeof backupData.concluidos === 'object' && !Array.isArray(backupData.concluidos)) {
    await db.put('config', backupData.concluidos, 'concluidos');
  }

  if (backupData.fotos) {
    const tx = db.transaction('fotos', 'readwrite');
    const store = tx.objectStore('fotos');
    for (const f of backupData.fotos) {
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

  if (backupData.syncLog) {
    for (const entry of backupData.syncLog) {
      await db.add('syncLog', entry as unknown as SyncLogEntry);
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

// --- Concluidos (lista de aptos ja trocados sem fotos) ---
export async function salvarConcluidos(lista: Record<string, string[]>) {
  const db = await getDb();
  await db.put('config', lista, 'concluidos');
  syncConcluidosToAPI(lista).catch((err) => console.warn('syncConcluidosToAPI error:', err));
}

export async function carregarConcluidos(): Promise<Record<string, string[]>> {
  const db = await getDb();
  const local = (await db.get('config', 'concluidos')) ?? {};
  if (Object.keys(local).length > 0) return local;
  try {
    const { authFetch } = await import('@/lib/api');
    const resp = await authFetch('/api/concluidos');
    if (resp.ok) {
      const remote = await resp.json();
      if (Object.keys(remote).length > 0) {
        await db.put('config', remote, 'concluidos');
        return remote;
      }
    }
  } catch {}
  return {};
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
  syncConcluidosToAPI({}).catch((err) => console.warn('syncConcluidosToAPI error:', err));
}

export async function importarConcluidosTxt(text: string): Promise<{ blocos: number; aptos: number }> {
  const mapa: Record<string, Set<string>> = {};
  const lines = text.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    const match = line.trim().match(/^Torre\s+([A-H])\s*-\s*APTO\s*(\d+)$/i);
    if (!match) continue;
    const bloco = `Torre ${match[1].toUpperCase()}`;
    const apto = normApto(match[2]);
    if (!apto) continue;
    if (!mapa[bloco]) mapa[bloco] = new Set();
    mapa[bloco].add(apto);
  }
  if (Object.keys(mapa).length === 0) throw new Error('Nenhum apartamento encontrado no formato "Torre X-APTO0077"');
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
  const concluidos = await carregarConcluidos();
  const lines: string[] = [];
  for (const [bloco, aptos] of Object.entries(concluidos)) {
    for (const a of aptos) {
      const letter = bloco.replace(/^Torre\s+/i, '').trim();
      lines.push(`Torre ${letter}-APTO${a.padStart(4, '0')}`);
    }
  }
  lines.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return new Blob([lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
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
      .map((a) => normApto(a.trim()))
      .filter(Boolean);
    const seen = new Set<string>();
    const deduped = aptosList.filter((a) => { if (seen.has(a)) return false; seen.add(a); return true; });
    if (torre && deduped.length > 0) {
      blocos[torre] = deduped;
      aptos += deduped.length;
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
  return { blocos: Object.keys(blocos).length, aptos };
}

// --- Notas por Apartamento ---
export async function salvarNotaApto(bloco: string, apartamento: string, texto: string): Promise<void> {
  const db = await getDb();
  const all = await db.getAll('notas');
  const match = all.find((n) => {
    const nLetter = n.bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const letter = bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const blocoMatch = letter.length === 1 && /^[A-H]$/.test(letter) ? nLetter === letter : n.bloco === bloco;
    return blocoMatch && normApto(n.apartamento) === normApto(apartamento);
  });
  if (match?.id) {
    await db.put('notas', { ...match, texto, atualizadoEm: Date.now() });
  } else {
    await db.add('notas', { bloco, apartamento, texto, atualizadoEm: Date.now() });
  }
}

export async function obterNotaApto(bloco: string, apartamento: string): Promise<string> {
  const db = await getDb();
  const all = await db.getAll('notas');
  const match = all.find((n) => {
    const nLetter = n.bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const letter = bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const blocoMatch = letter.length === 1 && /^[A-H]$/.test(letter) ? nLetter === letter : n.bloco === bloco;
    return blocoMatch && normApto(n.apartamento) === normApto(apartamento);
  });
  return match?.texto || '';
}

export async function excluirNotaApto(bloco: string, apartamento: string): Promise<void> {
  const db = await getDb();
  const all = await db.getAll('notas');
  const match = all.find((n) => {
    const nLetter = n.bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const letter = bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const blocoMatch = letter.length === 1 && /^[A-H]$/.test(letter) ? nLetter === letter : n.bloco === bloco;
    return blocoMatch && normApto(n.apartamento) === normApto(apartamento);
  });
  if (match?.id) await db.delete('notas', match.id);
}

// --- Comentarios por Apartamento ---
export async function adicionarComentario(bloco: string, apartamento: string, autor: string, texto: string): Promise<number> {
  const db = await getDb();
  return db.add('comentarios', { bloco, apartamento, autor, texto, criadoEm: Date.now() });
}

export async function obterComentarios(bloco: string, apartamento: string): Promise<ComentarioApto[]> {
  const db = await getDb();
  const all = await db.getAll('comentarios');
  return all.filter((c) => {
    const cLetter = c.bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const letter = bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const blocoMatch = letter.length === 1 && /^[A-H]$/.test(letter) ? cLetter === letter : c.bloco === bloco;
    return blocoMatch && normApto(c.apartamento) === normApto(apartamento);
  });
}

export async function excluirComentario(id: number): Promise<void> {
  const db = await getDb();
  await db.delete('comentarios', id);
}

// --- Marcar todos docs como OK ---
export async function marcarTodosDocsOK(bloco: string, apartamentos: string[]): Promise<number> {
  const db = await getDb();
  const all = await db.getAll('fotos');
  let count = 0;
  const aptoSet = new Set(apartamentos);

  const letter = bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
  const isSingleLetter = letter.length === 1 && /^[A-H]$/.test(letter);

  for (const f of all) {
    const fLetter = f.bloco.replace(/^Torre\s+/i, '').trim().toUpperCase();
    const blocoMatch = isSingleLetter ? fLetter === letter : f.bloco === bloco;
    if (blocoMatch && aptoSet.has(normApto(f.apartamento)) && f.categoria === 'documento' && !f.synced) {
      await db.put('fotos', { ...f, synced: true });
      count++;
    }
  }
  return count;
}
