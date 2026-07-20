'use client';

import { Warning, ArrowDown } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@/lib/motion';

interface Atrasado {
  bloco: string;
  apartamento: string;
  diasSemFoto?: number;
}

interface AtrasadosSectionProps {
  aptosEsquecidos: Atrasado[];
  showAtrasados: boolean;
  diasAlerta: number;
  onToggle: () => void;
  onDiasChange: (d: number) => void;
  onSelect: (bloco: string, apto: string) => void;
}

export function AtrasadosSection({
  aptosEsquecidos,
  showAtrasados,
  diasAlerta,
  onToggle,
  onDiasChange,
  onSelect,
}: AtrasadosSectionProps) {
  if (aptosEsquecidos.length === 0) return null;

  const porBloco = aptosEsquecidos.reduce((acc, a) => {
    if (!acc[a.bloco]) acc[a.bloco] = [];
    acc[a.bloco].push(a);
    return acc;
  }, {} as Record<string, Atrasado[]>);
  const blocosOrdenados = Object.keys(porBloco).sort();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.2 }}
      className="mb-6 bg-danger/5 border border-danger/20 rounded-2xl overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
        aria-expanded={showAtrasados}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Warning size={14} weight="bold" className="text-danger flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-danger">
              {aptosEsquecidos.length} atrasado{aptosEsquecidos.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!showAtrasados && (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onDiasChange(Math.max(1, diasAlerta - 1))}
                className="tactile-press w-6 h-6 rounded-lg bg-danger/10 text-danger text-xs font-bold hover:bg-danger/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                aria-label="Diminuir dias"
              >
                -
              </button>
              <span className="text-[11px] font-mono text-danger w-8 text-center">{diasAlerta}d</span>
              <button
                onClick={() => onDiasChange(diasAlerta + 1)}
                className="tactile-press w-6 h-6 rounded-lg bg-danger/10 text-danger text-xs font-bold hover:bg-danger/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                aria-label="Aumentar dias"
              >
                +
              </button>
            </div>
          )}
          <motion.span
            animate={{ rotate: showAtrasados ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-danger"
          >
            <ArrowDown size={14} weight="bold" />
          </motion.span>
        </div>
      </button>

      <AnimatePresence>
        {showAtrasados && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="flex items-center justify-end gap-1.5 mb-2">
                <button
                  onClick={() => onDiasChange(Math.max(1, diasAlerta - 1))}
                  className="tactile-press w-6 h-6 rounded-lg bg-danger/10 text-danger text-xs font-bold hover:bg-danger/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                  aria-label="Diminuir dias"
                >
                  -
                </button>
                <span className="text-[11px] font-mono text-danger w-8 text-center">{diasAlerta}d</span>
                <button
                  onClick={() => onDiasChange(diasAlerta + 1)}
                  className="tactile-press w-6 h-6 rounded-lg bg-danger/10 text-danger text-xs font-bold hover:bg-danger/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                  aria-label="Aumentar dias"
                >
                  +
                </button>
              </div>
              <div className="space-y-2">
                {blocosOrdenados.map((bloco) => (
                  <div key={bloco} className="bg-danger/5 rounded-xl p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-danger">{bloco}</span>
                      <span className="text-[10px] font-mono text-danger/70">{porBloco[bloco].length} apto{porBloco[bloco].length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {porBloco[bloco].map((a) => (
                        <button
                          key={`${a.bloco}__${a.apartamento}`}
                          onClick={() => onSelect(a.bloco, a.apartamento)}
                          className="tactile-press text-[10px] font-mono bg-danger/10 text-danger px-1.5 py-0.5 rounded hover:bg-danger/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                        >
                          {a.apartamento}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
