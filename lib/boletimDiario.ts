import type { ApartamentoStatus, FotoRecord } from './db';
import { normApto, normalizeBloco } from './utils';

export interface AusenteItem {
  bloco: string;
  apartamento: string;
  motivo: string;
  hora: string;
  observacao?: string;
}

export interface ProgressoTorre {
  bloco: string;
  concluidos: number;
  total: number;
  percentual: number;
  trocadosHoje: number;
}

export interface DadosBoletim {
  data: string;
  totalCondominio: number;
  concluidosTotal: number;
  percentualGeral: number;
  trocadosHoje: number;
  ausentesHoje: AusenteItem[];
  progressoPorTorre: ProgressoTorre[];
  horarioPrimeiraTroca?: string;
  horarioUltimaTroca?: string;
}

export function calcularDadosBoletim(
  statusList: ApartamentoStatus[],
  fotos: FotoRecord[],
  dataRef: Date = new Date()
): DadosBoletim {
  const inicioDoDia = new Date(dataRef.getFullYear(), dataRef.getMonth(), dataRef.getDate()).getTime();
  const fimDoDia = inicioDoDia + 24 * 60 * 60 * 1000 - 1;

  // Filtrar fotos tiradas hoje
  const fotosHoje = fotos.filter((f) => f.timestamp >= inicioDoDia && f.timestamp <= fimDoDia);

  // Aptos com foto hoje
  const aptosComFotoHoje = new Set<string>();
  let primeiroTimestamp: number | null = null;
  let ultimoTimestamp: number | null = null;

  for (const f of fotosHoje) {
    aptosComFotoHoje.add(`${normalizeBloco(f.bloco)}__${normApto(f.apartamento)}`);
    if (primeiroTimestamp === null || f.timestamp < primeiroTimestamp) primeiroTimestamp = f.timestamp;
    if (ultimoTimestamp === null || f.timestamp > ultimoTimestamp) ultimoTimestamp = f.timestamp;
  }

  // Agrupamento por torre
  const torresMap = new Map<string, { total: number; concluidos: number; trocadosHoje: number }>();
  const ausentesHoje: AusenteItem[] = [];

  for (const s of statusList) {
    const bNorm = normalizeBloco(s.bloco);
    const aNorm = normApto(s.apartamento);
    const key = `${bNorm}__${aNorm}`;

    const torreData = torresMap.get(bNorm) || { total: 0, concluidos: 0, trocadosHoje: 0 };
    torreData.total += 1;

    const isConcluido = Boolean(s.isConcluido || (s.cybleAntesFeito && s.cybleDepoisFeito));
    if (isConcluido) {
      torreData.concluidos += 1;
    }

    if (aptosComFotoHoje.has(key)) {
      torreData.trocadosHoje += 1;
    }
    torresMap.set(bNorm, torreData);

    // Ocorrências de ausência ativas
    if (s.ocorrencia && !s.ocorrencia.resolvido && !isConcluido) {
      const horaStr = new Date(s.ocorrencia.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      ausentesHoje.push({
        bloco: s.bloco,
        apartamento: s.apartamento,
        motivo: s.ocorrencia.motivoLabel || 'Morador ausente',
        hora: horaStr,
        observacao: s.ocorrencia.observacao,
      });
    }
  }

  const progressoPorTorre: ProgressoTorre[] = Array.from(torresMap.entries())
    .map(([bloco, d]) => ({
      bloco,
      total: d.total,
      concluidos: d.concluidos,
      percentual: d.total > 0 ? Math.round((d.concluidos / d.total) * 100) : 0,
      trocadosHoje: d.trocadosHoje,
    }))
    .sort((a, b) => a.bloco.localeCompare(b.bloco));

  const totalCondominio = statusList.length;
  const concluidosTotal = statusList.filter((s) => s.isConcluido || (s.cybleAntesFeito && s.cybleDepoisFeito)).length;
  const percentualGeral = totalCondominio > 0 ? Math.round((concluidosTotal / totalCondominio) * 100) : 0;
  const trocadosHoje = aptosComFotoHoje.size;

  return {
    data: dataRef.toLocaleDateString('pt-BR'),
    totalCondominio,
    concluidosTotal,
    percentualGeral,
    trocadosHoje,
    ausentesHoje,
    progressoPorTorre,
    horarioPrimeiraTroca: primeiroTimestamp
      ? new Date(primeiroTimestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : undefined,
    horarioUltimaTroca: ultimoTimestamp
      ? new Date(ultimoTimestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : undefined,
  };
}

export function formatarTextoWhatsApp(dados: DadosBoletim, nomeCondominio = 'Condomínio'): string {
  const linhas: string[] = [];

  linhas.push(`🏢 *BOLETIM DIÁRIO — ${nomeCondominio.toUpperCase()}*`);
  linhas.push(`📅 *Data:* ${dados.data}`);
  linhas.push(`─────────────────────────────`);
  linhas.push(`📊 *PRODUÇÃO DO DIA:*`);
  linhas.push(`⚡ *Trocados hoje:* ${dados.trocadosHoje} medidores`);
  linhas.push(`🏆 *Total Concluído:* ${dados.concluidosTotal} de ${dados.totalCondominio} (${dados.percentualGeral}%)`);

  if (dados.horarioPrimeiraTroca && dados.horarioUltimaTroca) {
    linhas.push(`⏱️ *Horário em campo:* das ${dados.horarioPrimeiraTroca} às ${dados.horarioUltimaTroca}`);
  }

  linhas.push(`─────────────────────────────`);
  linhas.push(`🏗️ *STATUS POR TORRE:*`);
  for (const t of dados.progressoPorTorre) {
    const hojeTag = t.trocadosHoje > 0 ? ` _(+${t.trocadosHoje} hoje)_` : '';
    linhas.push(`• *${t.bloco}:* ${t.concluidos}/${t.total} (${t.percentual}%)${hojeTag}`);
  }

  linhas.push(`─────────────────────────────`);
  if (dados.ausentesHoje.length > 0) {
    linhas.push(`🚪 *MORADORES AUSENTES / SEM ACESSO (${dados.ausentesHoje.length}):*`);
    linhas.push(`_(Medidores internos aos aptos pendentes de entrada)_`);
    for (const a of dados.ausentesHoje) {
      linhas.push(`• *${a.bloco} - Apto ${a.apartamento}:* ${a.motivo} às ${a.hora}${a.observacao ? ` - _"${a.observacao}"_` : ''}`);
    }
  } else {
    linhas.push(`🚪 *AUSENTES:* ✅ Todos os apartamentos do roteiro foram atendidos!`);
  }

  linhas.push(`─────────────────────────────`);
  linhas.push(`_Relatório gerado automaticamente pelo Vistoria Cyble App_`);

  return linhas.join('\n');
}

/**
 * Renderiza um Card Gráfico Oficial de 1080x1350px para WhatsApp / Instagram
 */
export async function renderizarCardImagemBoletim(
  dados: DadosBoletim,
  nomeCondominio = 'Condomínio'
): Promise<Blob> {
  const width = 1080;
  const height = 1350;

  const isOffscreen = typeof OffscreenCanvas !== 'undefined';
  const rawCanvas = isOffscreen
    ? new OffscreenCanvas(width, height)
    : (typeof document !== 'undefined' ? document.createElement('canvas') : null);

  if (!rawCanvas) {
    throw new Error('Canvas não disponível neste ambiente');
  }

  if (!isOffscreen) {
    (rawCanvas as HTMLCanvasElement).width = width;
    (rawCanvas as HTMLCanvasElement).height = height;
  }

  const canvas = rawCanvas as unknown as OffscreenCanvas;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new Error('Não foi possível obter contexto 2D');

  // 1. Fundo Gradiente Escuro Moderno
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0b1329');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Efeito Glow de Fundo
  const glowGrad = ctx.createRadialGradient(width / 2, 200, 50, width / 2, 200, 600);
  glowGrad.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
  glowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, 800);

  // 2. Cabeçalho
  ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
  ctx.lineWidth = 2;
  const badgeW = 280;
  const badgeH = 46;
  const badgeX = (width - badgeW) / 2;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(badgeX, 60, badgeW, badgeH, 23);
  } else {
    ctx.rect(badgeX, 60, badgeW, badgeH);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#60a5fa';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BOLETIM DIÁRIO OFICIAL', width / 2, 83);

  // Nome do Condomínio
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(nomeCondominio, width / 2, 160);

  // Data
  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px sans-serif';
  ctx.fillText(`Relatório de Produção • ${dados.data}`, width / 2, 205);

  // 3. Grid de 3 Cards Principais de Métricas
  const cardY = 260;
  const cardH = 170;
  const cardGap = 24;
  const cardW = (width - 120 - cardGap * 2) / 3;
  const startX = 60;

  // Card 1: Trocados Hoje
  desenharCardMetrica(
    ctx,
    startX,
    cardY,
    cardW,
    cardH,
    'Trocados Hoje',
    String(dados.trocadosHoje),
    dados.horarioUltimaTroca ? `último às ${dados.horarioUltimaTroca}` : 'em campo',
    '#10b981',
    'rgba(16, 185, 129, 0.12)'
  );

  // Card 2: Concluídos Geral
  desenharCardMetrica(
    ctx,
    startX + cardW + cardGap,
    cardY,
    cardW,
    cardH,
    'Total Obra',
    `${dados.percentualGeral}%`,
    `${dados.concluidosTotal} de ${dados.totalCondominio} aptos`,
    '#38bdf8',
    'rgba(56, 189, 248, 0.12)'
  );

  // Card 3: Ausentes / Sem Acesso
  desenharCardMetrica(
    ctx,
    startX + (cardW + cardGap) * 2,
    cardY,
    cardW,
    cardH,
    'Sem Acesso',
    String(dados.ausentesHoje.length),
    dados.ausentesHoje.length > 0 ? 'moradores ausentes' : '100% atendido',
    dados.ausentesHoje.length > 0 ? '#f59e0b' : '#10b981',
    dados.ausentesHoje.length > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)'
  );

  // 4. Seção: Progresso por Torre
  const torresY = 470;
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Progresso por Torre', 60, torresY);

  const torresBoxY = torresY + 20;
  const torresBoxH = 340;
  desenharPainel(ctx, 60, torresBoxY, width - 120, torresBoxH);

  // Lista de torres (duas colunas)
  const colWidth = (width - 160) / 2;
  const maxTorres = Math.min(dados.progressoPorTorre.length, 8);
  for (let i = 0; i < maxTorres; i++) {
    const t = dados.progressoPorTorre[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const tx = 90 + col * colWidth;
    const ty = torresBoxY + 35 + row * 72;

    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(t.bloco, tx, ty);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px monospace';
    ctx.textAlign = 'right';
    const infoStr = `${t.concluidos}/${t.total} (${t.percentual}%)`;
    ctx.fillText(infoStr, tx + colWidth - 60, ty);

    // Barra de progresso da torre
    const barW = colWidth - 60;
    const barH = 10;
    const barY = ty + 10;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    desenharRoundRect(ctx, tx, barY, barW, barH, 5);

    const fillW = Math.max(6, (barW * t.percentual) / 100);
    ctx.fillStyle = t.percentual >= 100 ? '#10b981' : '#38bdf8';
    desenharRoundRect(ctx, tx, barY, fillW, barH, 5);
  }

  // 5. Seção: Apartamentos Ausentes / Impedidos
  const ausentesSecY = 860;
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Apartamentos Ausentes / Sem Acesso (${dados.ausentesHoje.length})`, 60, ausentesSecY);

  const ausentesBoxY = ausentesSecY + 20;
  const ausentesBoxH = 350;
  desenharPainel(ctx, 60, ausentesBoxY, width - 120, ausentesBoxH);

  if (dados.ausentesHoje.length === 0) {
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✓ Nenhum apartamento ausente registrado hoje!', width / 2, ausentesBoxY + 180);
    ctx.fillStyle = '#64748b';
    ctx.font = '18px sans-serif';
    ctx.fillText('Todos os apartamentos do dia foram vistoriados com sucesso.', width / 2, ausentesBoxY + 220);
  } else {
    const maxExibir = Math.min(dados.ausentesHoje.length, 6);
    for (let i = 0; i < maxExibir; i++) {
      const a = dados.ausentesHoje[i];
      const itemY = ausentesBoxY + 30 + i * 50;

      // Badge Apto
      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      desenharRoundRect(ctx, 85, itemY - 18, 140, 36, 18);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${a.bloco} ${a.apartamento}`, 155, itemY + 5);

      // Motivo
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '17px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(a.motivo, 245, itemY + 5);

      // Horário
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(a.hora, width - 90, itemY + 5);
    }

    if (dados.ausentesHoje.length > 6) {
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`+ outros ${dados.ausentesHoje.length - 6} apartamentos pendentes de retorno`, width / 2, ausentesBoxY + 325);
    }
  }

  // 6. Rodapé Oficial
  ctx.fillStyle = '#475569';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`Vistoria Cyble App • Tecnologia Offline-First • Emitido em ${new Date().toLocaleTimeString('pt-BR')}`, width / 2, 1300);

  // 7. Conversão para Blob PNG
  if (isOffscreen) {
    return canvas.convertToBlob({ type: 'image/png' });
  }

  return new Promise<Blob>((resolve, reject) => {
    (rawCanvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob retornou null'))),
      'image/png'
    );
  });
}

function desenharRoundRect(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fill();
}

function desenharPainel(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, 20);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fill();
  ctx.stroke();
}

function desenharCardMetrica(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  titulo: string,
  valor: string,
  subtitulo: string,
  corValor: string,
  bgCor: string
) {
  ctx.fillStyle = bgCor;
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, 20);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fill();
  ctx.stroke();

  // Título
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(titulo.toUpperCase(), x + w / 2, y + 36);

  // Valor
  ctx.fillStyle = corValor;
  ctx.font = 'bold 50px monospace';
  ctx.fillText(valor, x + w / 2, y + 96);

  // Subtítulo
  ctx.fillStyle = '#64748b';
  ctx.font = '14px sans-serif';
  ctx.fillText(subtitulo, x + w / 2, y + 140);
}
