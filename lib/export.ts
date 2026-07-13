import { ApartamentoStatus } from './db';

function statusApto(s: ApartamentoStatus): string {
  if (s.cybleAntesFeito && s.cybleDepoisFeito && s.qtdDocumentos > 0) return 'Concluído';
  if (s.cybleAntesFeito || s.cybleDepoisFeito || s.qtdDocumentos > 0) return 'Em andamento';
  return 'Pendente';
}

export function exportarCSV(status: ApartamentoStatus[]) {
  const header = 'Torre;Apto;Cyble Antes;Cyble Depois;Documentos;Total Fotos;Status\n';
  const rows = status
    .filter((s) => s.qtdFotos > 0)
    .map((s) =>
      [
        s.bloco,
        s.apartamento,
        s.cybleAntesFeito ? 'Sim' : 'Não',
        s.cybleDepoisFeito ? 'Sim' : 'Não',
        s.qtdDocumentos,
        s.qtdFotos,
        statusApto(s),
      ].join(';')
    )
    .join('\n');

  const total = status.filter((s) => s.qtdFotos > 0).length;
  const concluidos = status.filter((s) => statusApto(s) === 'Concluído').length;
  const pendentes = total - concluidos;

  const resumo = `\n\nResumo;;${concluidos} concluídos;${pendentes} pendentes;${total} total;;`;

  const blob = new Blob(['\uFEFF' + header + rows + resumo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vistoria-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportarPDF(status: ApartamentoStatus[], titulo: string) {
  const porTorre: Record<string, ApartamentoStatus[]> = {};
  for (const s of status) {
    if (!porTorre[s.bloco]) porTorre[s.bloco] = [];
    porTorre[s.bloco].push(s);
  }

  const total = status.length;
  const concluidos = status.filter((s) => statusApto(s) === 'Concluído').length;
  const dataHora = new Date().toLocaleString('pt-BR');

  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Relatório — ${titulo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; padding: 30px; color: #222; font-size: 13px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
  .resumo { display: flex; gap: 20px; margin-bottom: 24px; }
  .resumo-box { background: #f5f5f5; border-radius: 6px; padding: 12px 16px; min-width: 120px; }
  .resumo-box .num { font-size: 22px; font-weight: 700; }
  .resumo-box .label { font-size: 11px; color: #666; text-transform: uppercase; }
  h2 { font-size: 15px; margin: 18px 0 8px; border-bottom: 2px solid #eee; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f0f0f0; text-align: left; padding: 6px 8px; font-size: 11px; text-transform: uppercase; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  .ok { color: #16a34a; font-weight: 600; }
  .pend { color: #dc2626; }
  .and { color: #d97706; }
  .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { body { padding: 15px; } }
</style>
</head>
<body>
<h1>Relatório de Vistorias — ${titulo}</h1>
<div class="meta">Gerado em ${dataHora}</div>

<div class="resumo">
  <div class="resumo-box"><div class="num">${concluidos}</div><div class="label">Concluídos</div></div>
  <div class="resumo-box"><div class="num">${total - concluidos}</div><div class="label">Pendentes</div></div>
  <div class="resumo-box"><div class="num">${total}</div><div class="label">Total</div></div>
  <div class="resumo-box"><div class="num">${total > 0 ? Math.round((concluidos / total) * 100) : 0}%</div><div class="label">Progresso</div></div>
</div>`;

  for (const [torre, aptos] of Object.entries(porTorre)) {
    const torreConcluidos = aptos.filter((s) => statusApto(s) === 'Concluído').length;
    html += `
<h2>${torre} — ${torreConcluidos}/${aptos.length} concluídos</h2>
<table>
  <thead><tr><th>Apto</th><th>Cyble Antes</th><th>Cyble Depois</th><th>Documentos</th><th>Total Fotos</th><th>Status</th></tr></thead>
  <tbody>`;
    for (const s of aptos) {
      const cls = statusApto(s) === 'Concluído' ? 'ok' : statusApto(s) === 'Em andamento' ? 'and' : 'pend';
      html += `<tr>
        <td>${s.apartamento}</td>
        <td>${s.cybleAntesFeito ? '✓' : '—'}</td>
        <td>${s.cybleDepoisFeito ? '✓' : '—'}</td>
        <td>${s.qtdDocumentos > 0 ? s.qtdDocumentos : '—'}</td>
        <td>${s.qtdFotos}</td>
        <td class="${cls}">${statusApto(s)}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
  }

  html += `
<div class="footer">Vistoria Cyble — Relatório gerado automaticamente</div>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
