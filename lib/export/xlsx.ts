import type { ApartamentoStatus } from '../db';
import { statusApto, shareFile } from './utils';

function buildXLSXWorkbook(status: ApartamentoStatus[], titulo: string) {
  return import('xlsx').then((XLSX) => {
    const wb = XLSX.utils.book_new();

    const total = status.length;
    const concluidos = status.filter((s) => statusApto(s) === 'Concluido').length;
    const andamento = status.filter((s) => statusApto(s) === 'Em andamento').length;
    const pendentes = total - concluidos - andamento;
    const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;

    const resumoData = [
      ['Resumo da Vistoria'],
      [],
      ['Metrica', 'Valor'],
      ['Total de Aptos', total],
      ['Concluidos', concluidos],
      ['Em Andamento', andamento],
      ['Pendentes', pendentes],
      ['Progresso', `${pct}%`],
      [],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      ['Projeto', titulo],
    ];

    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    const detalhamento: any[][] = [
      ['Torre', 'Apto', 'Antes', 'Depois', 'Docs', 'Total Fotos', 'Status'],
    ];

    const sorted = [...status].sort((a, b) => {
      const blocCmp = a.bloco.localeCompare(b.bloco);
      if (blocCmp !== 0) return blocCmp;
      return a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true });
    });

    for (const s of sorted) {
      detalhamento.push([
        s.bloco,
        s.apartamento,
        s.cybleAntesFeito ? 'Sim' : 'Nao',
        s.cybleDepoisFeito ? 'Sim' : 'Nao',
        String(s.qtdDocumentos),
        String(s.qtdFotos),
        statusApto(s),
      ]);
    }

    const wsDetalhe = XLSX.utils.aoa_to_sheet(detalhamento);
    wsDetalhe['!cols'] = [
      { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 12 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDetalhe, 'Detalhamento');

    const porTorre: Record<string, ApartamentoStatus[]> = {};
    for (const s of status) {
      if (!porTorre[s.bloco]) porTorre[s.bloco] = [];
      porTorre[s.bloco].push(s);
    }

    for (const [torre, aptos] of Object.entries(porTorre)) {
      const rows: any[][] = [
        [`${torre} \u2014 Resumo`],
        [],
        ['Apto', 'Antes', 'Depois', 'Docs', 'Fotos', 'Status'],
      ];
      for (const s of aptos.sort((a, b) =>
        a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true })
      )) {
        rows.push([
          s.apartamento,
          s.cybleAntesFeito ? 'Sim' : 'Nao',
          s.cybleDepoisFeito ? 'Sim' : 'Nao',
          String(s.qtdDocumentos),
          String(s.qtdFotos),
          statusApto(s),
        ]);
      }
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, torre.substring(0, 31));
    }

    return { XLSX, wb };
  });
}

export async function exportarXLSX(status: ApartamentoStatus[], titulo: string) {
  const { XLSX, wb } = await buildXLSXWorkbook(status, titulo);
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vistoria-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function compartilharXLSX(status: ApartamentoStatus[], titulo: string) {
  const { XLSX, wb } = await buildXLSXWorkbook(status, titulo);
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `vistoria-${new Date().toISOString().slice(0, 10)}.xlsx`;
  await shareFile(blob, filename, `Planilha Vistoria Cyble - ${titulo}`);
}
