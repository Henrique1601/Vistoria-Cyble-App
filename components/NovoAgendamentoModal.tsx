'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CalendarDots, Buildings, ListNumbers } from '@phosphor-icons/react';
import { criarAgendamento } from '@/lib/db';
import { haptic } from '@/lib/haptic';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface NovoAgendamentoModalProps {
  blocos: Record<string, string[]>;
  onFechar: () => void;
  onSalvo: () => void;
}

export default function NovoAgendamentoModal({ blocos, onFechar, onSalvo }: NovoAgendamentoModalProps) {
  const [bloco, setBloco] = useState('');
  const [apto, setApto] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  const listaAptos = bloco ? (blocos[bloco] || []) : [];
  const blocosNomes = Object.keys(blocos);

  async function handleSalvar() {
    if (!bloco || !apto || !data) return;
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
        className="bg-base-raised border border-base-border rounded-2xl w-full max-w-md p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDots size={18} weight="duotone" className="text-accent" />
            <h2 className="text-lg font-bold">Novo Agendamento</h2>
          </div>
          <button
            onClick={onFechar}
            className="tactile-press flex items-center justify-center w-8 h-8 rounded-lg text-content-tertiary hover:text-content transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-content-tertiary mb-1.5 block">
              Bloco / Torre
            </label>
            <div className="relative">
              <Buildings size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
              <select
                value={bloco}
                onChange={(e) => { setBloco(e.target.value); setApto(''); }}
                className="w-full bg-base-overlay border border-base-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-content appearance-none focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Selecionar...</option>
                {blocosNomes.map((b) => (
                  <option key={b} value={b}>{b} ({blocos[b].length} aptos)</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-content-tertiary mb-1.5 block">
              Apartamento
            </label>
            <div className="relative">
              <ListNumbers size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
              <select
                value={apto}
                onChange={(e) => setApto(e.target.value)}
                disabled={!bloco}
                className="w-full bg-base-overlay border border-base-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-content appearance-none focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-40"
              >
                <option value="">Selecionar...</option>
                {listaAptos.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
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
        </div>

        <button
          onClick={handleSalvar}
          disabled={!bloco || !apto || !data || salvando}
          className="tactile-press w-full bg-accent text-base font-semibold text-sm rounded-xl px-6 py-3 hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          {salvando ? 'Salvando...' : 'Agendar'}
        </button>
      </motion.div>
    </motion.div>
  );
}
