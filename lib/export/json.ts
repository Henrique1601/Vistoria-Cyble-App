import type { ApartamentoStatus } from '../db';
import { statusApto, shareFile, normApto } from './utils';

export interface ExportJSON {
  version: string;
  exportedAt: string;
  title: string;
  summary: {
    total: number;
    concluidos: number;
    emAndamento: number;
    pendentes: number;
    percentual: number;
  };
  apartments: {
    bloco: string;
    apartamento: string;
    status: string;
    cybleAntes: boolean;
    cybleDepois: boolean;
    documentos: number;
    fotos: number;
    notas: string[];
  }[];
}

export async function exportarJSON(status: ApartamentoStatus[], titulo: string) {
  const concluidos = status.filter((s) => statusApto(s) === 'Concluido').length;
  const emAndamento = status.filter((s) => statusApto(s) === 'Em andamento').length;
  const pendentes = status.filter((s) => statusApto(s) === 'Pendente').length;
  const total = status.length;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  const data: ExportJSON = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    title: titulo,
    summary: {
      total,
      concluidos,
      emAndamento,
      pendentes,
      percentual: pct,
    },
    apartments: status
      .sort((a, b) => a.bloco.localeCompare(b.bloco) || a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true }))
      .map((s) => ({
        bloco: s.bloco,
        apartamento: s.apartamento,
        status: statusApto(s),
        cybleAntes: s.cybleAntesFeito,
        cybleDepois: s.cybleDepoisFeito,
        documentos: s.qtdDocumentos,
        fotos: s.qtdFotos,
        notas: s.notas || [],
      })),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const filename = `vistoria-${new Date().toISOString().slice(0, 10)}.json`;
  await shareFile(blob, filename, `Exportacao Vistoria Cyble - ${titulo}`);
}

export function parseImportJSON(jsonStr: string): ExportJSON | null {
  try {
    const data = JSON.parse(jsonStr);
    if (data.version && data.apartments && Array.isArray(data.apartments)) {
      return data as ExportJSON;
    }
    return null;
  } catch {
    return null;
  }
}
