'use client';

import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@/lib/motion';
import type { ApartamentoStatus } from '@/lib/db';

interface ResultadoBusca {
  bloco: string;
  apto: string;
  status: ApartamentoStatus | null;
}

interface SearchBarProps {
  buscaGlobal: string;
  onBuscaChange: (v: string) => void;
}

export function SearchBar({ buscaGlobal, onBuscaChange }: SearchBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.1 }}
      className="relative mb-4"
    >
      <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
      <input
        type="text"
        placeholder="Buscar apto em todos os blocos\u2026"
        value={buscaGlobal}
        onChange={(e) => onBuscaChange(e.target.value)}
        aria-label="Buscar apartamento em todos os blocos"
        className="w-full bg-base-raised border border-base-border rounded-xl pl-10 pr-10 py-3 text-sm text-content placeholder:text-content-tertiary focus:outline-none focus:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all"
      />
      {buscaGlobal && (
        <button
          onClick={() => onBuscaChange('')}
          aria-label="Limpar busca"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content"
        >
          <X size={14} weight="bold" />
        </button>
      )}
    </motion.div>
  );
}

interface SearchResultsProps {
  resultados: ResultadoBusca[];
  onSelect: (bloco: string, apto: string) => void;
}

export function SearchResults({ resultados, onSelect }: SearchResultsProps) {
  return (
    <AnimatePresence mode="wait">
      {resultados.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 bg-base-raised border border-accent/20 rounded-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-base-border">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              {resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-base-border max-h-64 overflow-y-auto">
            {resultados.map((r) => {
              const completo = r.status && r.status.cybleAntesFeito && r.status.cybleDepoisFeito;
              const temFoto = r.status && (r.status.cybleAntesFeito || r.status.cybleDepoisFeito);
              return (
                <button
                  key={`${r.bloco}__${r.apto}`}
                  onClick={() => onSelect(r.bloco, r.apto)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-base-overlay/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-accent">{r.bloco}</span>
                    <span className="font-mono text-sm font-medium">{r.apto}</span>
                    {r.status && r.status.qtdFotos > 0 && (
                      <span className="text-[11px] font-mono text-content-tertiary bg-base-overlay px-2 py-0.5 rounded-md">
                        {r.status.qtdFotos} foto{r.status.qtdFotos > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {completo ? (
                      <span className="text-[10px] font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded">Concluido</span>
                    ) : temFoto ? (
                      <span className="text-[10px] font-semibold text-warn bg-warn/10 px-1.5 py-0.5 rounded">Em andamento</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-content-tertiary bg-base-overlay px-1.5 py-0.5 rounded">Pendente</span>
                    )}
                    <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${r.status?.cybleAntesFeito ? 'bg-success shadow-[0_0_6px_rgba(52,211,153,0.4)]' : 'bg-base-border'}`} title="Antes" aria-hidden="true" />
                    <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${r.status?.cybleDepoisFeito ? 'bg-success shadow-[0_0_6px_rgba(52,211,153,0.4)]' : 'bg-base-border'}`} title="Depois" aria-hidden="true" />
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
