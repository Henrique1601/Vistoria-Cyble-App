'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDots,
  CheckCircle,
  Circle,
  Trash,
  ArrowRight,
  Plus,
  Warning,
  PencilSimple,
} from '@phosphor-icons/react';
import { haptic } from '@/lib/haptic';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface Agendamento {
  id: number;
  bloco: string;
  apartamento: string;
  data: string;
  concluido: boolean;
  observacao: string | null;
  criado_em: string;
}

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
  onEditar: (agendamento: Agendamento) => void;
}

export default function AgendaScreen({
  onNavegarPara,
  onVoltar,
  onNovoAgendamento,
  onEditar,
}: AgendaScreenProps) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const today = hoje();

  const carregar = useCallback(async () => {
    try {
      const resp = await fetch('/api/agendamentos');
      const data = await resp.json();
      setAgendamentos(data.agendamentos || []);
    } catch {
      // offline fallback — mantem o que ja tem
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleToggle = useCallback(async (ag: Agendamento) => {
    haptic('light');
    const novoConcluido = !ag.concluido;
    // Optimistic update
    setAgendamentos((prev) =>
      prev.map((a) => (a.id === ag.id ? { ...a, concluido: novoConcluido } : a))
    );
    try {
      await fetch('/api/agendamentos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ag.id, concluido: novoConcluido }),
      });
    } catch {
      // rollback
      setAgendamentos((prev) =>
        prev.map((a) => (a.id === ag.id ? { ...a, concluido: !novoConcluido } : a))
      );
    }
  }, []);

  const handleExcluir = useCallback(async (id: number) => {
    haptic('medium');
    const anteriores = agendamentos;
    setAgendamentos((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch('/api/agendamentos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      setAgendamentos(anteriores);
    }
  }, [agendamentos]);

  const atrasados = agendamentos.filter((a) => !a.concluido && a.data < today);
  const hojeLista = agendamentos.filter((a) => !a.concluido && a.data === today);
  const futuros = agendamentos.filter((a) => !a.concluido && a.data > today);
  const concluidos = agendamentos.filter((a) => a.concluido);

  function renderGrupo(titulo: string, items: Agendamento[], cor: string) {
    if (items.length === 0) return null;
    return (
      <div className="mb-5">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${cor} mb-2 px-1`}>
          {titulo} ({items.length})
        </h3>
        <div className="space-y-2">
          {items.map((ag) => (
            <motion.div
              key={ag.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring}
              className={`flex items-center gap-3 bg-base-raised border border-base-border rounded-xl px-4 py-3 ${
                ag.concluido ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() => handleToggle(ag)}
                className="shrink-0"
                aria-label={ag.concluido ? 'Marcar como pendente' : 'Marcar como concluido'}
              >
                {ag.concluido ? (
                  <CheckCircle size={22} weight="fill" className="text-success" />
                ) : (
                  <Circle size={22} weight="regular" className="text-content-tertiary" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-content truncate">{ag.bloco}</span>
                  <span className="text-sm text-content-secondary font-mono">{ag.apartamento}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
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
                  onClick={() => onEditar(ag)}
                  className="tactile-press flex items-center justify-center w-9 h-9 rounded-lg text-content-tertiary hover:text-accent hover:bg-accent/10 transition-colors"
                  aria-label="Editar agendamento"
                >
                  <PencilSimple size={14} weight="bold" />
                </button>
                <button
                  onClick={() => handleExcluir(ag.id)}
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
    <div className="min-h-screen bg-base p-4 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onVoltar}
            className="tactile-press flex items-center justify-center w-10 h-10 rounded-xl bg-base-raised border border-base-border text-content-secondary hover:text-content transition-colors"
            aria-label="Voltar"
          >
            <ArrowRight size={18} weight="bold" className="rotate-180" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-content flex items-center gap-2">
              <CalendarDots size={20} weight="duotone" className="text-accent" />
              Agenda
            </h1>
            <p className="text-xs text-content-tertiary">
              {agendamentos.filter((a) => !a.concluido).length} pendente(s)
            </p>
          </div>
        </div>
        <button
          onClick={onNovoAgendamento}
          className="tactile-press flex items-center justify-center w-10 h-10 rounded-xl bg-accent text-base hover:bg-accent-hover transition-colors"
          aria-label="Novo agendamento"
        >
          <Plus size={18} weight="bold" />
        </button>
      </motion.div>

      {/* Conteudo */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : agendamentos.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <CalendarDots size={48} weight="light" className="text-content-tertiary/30 mb-4" />
          <p className="text-sm text-content-tertiary">Nenhum agendamento</p>
          <p className="text-xs text-content-tertiary/60 mt-1">
            Toque no + para criar um novo
          </p>
        </motion.div>
      ) : (
        <div>
          {renderGrupo('Atrasados', atrasados, 'text-danger')}
          {renderGrupo('Hoje', hojeLista, 'text-accent')}
          {renderGrupo('Futuros', futuros, 'text-content-secondary')}
          {renderGrupo('Concluidos', concluidos, 'text-success')}
        </div>
      )}
    </div>
  );
}
