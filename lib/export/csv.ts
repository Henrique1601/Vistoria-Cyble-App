import type { ApartamentoStatus } from '../db';
import { statusApto } from './utils';

export function exportarCSV(status: ApartamentoStatus[]) {
  const header = 'Torre;Apto;Cyble Antes;Cyble Depois;Documentos;Total Fotos;Status;Notas\n';
  const rows = status
    .filter((s) => s.qtdFotos > 0)
    .map((s) =>
      [
        s.bloco,
        s.apartamento,
        s.cybleAntesFeito ? 'Sim' : 'Nao',
        s.cybleDepoisFeito ? 'Sim' : 'Nao',
        s.qtdDocumentos,
        s.qtdFotos,
        statusApto(s),
        (s.notas || []).join(' | '),
      ].join(';')
    )
    .join('\n');

  const total = status.filter((s) => s.qtdFotos > 0).length;
  const concluidos = status.filter((s) => statusApto(s) === 'Concluido').length;
  const pendentes = total - concluidos;

  const resumo = `\n\nResumo;;${concluidos} concluidos;${pendentes} pendentes;${total} total;;`;

  const blob = new Blob(['\uFEFF' + header + rows + resumo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vistoria-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
