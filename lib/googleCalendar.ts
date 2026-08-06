interface Agendamento {
  id: number;
  bloco: string;
  apartamento: string;
  data: string;
  hora?: string;
  concluido: boolean;
  observacao: string | null;
}

/**
 * Gera URL do Google Calendar para adicionar um agendamento
 * https://calendar.google.com/calendar/render?action=TEMPLATE&...
 */
export function gerarUrlGoogleCalendar(ag: Agendamento): string {
  const titulo = `Vistoria ${ag.bloco} - Apto ${ag.apartamento}`;
  const detalhes = ag.observacao
    ? `Observacao: ${ag.observacao}\n\nAgendado via Vistoria Cyble`
    : 'Agendado via Vistoria Cyble';

  // Format dates for Google Calendar (YYYYMMDDTHHMMSS or YYYYMMDD)
  const dataInicio = ag.hora
    ? `${ag.data.replace(/-/g, '')}T${ag.hora.replace(':', '')}00`
    : `${ag.data.replace(/-/g, '')}T090000`;
  const dataFim = ag.hora
    ? `${ag.data.replace(/-/g, '')}T${ag.hora.replace(':', '')}00`
    : `${ag.data.replace(/-/g, '')}T100000`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo,
    details: detalhes,
    dates: `${dataInicio}/${dataFim}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Abre Google Calendar em nova aba para adicionar o agendamento
 */
export function abrirGoogleCalendar(ag: Agendamento) {
  const url = gerarUrlGoogleCalendar(ag);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Gera arquivo .ics (iCalendar) para importação em lote
 * Compatível com Google Calendar, Apple Calendar, Outlook
 */
export function gerarICS(agendamentos: Agendamento[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vistoria Cyble//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Agenda Vistoria Cyble',
  ];

  for (const ag of agendamentos) {
    const dataInicio = ag.hora
      ? `${ag.data.replace(/-/g, '')}T${ag.hora.replace(':', '')}00`
      : `${ag.data.replace(/-/g, '')}T090000`;
    const dataFim = ag.hora
      ? `${ag.data.replace(/-/g, '')}T${ag.hora.replace(':', '')}00`
      : `${ag.data.replace(/-/g, '')}T100000`;

    const titulo = `Vistoria ${ag.bloco} - Apto ${ag.apartamento}`;
    const detalhes = ag.observacao
      ? `Observacao: ${ag.observacao}\\nAgendado via Vistoria Cyble`
      : 'Agendado via Vistoria Cyble';

    lines.push(
      'BEGIN:VEVENT',
      `DTSTART:${dataInicio}`,
      `DTEND:${dataFim}`,
      `SUMMARY:${titulo}`,
      `DESCRIPTION:${detalhes}`,
      `UID:vistoria-${ag.id}@cyble.app`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Download do arquivo .ics
 */
export function downloadICS(agendamentos: Agendamento[]) {
  const ics = gerarICS(agendamentos);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'agenda-vistoria-cyble.ics';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Compartilha .ics via Web Share API
 */
export async function compartilharICS(agendamentos: Agendamento[]): Promise<boolean> {
  const ics = gerarICS(agendamentos);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const file = new File([blob], 'agenda-vistoria-cyble.ics', { type: 'text/calendar' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Agenda Vistoria Cyble',
        files: [file],
      });
      return true;
    } catch {
      return false;
    }
  }

  // Fallback: download
  downloadICS(agendamentos);
  return true;
}
