import { openDB, DBSchema, IDBPDatabase } from 'idb';

export type Categoria = 'cyble_antes' | 'cyble_depois' | 'documento';

export interface ApartamentoStatus {
  bloco: string;
  apartamento: string;
  cybleAntesFeito: boolean;
  cybleDepoisFeito: boolean;
  qtdDocumentos: number;
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
}

interface VistoriaDB extends DBSchema {
  fotos: {
    key: number;
    value: FotoRecord;
  };
  config: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<VistoriaDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<VistoriaDB>('vistoria-cyble', 1, {
      upgrade(db) {
        db.createObjectStore('fotos', { keyPath: 'id', autoIncrement: true });
        db.createObjectStore('config');
      },
    });
  }
  return dbPromise;
}

// --- Configuração: lista de blocos/apartamentos ---
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
      });
    }
  }
  return result;
}
