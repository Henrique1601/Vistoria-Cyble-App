import { shareFile } from './utils';

interface Agendamento {
  id: number;
  bloco: string;
  apartamento: string;
  data: string;
  hora?: string;
  concluido: boolean;
  observacao: string | null;
}

function formatarDataBR(data: string): string {
  const [y, m, d] = data.split('-');
  return `${d}/${m}/${y}`;
}

function compararAgendamentos(a: Agendamento, b: Agendamento): number {
  const dataCmp = a.data.localeCompare(b.data);
  if (dataCmp !== 0) return dataCmp;
  return (a.hora || '99:99').localeCompare(b.hora || '99:99');
}

export async function exportarAgendaPDF(
  agendamentos: Agendamento[],
  titulo: string = 'Agenda de Vistorias',
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const today = new Date().toISOString().slice(0, 10);

  const atrasados = agendamentos.filter((a) => !a.concluido && a.data < today).sort(compararAgendamentos);
  const pendentes = agendamentos.filter((a) => !a.concluido && a.data >= today).sort(compararAgendamentos);
  const concluidos = agendamentos.filter((a) => a.concluido).sort(compararAgendamentos);

  // Header
  doc.setFillColor(12, 15, 20);
  doc.rect(0, 0, pageW, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, margin, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, 28);
  doc.text(
    `Total: ${agendamentos.length} | Pendentes: ${pendentes.length} | Atrasados: ${atrasados.length} | Concluidos: ${concluidos.length}`,
    margin,
    35,
  );

  let y = 48;

  // Helper to draw a section
  function drawSection(label: string, items: Agendamento[], color: [number, number, number]) {
    if (items.length === 0) return;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(`${label} (${items.length})`, margin, y);
    y += 2;

    const rows = items.map((a) => [
      a.bloco,
      a.apartamento,
      formatarDataBR(a.data),
      a.hora || '-',
      a.observacao || '-',
      a.concluido ? 'Sim' : 'Nao',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Torre', 'Apto', 'Data', 'Hora', 'Obs', 'Concluido']],
      body: rows,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: color,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 30, 30],
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 18 },
        2: { cellWidth: 25 },
        3: { cellWidth: 18 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 20 },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Draw sections
  if (atrasados.length > 0) {
    drawSection('Atrasados', atrasados, [220, 50, 50]);
  }

  if (pendentes.length > 0) {
    drawSection('Pendentes', pendentes, [232, 130, 58]);
  }

  if (concluidos.length > 0) {
    drawSection('Concluidos', concluidos, [34, 197, 94]);
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Vistoria Cyble', margin, pageH - 8);
  doc.text(`Pagina 1`, pageW - margin, pageH - 8, { align: 'right' });

  // Save
  const filename = `agenda-vistoria-${today}.pdf`;
  const blob = doc.output('blob');
  await shareFile(blob, filename, `Agenda Vistoria Cyble - ${titulo}`);
}
