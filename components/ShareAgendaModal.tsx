'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Share,
  Copy,
  CalendarDots,
  CheckCircle,
  Warning,
  Clock,
  TrendUp,
} from '@phosphor-icons/react';
import { haptic } from '@/lib/haptic';
import { useToast } from '@/components/Toast';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface Agendamento {
  id: number;
  bloco: string;
  apartamento: string;
  data: string;
  hora?: string;
  concluido: boolean;
  observacao: string | null;
  criado_em: string;
}

type Periodo = 'hoje' | 'semana' | '7dias' | '15dias' | '30dias' | 'todos';

interface ShareAgendaModalProps {
  open: boolean;
  onClose: () => void;
  agendamentos: Agendamento[];
  today: string;
}

function formatarDataBR(data: string): string {
  const [y, m, d] = data.split('-');
  return `${d}/${m}/${y}`;
}

function getDateRange(periodo: Periodo, today: string): { inicio: string; fim: string } {
  const todayDate = new Date(today + 'T12:00:00');
  const fim = '9999-12-31';

  switch (periodo) {
    case 'hoje':
      return { inicio: today, fim: today };
    case 'semana': {
      const day = todayDate.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(todayDate);
      monday.setDate(monday.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return {
        inicio: monday.toISOString().slice(0, 10),
        fim: sunday.toISOString().slice(0, 10),
      };
    }
    case '7dias': {
      const end = new Date(todayDate);
      end.setDate(end.getDate() + 7);
      return { inicio: today, fim: end.toISOString().slice(0, 10) };
    }
    case '15dias': {
      const end = new Date(todayDate);
      end.setDate(end.getDate() + 15);
      return { inicio: today, fim: end.toISOString().slice(0, 10) };
    }
    case '30dias': {
      const end = new Date(todayDate);
      end.setDate(end.getDate() + 30);
      return { inicio: today, fim: end.toISOString().slice(0, 10) };
    }
    case 'todos':
      return { inicio: '0000-01-01', fim };
  }
}

function gerarTextoAgenda(
  agendamentos: Agendamento[],
  periodo: Periodo,
  today: string,
): string {
  const { inicio, fim } = getDateRange(periodo, today);

  const filtrados = agendamentos
    .filter((a) => a.data >= inicio && a.data <= fim)
    .sort((a, b) => {
      const dc = a.data.localeCompare(b.data);
      return dc !== 0 ? dc : (a.hora || '99:99').localeCompare(b.hora || '99:99');
    });

  const atrasados = filtrados.filter((a) => !a.concluido && a.data < today);
  const pendentes = filtrados.filter((a) => !a.concluido && a.data >= today);
  const concluidos = filtrados.filter((a) => a.concluido);

  const periodoLabel: Record<Periodo, string> = {
    hoje: 'Hoje',
    semana: 'Esta Semana',
    '7dias': 'Proximos 7 Dias',
    '15dias': 'Proximos 15 Dias',
    '30dias': 'Proximos 30 Dias',
    todos: 'Todos',
  };

  let texto = `Agenda Vistoria Cyble — ${periodoLabel[periodo]}\n`;
  texto += `${formatarDataBR(today)}\n`;
  texto += `${'─'.repeat(30)}\n\n`;

  if (atrasados.length > 0) {
    texto += `ATRASADOS (${atrasados.length})\n`;
    for (const a of atrasados) {
      const hora = a.hora ? ` ${a.hora}` : '';
      const obs = a.observacao ? ` (${a.observacao})` : '';
      texto += `  ${a.bloco} — Apto ${a.apartamento} — ${formatarDataBR(a.data)}${hora}${obs}\n`;
    }
    texto += '\n';
  }

  if (pendentes.length > 0) {
    texto += `PENDENTES (${pendentes.length})\n`;
    for (const a of pendentes) {
      const hora = a.hora ? ` ${a.hora}` : '';
      const obs = a.observacao ? ` (${a.observacao})` : '';
      texto += `  ${a.bloco} — Apto ${a.apartamento} — ${formatarDataBR(a.data)}${hora}${obs}\n`;
    }
    texto += '\n';
  }

  if (concluidos.length > 0) {
    texto += `CONCLUIDOS (${concluidos.length})\n`;
    for (const a of concluidos) {
      const hora = a.hora ? ` ${a.hora}` : '';
      texto += `  ${a.bloco} — Apto ${a.apartamento} — ${formatarDataBR(a.data)}${hora}\n`;
    }
    texto += '\n';
  }

  const total = filtrados.length;
  texto += `${'─'.repeat(30)}\n`;
  texto += `Total: ${total} | Pendentes: ${pendentes.length} | Concluidos: ${concluidos.length} | Atrasados: ${atrasados.length}\n`;

  return texto;
}

export default function ShareAgendaModal({
  open,
  onClose,
  agendamentos,
  today,
}: ShareAgendaModalProps) {
  const { toast } = useToast();
  const [periodo, setPeriodo] = useState<Periodo>('hoje');
  const [copied, setCopied] = useState(false);

  const texto = useMemo(
    () => gerarTextoAgenda(agendamentos, periodo, today),
    [agendamentos, periodo, today],
  );

  const periodoOpcoes: { key: Periodo; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'semana', label: 'Semana' },
    { key: '7dias', label: '7 dias' },
    { key: '15dias', label: '15 dias' },
    { key: '30dias', label: '30 dias' },
    { key: 'todos', label: 'Todos' },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      haptic('success');
      setCopied(true);
      toast('Copiado para a area de transferencia', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Erro ao copiar', 'error');
    }
  };

  const handleShare = async () => {
    haptic('light');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Agenda Vistoria Cyble',
          text: texto,
        });
      } catch {
        // user cancelled
      }
    } else {
      await handleCopy();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-[440px] max-h-[85vh] bg-base-raised border border-base-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-border">
              <div className="flex items-center gap-2">
                <CalendarDots size={20} weight="duotone" className="text-accent" />
                <h2 className="text-base font-bold text-content">Compartilhar Agenda</h2>
              </div>
              <button
                onClick={onClose}
                className="tactile-press flex items-center justify-center w-8 h-8 rounded-lg text-content-tertiary hover:text-content hover:bg-base-hover transition-colors"
                aria-label="Fechar"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Period selector */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-xs font-semibold text-content-tertiary uppercase tracking-wider mb-2">
                Periodo
              </p>
              <div className="flex flex-wrap gap-1.5">
                {periodoOpcoes.map((op) => (
                  <button
                    key={op.key}
                    onClick={() => {
                      haptic('selection');
                      setPeriodo(op.key);
                    }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                      periodo === op.key
                        ? 'bg-accent-dim border-accent text-accent'
                        : 'bg-base border-base-border text-content-tertiary hover:text-content'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-auto px-5 py-3">
              <p className="text-xs font-semibold text-content-tertiary uppercase tracking-wider mb-2">
                Preview
              </p>
              <pre className="text-[11px] font-mono text-content bg-base p-3 rounded-xl border border-base-border whitespace-pre-wrap leading-relaxed overflow-auto max-h-[40vh]">
                {texto}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 py-4 border-t border-base-border">
              <button
                onClick={handleCopy}
                className="tactile-press flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-base border border-base-border text-content-secondary font-semibold text-sm hover:bg-base-hover transition-colors"
              >
                {copied ? (
                  <CheckCircle size={16} weight="fill" className="text-success" />
                ) : (
                  <Copy size={16} weight="bold" />
                )}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={handleShare}
                className="tactile-press flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-base font-semibold text-sm hover:bg-accent-hover transition-colors"
              >
                <Share size={16} weight="bold" />
                Compartilhar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
