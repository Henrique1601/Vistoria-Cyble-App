'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CalendarDots } from '@phosphor-icons/react';
import { criarAgendamento } from '@/lib/db';
import { haptic } from '@/lib/haptic';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface QuickScheduleModalProps {
  bloco: string;
  apto: string;
  onFechar: () => void;
  onSalvo: () => void;
}

export default function QuickScheduleModal({ bloco, apto, onFechar, onSalvo }: QuickScheduleModalProps) {
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    if (!data) return;
    haptic('medium');
    setSalvando(true);
    await criarAgendamento({
      bloco,
      apartamento: apto,
      data,
      concluido: false,
      observacao: obs || undefined,
    });
    setSalvando(false);
    onSalvo();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={spring}
        className="bg-base-raised border border-base-border rounded-2xl w-full max-w-sm p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDots size={18} weight="duotone" className="text-accent" />
            <h2 className="text-base font-bold">Agendar</h2>
          </div>
          <button
            onClick={onFechar}
            className="tactile-press flex items-center justify-center w-8 h-8 rounded-lg text-content-tertiary hover:text-content transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="bg-base-overlay rounded-xl px-4 py-2.5">
          <span className="text-sm font-semibold text-content">{bloco}</span>
          <span className="text-sm text-content-secondary ml-2">{apto}</span>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-content-tertiary mb-1.5 block">
            Data
          </label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full bg-base-overlay border border-base-border rounded-xl px-4 py-2.5 text-sm text-content focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-content-tertiary mb-1.5 block">
            Observacao (opcional)
          </label>
          <input
            type="text"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex: vistoria inicial"
            className="w-full bg-base-overlay border border-base-border rounded-xl px-4 py-2.5 text-sm text-content placeholder:text-content-tertiary/50 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <button
          onClick={handleSalvar}
          disabled={!data || salvando}
          className="tactile-press w-full bg-accent text-base font-semibold text-sm rounded-xl px-6 py-3 hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          {salvando ? 'Salvando...' : 'Agendar'}
        </button>
      </motion.div>
    </motion.div>
  );
}
