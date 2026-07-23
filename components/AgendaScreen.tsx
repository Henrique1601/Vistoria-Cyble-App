'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDots,
  CheckCircle,
  Circle,
  Trash,
  ArrowRight,
  Plus,
  Warning,
} from '@phosphor-icons/react';
import {
  listarAgendamentos,
  toggleConcluidoAgendamento,
  excluirAgendamento,
  type Agendamento,
} from '@/lib/db';
import { haptic } from '@/lib/haptic';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

function formatarDataBR(data: string): string {
  const [y, m, d] = data.split('-');
  return `${d}/${m}/${y}`;
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function compararDatas(a: string, b: string): number {
  return a.localeCompare(b);
}

interface AgendaScreenProps {
  onNavegarPara: (bloco: string, apto: string) => void;
  onVoltar: () => void;
  onNovoAgendamento: () => void;
}

export default function AgendaScreen({
  onNavegarPara,
  onVoltar,
  onNovoAgendamento,
}: AgendaScreenProps) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const today = hoje();

  async function carregar() {
    const lista = await listarAgendamentos();
    setAgendamentos(lista.sort((a, b) => compararDatas(a.data, b.data) || b.criadoEm - a.criadoEm));
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleToggle(id: number) {
    haptic('light');
    await toggleConcluidoAgendamento(id);
    await carregar();
  }

  async function handleExcluir(id: number) {
    haptic('medium');
    await excluirAgendamento(id);
    await carregar();
  }

  const pendentes = agendamentos.filter((a) => !a.concluido);
  const concluidos = agendamentos.filter((a) => a.concluido);

  const atrasados = pendentes.filter((a) => a.data < today);
  const Hoje = pendentes.filter((a) => a.data === today);
  const futuros = pendentes.filter((a) => a.data > today);

  function renderGrupo(titulo: string, items: Agendamento[], cor: string) {
    if (items.length === 0) return null;
    return (
      <div className="mb-5">
        <h3 className={`text-xs font-semibold uppercase tracking-widest ${cor} mb-2 px-1`}>
          {titulo} ({items.length})
        </h3>
        <div className="space-y-2">
          {items.map((ag) => (
            <motion.div
              key={ag.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-base-raised border border-base-border rounded-xl p-3 flex items-center gap-3"
            >
              <button
                onClick={() => ag.id !== undefined && handleToggle(ag.id)}
                className="shrink-0"
                aria-label={ag.concluido ? 'Marcar como pendente' : 'Marcar como concluido'}
              >
                {ag.concluido ? (
                  <CheckCircle size={22} weight="fill" className="text-success" />
                ) : (
                  <Circle size={22} weight="regular" className="text-content-tertiary hover:text-accent transition-colors" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-content truncate">{ag.bloco}</span>
                  <span className="text-sm text-content-secondary">{ag.apartamento}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <CalendarDots size={12} weight="bold" className="text-content-tertiary" />
                  <span className="text-[11px] font-mono text-content-tertiary">
                    {formatarDataBR(ag.data)}
                  </span>
                  {ag.observacao && (
                    <span className="text-[11px] text-content-tertiary truncate">— {ag.observacao}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onNavegarPara(ag.bloco, ag.apartamento)}
                  className="tactile-press flex items-center justify-center w-9 h-9 rounded-lg bg-accent-dim text-accent hover:bg-accent/20 transition-colors"
                  aria-label={`Ir para ${ag.bloco} ${ag.apartamento}`}
                >
                  <ArrowRight size={16} weight="bold" />
                </button>
                <button
                  onClick={() => ag.id !== undefined && handleExcluir(ag.id)}
                  className="tactile-press flex items-center justify-center w-9 h-9 rounded-lg text-content-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                  aria-label="Excluir agendamento"
                >
                  <Trash size={14} weight="bold" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-base px-4 pt-6 pb-24 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_0_4px_rgba(232,130,58,0.2)]" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
          </div>
          <p className="text-sm text-content-tertiary ml-5">
            {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''} / {concluidos.length} concluido{concluidos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onNovoAgendamento}
          className="tactile-press flex items-center gap-2 bg-accent text-base font-semibold text-sm rounded-xl px-4 py-2.5 hover:bg-accent-hover transition-colors"
        >
          <Plus size={16} weight="bold" />
          Novo
        </button>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-base-raised border border-base-border rounded-xl p-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-base-overlay rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-base-overlay rounded w-1/3" />
                  <div className="h-2 bg-base-overlay rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : agendamentos.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <CalendarDots size={40} weight="light" className="mx-auto text-content-tertiary mb-4" />
          <p className="text-sm text-content-tertiary mb-1">Nenhum agendamento</p>
          <p className="text-xs text-content-tertiary">
            Toque em &quot;Novo&quot; para agendar um apartamento
          </p>
        </motion.div>
      ) : (
        <AnimatePresence>
          {renderGrupo('Atrasados', atrasados, 'text-danger')}
          {renderGrupo('Hoje', Hoje, 'text-accent')}
          {renderGrupo('Futuros', futuros, 'text-content-tertiary')}
          {concluidos.length > 0 && renderGrupo('Concluidos', concluidos, 'text-success')}
        </AnimatePresence>
      )}
    </main>
  );
}
