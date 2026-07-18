import type { ApartamentoStatus } from '../db';
import { statusApto, shareFile, normApto, loadImage } from './utils';

async function buildPDF(status: ApartamentoStatus[], titulo: string) {
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

  // Capa
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

  // Cards
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

  // Tabelas por torre
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
      alternateRowStyles: { fillColor: [16, 19, 26] },
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
    doc.text(`Vistoria Cyble \u2014 Pagina ${pageIdx}`, pageW / 2, pageH - 8, { align: 'center' });
  }

  // Rodape
  doc.addPage();
  doc.setFillColor(12, 15, 20);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text('Relatorio gerado automaticamente por Vistoria Cyble', pageW / 2, pageH / 2 - 10, { align: 'center' });
  doc.text(dataHora, pageW / 2, pageH / 2, { align: 'center' });

  return { doc, dataHora };
}

export async function exportarPDF(status: ApartamentoStatus[], titulo: string) {
  const { doc, dataHora } = await buildPDF(status, titulo);
  const filename = `vistoria-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export async function compartilharPDF(status: ApartamentoStatus[], titulo: string) {
  const { doc, dataHora } = await buildPDF(status, titulo);
  const filename = `vistoria-${new Date().toISOString().slice(0, 10)}.pdf`;
  const pdfBlob = new Blob([doc.output('blob')], { type: 'application/pdf' });
  await shareFile(pdfBlob, filename, `Relatorio Vistoria Cyble - ${titulo}`);
}

export async function relatorioPDFComFotos(
  status: ApartamentoStatus[],
  titulo: string,
  opts?: { onProgress?: (msg: string) => void }
) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

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

  // Capa
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

  // Paginas por apto com fotos
  const aptosComFoto = status.filter((s) => s.qtdFotos > 0 || fotosOnline.some((f) => f.bloco === s.bloco && normApto(f.apartamento) === s.apartamento));
  let pageIdx = 1;

  const porTorre: Record<string, ApartamentoStatus[]> = {};
  for (const s of aptosComFoto) {
    if (!porTorre[s.bloco]) porTorre[s.bloco] = [];
    porTorre[s.bloco].push(s);
  }

  for (const [torre, aptos] of Object.entries(porTorre).sort(([a], [b]) => a.localeCompare(b))) {
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
    doc.text(`${aptos.length} apartamento(s)`, margin, 30);

    let y = 40;

    for (const s of aptos.sort((a, b) => a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true }))) {
      opts?.onProgress?.(`${torre} ${s.apartamento}`);

      if (y > pageH - 80) {
        doc.addPage();
        pageIdx++;
        doc.setFillColor(12, 15, 20);
        doc.rect(0, 0, pageW, pageH, 'F');
        y = 20;
      }

      // Header do apto
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(232, 130, 58);
      doc.text(`${s.apartamento}`, margin, y);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 160);
      doc.text(`\u2014 ${statusApto(s)}`, margin + 25, y);
      y += 6;

      // Fotos online
      const onlineFotos = fotosOnline.filter(
        (f) => f.bloco === s.bloco && normApto(f.apartamento) === s.apartamento
      );

      for (const foto of onlineFotos) {
        try {
          const img = await loadImage(foto.foto_url);
          const imgW = pageW - margin * 2;
          const imgH = (img.height / img.width) * imgW;
          const maxH = 60;
          const finalH = Math.min(imgH, maxH);
          const finalW = (finalH / imgH) * imgW;

          if (y + finalH > pageH - 20) {
            doc.addPage();
            pageIdx++;
            doc.setFillColor(12, 15, 20);
            doc.rect(0, 0, pageW, pageH, 'F');
            y = 20;
          }

          doc.addImage(foto.foto_url, 'JPEG', margin, y, finalW, finalH);
          y += finalH + 4;
        } catch {
          // Imagem não carregou
        }
      }

      y += 6;
    }

    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(`Vistoria Cyble \u2014 Pagina ${pageIdx}`, pageW / 2, pageH - 8, { align: 'center' });
  }

  // Rodape final
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
