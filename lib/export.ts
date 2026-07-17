import { ApartamentoStatus, fotosDoApartamento } from './db';

const CATEGORIA_LABELS: Record<string, string> = {
  cyble_antes: 'cyble_antes',
  cyble_depois: 'cyble_depois',
  documento: 'documento',
};

function statusApto(s: ApartamentoStatus): string {
  if (s.cybleAntesFeito && s.cybleDepoisFeito && s.qtdDocumentos > 0) return 'Concluido';
  if (s.cybleAntesFeito || s.cybleDepoisFeito || s.qtdDocumentos > 0) return 'Em andamento';
  return 'Pendente';
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

async function shareFile(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: blob.type });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title,
        files: [file],
      });
      return true;
    } catch {
      return false;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function exportarPDF(status: ApartamentoStatus[], titulo: string) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  const dataHora = new Date().toLocaleString('pt-BR');
  const total = status.length;
  const concluidos = status.filter((s) => statusApto(s) === 'Concluido').length;
  const andamento = status.filter((s) => statusApto(s) === 'Em andamento').length;
  const pendentes = total - concluidos - andamento;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  // ── Capa ──
  doc.setFillColor(12, 15, 20);
  doc.rect(0, 0, pageW, pageH, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatorio de Vistorias', margin, 60);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(titulo, margin, 72);

  doc.setFontSize(11);
  doc.setTextColor(120, 120, 120);
  doc.text(`Gerado em ${dataHora}`, margin, 84);

  // Cards de resumo
  const cardY = 100;
  const cardW = (pageW - margin * 2 - 18) / 4;
  const cards = [
    { label: 'Concluidos', value: `${concluidos}`, color: [52, 211, 153] as [number, number, number] },
    { label: 'Andamento', value: `${andamento}`, color: [251, 191, 36] as [number, number, number] },
    { label: 'Pendentes', value: `${pendentes}`, color: [239, 68, 68] as [number, number, number] },
    { label: 'Progresso', value: `${pct}%`, color: [232, 130, 58] as [number, number, number] },
  ];

  cards.forEach((c, i) => {
    const x = margin + i * (cardW + 6);
    doc.setFillColor(25, 28, 35);
    doc.roundedRect(x, cardY, cardW, 28, 3, 3, 'F');
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...c.color);
    doc.text(c.value, x + cardW / 2, cardY + 14, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text(c.label.toUpperCase(), x + cardW / 2, cardY + 22, { align: 'center' });
  });

  // ── Pagina 2+: Tabelas por Torre ──
  const porTorre: Record<string, ApartamentoStatus[]> = {};
  for (const s of status) {
    if (!porTorre[s.bloco]) porTorre[s.bloco] = [];
    porTorre[s.bloco].push(s);
  }

  const torres = Object.keys(porTorre).sort();
  let pageIdx = 1;

  for (const torre of torres) {
    const aptos = porTorre[torre];
    const torreConcluidos = aptos.filter((s) => statusApto(s) === 'Concluido').length;
    const torrePct = aptos.length > 0 ? Math.round((torreConcluidos / aptos.length) * 100) : 0;

    doc.addPage();
    pageIdx++;
    doc.setFillColor(12, 15, 20);
    doc.rect(0, 0, pageW, pageH, 'F');

    // Header da torre
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${torre}`, margin, 22);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.text(`${torreConcluidos}/${aptos.length} concluidos (${torrePct}%)`, margin, 30);

    // Barra de progresso
    const barY = 34;
    const barW = pageW - margin * 2;
    doc.setFillColor(35, 38, 45);
    doc.roundedRect(margin, barY, barW, 3, 1.5, 1.5, 'F');
    if (torrePct > 0) {
      doc.setFillColor(52, 211, 153);
      doc.roundedRect(margin, barY, barW * (torrePct / 100), 3, 1.5, 1.5, 'F');
    }

    // Tabela
    const tableData = aptos
      .sort((a, b) => a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true }))
      .map((s) => [
        s.apartamento,
        s.cybleAntesFeito ? 'Sim' : 'Nao',
        s.cybleDepoisFeito ? 'Sim' : 'Nao',
        s.qtdDocumentos > 0 ? `${s.qtdDocumentos}` : '—',
        `${s.qtdFotos}`,
        statusApto(s),
      ]);

    autoTable(doc, {
      startY: 42,
      margin: { left: margin, right: margin },
      head: [['Apto', 'Antes', 'Depois', 'Docs', 'Fotos', 'Status']],
      body: tableData,
      styles: {
        fillColor: [20, 23, 30],
        textColor: [200, 200, 200],
        lineColor: [35, 38, 45],
        lineWidth: 0.3,
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [30, 33, 40],
        textColor: [160, 160, 160],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [16, 19, 26],
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw);
          if (val === 'Concluido') data.cell.styles.textColor = [52, 211, 153];
          else if (val === 'Em andamento') data.cell.styles.textColor = [251, 191, 36];
          else data.cell.styles.textColor = [239, 68, 68];
        }
      },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY ?? 42;
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Vistoria Cyble — Pagina ${pageIdx}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );
  }

  // Pagina de rodape
  doc.addPage();
  doc.setFillColor(12, 15, 20);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text('Relatorio gerado automaticamente por Vistoria Cyble', pageW / 2, pageH / 2 - 10, { align: 'center' });
  doc.text(dataHora, pageW / 2, pageH / 2, { align: 'center' });

  const filename = `vistoria-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export async function exportarXLSX(status: ApartamentoStatus[], titulo: string) {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  // ── Aba Resumo ──
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

  // ── Aba Detalhamento (todas as torres) ──
  const detalhamento = [
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

  // ── Aba por Torre ──
  const porTorre: Record<string, ApartamentoStatus[]> = {};
  for (const s of status) {
    if (!porTorre[s.bloco]) porTorre[s.bloco] = [];
    porTorre[s.bloco].push(s);
  }

  for (const [torre, aptos] of Object.entries(porTorre)) {
    const rows: any[][] = [
      [`${torre} — Resumo`],
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

  const filename = `vistoria-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportarCSV(status: ApartamentoStatus[]) {
  const header = 'Torre;Apto;Cyble Antes;Cyble Depois;Documentos;Total Fotos;Status\n';
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

export async function compartilharPDF(status: ApartamentoStatus[], titulo: string) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  const dataHora = new Date().toLocaleString('pt-BR');
  const total = status.length;
  const concluidos = status.filter((s) => statusApto(s) === 'Concluido').length;
  const andamento = status.filter((s) => statusApto(s) === 'Em andamento').length;
  const pendentes = total - concluidos - andamento;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  doc.setFillColor(12, 15, 20);
  doc.rect(0, 0, pageW, pageH, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatorio de Vistorias', margin, 60);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(titulo, margin, 72);

  doc.setFontSize(11);
  doc.setTextColor(120, 120, 120);
  doc.text(`Gerado em ${dataHora}`, margin, 84);

  const cardY = 100;
  const cardW = (pageW - margin * 2 - 18) / 4;
  const cards = [
    { label: 'Concluidos', value: `${concluidos}`, color: [52, 211, 153] as [number, number, number] },
    { label: 'Andamento', value: `${andamento}`, color: [251, 191, 36] as [number, number, number] },
    { label: 'Pendentes', value: `${pendentes}`, color: [239, 68, 68] as [number, number, number] },
    { label: 'Progresso', value: `${pct}%`, color: [232, 130, 58] as [number, number, number] },
  ];

  cards.forEach((c, i) => {
    const x = margin + i * (cardW + 6);
    doc.setFillColor(25, 28, 35);
    doc.roundedRect(x, cardY, cardW, 28, 3, 3, 'F');
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...c.color);
    doc.text(c.value, x + cardW / 2, cardY + 14, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text(c.label.toUpperCase(), x + cardW / 2, cardY + 22, { align: 'center' });
  });

  const porTorre: Record<string, ApartamentoStatus[]> = {};
  for (const s of status) {
    if (!porTorre[s.bloco]) porTorre[s.bloco] = [];
    porTorre[s.bloco].push(s);
  }

  const torres = Object.keys(porTorre).sort();
  let pageIdx = 1;

  for (const torre of torres) {
    const aptos = porTorre[torre];
    const torreConcluidos = aptos.filter((s) => statusApto(s) === 'Concluido').length;
    const torrePct = aptos.length > 0 ? Math.round((torreConcluidos / aptos.length) * 100) : 0;

    doc.addPage();
    pageIdx++;
    doc.setFillColor(12, 15, 20);
    doc.rect(0, 0, pageW, pageH, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${torre}`, margin, 22);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.text(`${torreConcluidos}/${aptos.length} concluidos (${torrePct}%)`, margin, 30);

    const barY = 34;
    const barW = pageW - margin * 2;
    doc.setFillColor(35, 38, 45);
    doc.roundedRect(margin, barY, barW, 3, 1.5, 1.5, 'F');
    if (torrePct > 0) {
      doc.setFillColor(52, 211, 153);
      doc.roundedRect(margin, barY, barW * (torrePct / 100), 3, 1.5, 1.5, 'F');
    }

    const tableData = aptos
      .sort((a, b) => a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true }))
      .map((s) => [
        s.apartamento,
        s.cybleAntesFeito ? 'Sim' : 'Nao',
        s.cybleDepoisFeito ? 'Sim' : 'Nao',
        s.qtdDocumentos > 0 ? `${s.qtdDocumentos}` : '\u2014',
        `${s.qtdFotos}`,
        statusApto(s),
      ]);

    autoTable(doc, {
      startY: 42,
      margin: { left: margin, right: margin },
      head: [['Apto', 'Antes', 'Depois', 'Docs', 'Fotos', 'Status']],
      body: tableData,
      styles: {
        fillColor: [20, 23, 30],
        textColor: [200, 200, 200],
        lineColor: [35, 38, 45],
        lineWidth: 0.3,
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [30, 33, 40],
        textColor: [160, 160, 160],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [16, 19, 26],
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw);
          if (val === 'Concluido') data.cell.styles.textColor = [52, 211, 153];
          else if (val === 'Em andamento') data.cell.styles.textColor = [251, 191, 36];
          else data.cell.styles.textColor = [239, 68, 68];
        }
      },
    });

    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Vistoria Cyble \u2014 Pagina ${pageIdx}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );
  }

  doc.addPage();
  doc.setFillColor(12, 15, 20);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text('Relatorio gerado automaticamente por Vistoria Cyble', pageW / 2, pageH / 2 - 10, { align: 'center' });
  doc.text(dataHora, pageW / 2, pageH / 2, { align: 'center' });

  const filename = `vistoria-${new Date().toISOString().slice(0, 10)}.pdf`;
  const pdfBlob = new Blob([doc.output('blob')], { type: 'application/pdf' });
  await shareFile(pdfBlob, filename, `Relatorio Vistoria Cyble - ${titulo}`);
}

export async function compartilharXLSX(status: ApartamentoStatus[], titulo: string) {
  const XLSX = await import('xlsx');

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

  const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const xlsxBlob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `vistoria-${new Date().toISOString().slice(0, 10)}.xlsx`;
  await shareFile(xlsxBlob, filename, `Planilha Vistoria Cyble - ${titulo}`);
}

// ── Exportar fotos como ZIP ──
export async function exportarZIP(
  status: ApartamentoStatus[],
  titulo: string,
  opts?: { onProgress?: (msg: string) => void }
) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // Buscar todas as fotos online
  let fotosOnline: { bloco: string; apartamento: string; foto_url: string; foto_index: number; data_leitura: string }[] = [];
  try {
    const resp = await fetch('/api/fotos');
    const data = await resp.json();
    fotosOnline = data.fotos || [];
  } catch { /* offline, segue com zip vazio de online */ }

  const aptosComFoto = status.filter((s) => s.qtdFotos > 0 || fotosOnline.some((f) => f.bloco === s.bloco && normApto(f.apartamento) === s.apartamento));
  const total = aptosComFoto.length;
  let done = 0;

  for (const s of aptosComFoto) {
    done++;
    opts?.onProgress?.(`${done}/${total} — ${s.bloco} ${s.apartamento}`);

    const folderName = `${s.bloco}/${s.apartamento}`;

    // Fotos online
    const onlineFotos = fotosOnline.filter(
      (f) => f.bloco === s.bloco && normApto(f.apartamento) === s.apartamento
    );
    for (const f of onlineFotos) {
      try {
        const resp = await fetch(f.foto_url);
        if (!resp.ok) continue;
        const blob = await resp.blob();
        const ext = f.foto_url.includes('.png') ? 'png' : 'jpg';
        const catLabel = f.foto_index === 0 ? 'cyble_antes' : f.foto_index === 1 ? 'cyble_depois' : 'documento';
        zip.file(`${folderName}/${catLabel}_${f.foto_index + 1}.${ext}`, blob);
      } catch { /* skip */ }
    }

    // Fotos locais (não sincronizadas) do IndexedDB
    try {
      const fotosLocais = await fotosDoApartamento(s.bloco, s.apartamento);
      for (const f of fotosLocais) {
        if (f.synced && f.uploadUrl) {
          // Se já está online e já foi adicionada, pular
          const jaOnline = onlineFotos.some(
            (of) => normApto(of.apartamento) === normApto(f.apartamento) &&
              ((of.foto_index === 0 && f.categoria === 'cyble_antes') ||
               (of.foto_index === 1 && f.categoria === 'cyble_depois') ||
               (of.foto_index >= 2 && f.categoria === 'documento'))
          );
          if (jaOnline) continue;
          try {
            const resp = await fetch(f.uploadUrl);
            if (!resp.ok) continue;
            const blob = await resp.blob();
            const catLabel = f.categoria === 'cyble_antes' ? 'cyble_antes' : f.categoria === 'cyble_depois' ? 'cyble_depois' : 'documento';
            zip.file(`${folderName}/${catLabel}_local_${f.timestamp}.jpg`, blob);
          } catch { /* skip */ }
        } else if (f.blob && f.blob.size > 0) {
          const catLabel = f.categoria === 'cyble_antes' ? 'cyble_antes' : f.categoria === 'cyble_depois' ? 'cyble_depois' : 'documento';
          zip.file(`${folderName}/${catLabel}_local_${f.timestamp}.jpg`, f.blob);
        }
      }
    } catch { /* skip se IndexedDB falhar */ }
  }

  if (Object.keys(zip.files).length === 0) {
    opts?.onProgress?.('Nenhuma foto encontrada');
    return;
  }

  const content = await zip.generateAsync({ type: 'blob' }, (meta) => {
    opts?.onProgress?.(`Compactando ${Math.round(meta.percent)}%`);
  });

  const filename = `vistoria-fotos-${new Date().toISOString().slice(0, 10)}.zip`;
  await shareFile(content, filename, `Fotos Vistoria Cyble - ${titulo}`);
}

function normApto(a: string): string {
  return a.replace(/^0+/, '') || '0';
}

// ── Relatório PDF com fotos ──
export async function relatorioPDFComFotos(
  status: ApartamentoStatus[],
  titulo: string,
  opts?: { onProgress?: (msg: string) => void }
) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  // Buscar todas as fotos online
  let fotosOnline: { bloco: string; apartamento: string; foto_url: string; foto_index: number; data_leitura: string }[] = [];
  try {
    const resp = await fetch('/api/fotos');
    const data = await resp.json();
    fotosOnline = data.fotos || [];
  } catch { /* offline */ }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  const dataHora = new Date().toLocaleString('pt-BR');
  const total = status.length;
  const concluidos = status.filter((s) => statusApto(s) === 'Concluido').length;
  const andamento = status.filter((s) => statusApto(s) === 'Em andamento').length;
  const pendentes = total - concluidos - andamento;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  // ── Capa ──
  doc.setFillColor(12, 15, 20);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatorio com Fotos', margin, 60);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(titulo, margin, 72);
  doc.setFontSize(11);
  doc.setTextColor(120, 120, 120);
  doc.text(`Gerado em ${dataHora}`, margin, 84);

  const cardY = 100;
  const cardW = (pageW - margin * 2 - 18) / 4;
  const cards = [
    { label: 'Concluidos', value: `${concluidos}`, color: [52, 211, 153] as [number, number, number] },
    { label: 'Andamento', value: `${andamento}`, color: [251, 191, 36] as [number, number, number] },
    { label: 'Pendentes', value: `${pendentes}`, color: [239, 68, 68] as [number, number, number] },
    { label: 'Progresso', value: `${pct}%`, color: [232, 130, 58] as [number, number, number] },
  ];
  cards.forEach((c, i) => {
    const x = margin + i * (cardW + 6);
    doc.setFillColor(25, 28, 35);
    doc.roundedRect(x, cardY, cardW, 28, 3, 3, 'F');
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...c.color);
    doc.text(c.value, x + cardW / 2, cardY + 14, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text(c.label.toUpperCase(), x + cardW / 2, cardY + 22, { align: 'center' });
  });

  // ── Páginas por apto com fotos ──
  const aptosComFoto = status.filter((s) => s.qtdFotos > 0 || fotosOnline.some((f) => f.bloco === s.bloco && normApto(f.apartamento) === s.apartamento));
  let pageIdx = 1;

  // Agrupar por torre
  const porTorre: Record<string, ApartamentoStatus[]> = {};
  for (const s of aptosComFoto) {
    if (!porTorre[s.bloco]) porTorre[s.bloco] = [];
    porTorre[s.bloco].push(s);
  }

  for (const [torre, aptos] of Object.entries(porTorre).sort(([a], [b]) => a.localeCompare(b))) {
    // Header da torre
    doc.addPage();
    pageIdx++;
    doc.setFillColor(12, 15, 20);
    doc.rect(0, 0, pageW, pageH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${torre}`, margin, 22);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.text(`${aptos.length} apartamentos`, margin, 30);

    let y = 38;

    for (const s of aptos.sort((a, b) =>
      a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true })
    )) {
      opts?.onProgress?.(`${s.bloco} ${s.apartamento}`);

      // Checar espaço na página
      if (y > pageH - 70) {
        doc.addPage();
        pageIdx++;
        doc.setFillColor(12, 15, 20);
        doc.rect(0, 0, pageW, pageH, 'F');
        doc.setTextColor(180, 180, 180);
        doc.setFontSize(10);
        doc.text(`${torre} — continuação`, margin, 16);
        y = 24;
      }

      // Header do apto
      const statusStr = statusApto(s);
      doc.setFillColor(25, 28, 35);
      doc.roundedRect(margin, y, pageW - margin * 2, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${s.apartamento}`, margin + 3, y + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (statusStr === 'Concluido') doc.setTextColor(52, 211, 153);
      else if (statusStr === 'Em andamento') doc.setTextColor(251, 191, 36);
      else doc.setTextColor(239, 68, 68);
      doc.text(statusStr, pageW - margin - 3, y + 5.5, { align: 'right' });
      y += 11;

      // Buscar fotos online deste apto
      const aptoFotosOnline = fotosOnline.filter(
        (f) => f.bloco === s.bloco && normApto(f.apartamento) === s.apartamento
      ).sort((a, b) => a.foto_index - b.foto_index);

      // Buscar fotos locais deste apto
      let aptoFotosLocais: { blob: Blob; categoria: string; timestamp: number; synced: boolean; uploadUrl?: string }[] = [];
      try {
        aptoFotosLocais = await fotosDoApartamento(s.bloco, s.apartamento);
      } catch { /* offline */ }

      // Filtrar locais que não estão online
      const locaisNaoOnline = aptoFotosLocais.filter((f) => {
        if (f.synced && f.uploadUrl) {
          return !aptoFotosOnline.some(
            (of) => ((of.foto_index === 0 && f.categoria === 'cyble_antes') ||
                     (of.foto_index === 1 && f.categoria === 'cyble_depois') ||
                     (of.foto_index >= 2 && f.categoria === 'documento'))
          );
        }
        return true;
      });

      const totalFotos = aptoFotosOnline.length + locaisNaoOnline.length;

      if (totalFotos === 0) {
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.text('Nenhuma foto', margin + 3, y + 4);
        y += 8;
        continue;
      }

      // Renderizar fotos online
      const imgW = 80;
      const imgH = 60;
      const gap = 4;
      const perRow = 2;
      let fotoIdx = 0;

      // Fotos online
      for (let i = 0; i < aptoFotosOnline.length; i++) {
        const col = fotoIdx % perRow;
        if (col === 0 && fotoIdx > 0) y += imgH + gap + 4;

        if (y + imgH + 4 > pageH - 15) {
          doc.addPage();
          pageIdx++;
          doc.setFillColor(12, 15, 20);
          doc.rect(0, 0, pageW, pageH, 'F');
          doc.setTextColor(180, 180, 180);
          doc.setFontSize(10);
          doc.text(`${torre} ${s.apartamento} — fotos`, margin, 16);
          y = 24;
        }

        const x = margin + col * (imgW + gap);
        const catLabel = aptoFotosOnline[i].foto_index === 0 ? 'Antes' : aptoFotosOnline[i].foto_index === 1 ? 'Depois' : `Doc ${aptoFotosOnline[i].foto_index - 1}`;

        try {
          const resp = await fetch(aptoFotosOnline[i].foto_url);
          if (resp.ok) {
            const blob = await resp.blob();
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });

            const img = await loadImage(dataUrl);
            const scale = Math.min(imgW / img.width, imgH / img.height);
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            const offsetX = x + (imgW - drawW) / 2;
            const offsetY = y + (imgH - drawH) / 2;

            doc.setFillColor(35, 38, 45);
            doc.roundedRect(x, y, imgW, imgH, 2, 2, 'F');
            doc.addImage(dataUrl, 'JPEG', offsetX, offsetY, drawW, drawH);

            doc.setTextColor(160, 160, 160);
            doc.setFontSize(7);
            doc.text(catLabel, x + 2, y + imgH + 3);
          }
        } catch { /* skip foto com erro */ }
        fotoIdx++;
      }

      // Fotos locais não sincronizadas
      for (let i = 0; i < locaisNaoOnline.length; i++) {
        const col = fotoIdx % perRow;
        if (col === 0 && fotoIdx > 0) y += imgH + gap + 4;

        if (y + imgH + 4 > pageH - 15) {
          doc.addPage();
          pageIdx++;
          doc.setFillColor(12, 15, 20);
          doc.rect(0, 0, pageW, pageH, 'F');
          doc.setTextColor(180, 180, 180);
          doc.setFontSize(10);
          doc.text(`${torre} ${s.apartamento} — fotos`, margin, 16);
          y = 24;
        }

        const x = margin + col * (imgW + gap);
        const catLabel = locaisNaoOnline[i].categoria === 'cyble_antes' ? 'Antes' : locaisNaoOnline[i].categoria === 'cyble_depois' ? 'Depois' : 'Documento';

        try {
          let blob = locaisNaoOnline[i].blob;
          if (locaisNaoOnline[i].synced && locaisNaoOnline[i].uploadUrl && blob.size === 0) {
            const resp = await fetch(locaisNaoOnline[i].uploadUrl!);
            if (resp.ok) blob = await resp.blob();
          }
          if (blob.size === 0) continue;

          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          const img = await loadImage(dataUrl);
          const scale = Math.min(imgW / img.width, imgH / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const offsetX = x + (imgW - drawW) / 2;
          const offsetY = y + (imgH - drawH) / 2;

          doc.setFillColor(35, 38, 45);
          doc.roundedRect(x, y, imgW, imgH, 2, 2, 'F');
          doc.addImage(dataUrl, 'JPEG', offsetX, offsetY, drawW, drawH);

          doc.setTextColor(160, 160, 160);
          doc.setFontSize(7);
          doc.text(`${catLabel} (local)`, x + 2, y + imgH + 3);
        } catch { /* skip foto com erro */ }
        fotoIdx++;
      }

      y += imgH + gap + 8;
    }

    // Footer da torre
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(`Vistoria Cyble — Pagina ${pageIdx}`, pageW / 2, pageH - 8, { align: 'center' });
  }

  // Rodapé final
  doc.addPage();
  doc.setFillColor(12, 15, 20);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text('Relatorio com fotos gerado por Vistoria Cyble', pageW / 2, pageH / 2 - 10, { align: 'center' });
  doc.text(dataHora, pageW / 2, pageH / 2, { align: 'center' });

  const filename = `vistoria-fotos-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
