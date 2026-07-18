import { ApartamentoStatus } from '../db';
import { normApto } from '../utils';
import { statusApto } from './utils';

export interface HtmlFoto {
  fotoUrl: string;
  categoria: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function statusBadge(s: string): string {
  const colors: Record<string, string> = {
    'Concluído': '#22c55e',
    'Em andamento': '#f59e0b',
    'Pendente': '#6b7280',
  };
  const c = colors[s] ?? '#6b7280';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:#fff;background:${c}">${esc(s)}</span>`;
}

function fotoThumb(url: string, label: string): string {
  if (!url) return '';
  return `<div style="flex:0 0 120px">
    <img src="${esc(url)}" alt="${esc(label)}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #333" loading="lazy" />
    <p style="font-size:10px;color:#888;text-align:center;margin-top:4px">${esc(label)}</p>
  </div>`;
}

export function gerarRelatorioHTML(
  status: ApartamentoStatus[],
  fotosMap: Map<string, HtmlFoto[]>,
  torresFiltro?: Set<string>
): string {
  const filtered = torresFiltro && torresFiltro.size > 0
    ? status.filter((s) => torresFiltro.has(s.bloco))
    : status;

  // Group by tower
  const towers = new Map<string, ApartamentoStatus[]>();
  for (const s of filtered) {
    const arr = towers.get(s.bloco) ?? [];
    arr.push(s);
    towers.set(s.bloco, arr);
  }

  const totalAptos = filtered.length;
  const concluidos = filtered.filter((s) => statusApto(s) === 'Concluído').length;
  const emAndamento = filtered.filter((s) => statusApto(s) === 'Em andamento').length;
  const pendentes = totalAptos - concluidos - emAndamento;
  const pct = totalAptos > 0 ? Math.round((concluidos / totalAptos) * 100) : 0;
  const now = new Date().toLocaleString('pt-BR');

  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Relatório Vistoria Cyble — ${esc(now)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#0a0a0a; color:#e5e5e5; padding:20px; }
  h1 { font-size:24px; font-weight:700; margin-bottom:4px; }
  h2 { font-size:18px; font-weight:600; margin:24px 0 12px; color:#e8823a; }
  h3 { font-size:14px; font-weight:600; margin:16px 0 8px; }
  .subtitle { font-size:12px; color:#888; margin-bottom:20px; }
  .stats { display:flex; gap:12px; margin-bottom:24px; flex-wrap:wrap; }
  .stat { background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:16px; flex:1; min-width:120px; text-align:center; }
  .stat-value { font-size:28px; font-weight:700; }
  .stat-label { font-size:11px; color:#888; margin-top:4px; }
  .progress-bar { width:100%; height:8px; background:#222; border-radius:4px; overflow:hidden; margin:8px 0 16px; }
  .progress-fill { height:100%; background:#22c55e; border-radius:4px; transition:width 0.3s; }
  .tower { background:#141414; border:1px solid #262626; border-radius:12px; padding:16px; margin-bottom:16px; }
  .tower-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
  .apto { display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid #1a1a1a; }
  .apto:last-child { border-bottom:none; }
  .apto-num { font-size:14px; font-weight:600; min-width:50px; }
  .apto-meta { font-size:11px; color:#888; }
  .fotos { display:flex; gap:8px; margin-top:6px; flex-wrap:wrap; }
  .filter-bar { display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
  .filter-btn { padding:6px 12px; border-radius:8px; border:1px solid #333; background:#1a1a1a; color:#aaa; font-size:12px; cursor:pointer; }
  .filter-btn.active { background:#e8823a; color:#fff; border-color:#e8823a; }
  @media print { body { background:#fff; color:#000; } .tower { border-color:#ddd; } .stat { border-color:#ddd; } }
</style>
</head>
<body>
<h1>Vistoria Cyble</h1>
<p class="subtitle">Relatório gerado em ${esc(now)}</p>

<div class="stats">
  <div class="stat">
    <div class="stat-value" style="color:#22c55e">${concluidos}</div>
    <div class="stat-label">Concluídos</div>
  </div>
  <div class="stat">
    <div class="stat-value" style="color:#f59e0b">${emAndamento}</div>
    <div class="stat-label">Em andamento</div>
  </div>
  <div class="stat">
    <div class="stat-value" style="color:#6b7280">${pendentes}</div>
    <div class="stat-label">Pendentes</div>
  </div>
  <div class="stat">
    <div class="stat-value">${pct}%</div>
    <div class="stat-label">Progresso</div>
  </div>
</div>

<div class="progress-bar">
  <div class="progress-fill" style="width:${pct}%"></div>
</div>
`;

  const sortedTowers = Array.from(towers.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [tower, apts] of sortedTowers) {
    const tConcluidos = apts.filter((s) => statusApto(s) === 'Concluído').length;
    const tTotal = apts.length;
    const tPct = tTotal > 0 ? Math.round((tConcluidos / tTotal) * 100) : 0;

    html += `
<div class="tower">
  <div class="tower-header">
    <h2 style="margin:0">${esc(tower)}</h2>
    <span style="font-size:13px;color:#888">${tConcluidos}/${tTotal} (${tPct}%)</span>
  </div>
  <div class="progress-bar">
    <div class="progress-fill" style="width:${tPct}%"></div>
  </div>
`;

    const sortedApts = [...apts].sort((a, b) => normApto(a.apartamento).localeCompare(normApto(b.apartamento)));

    for (const apt of sortedApts) {
      const s = statusApto(apt);
      const key = `${apt.bloco}_${apt.apartamento}`;
      const fotos = fotosMap.get(key) ?? [];

      html += `
  <div class="apto">
    <div>
      <div class="apto-num">${esc(apt.apartamento)}</div>
      <div class="apto-meta">${statusBadge(s)}</div>
    </div>
    <div style="flex:1">
      <div class="apto-meta">
        Antes: ${apt.cybleAntesFeito ? '✅' : '❌'} · Depois: ${apt.cybleDepoisFeito ? '✅' : '❌'} · Docs: ${apt.qtdDocumentos}
      </div>
      ${fotos.length > 0 ? `<div class="fotos">${fotos.map((f) => fotoThumb(f.fotoUrl, f.categoria)).join('')}</div>` : ''}
    </div>
  </div>`;
    }

    html += `\n</div>`;
  }

  html += `
<p style="text-align:center;color:#555;font-size:11px;margin-top:32px">
  Gerado por Vistoria Cyble · ${esc(now)}
</p>
</body>
</html>`;

  return html;
}

export function downloadHTML(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
