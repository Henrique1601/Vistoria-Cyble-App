'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { ApartamentoStatus } from '@/lib/db';
import { statusApto } from '@/lib/export/utils';
import { normApto } from '@/lib/utils';
import { haptic } from '@/lib/haptic';
import { spring } from '@/lib/motion';

interface ProgressHeatmapProps {
  status: ApartamentoStatus[];
  onNavigateToApto: (bloco: string, apto: string) => void;
}

const STATUSCellStyle: Record<string, string> = {
  Concluido: 'bg-success hover:bg-success/80',
  'Em andamento': 'bg-warn hover:bg-warn/80',
  Pendente: 'bg-danger/50 hover:bg-danger',
};

type FilterStatus = 'todos' | 'Concluido' | 'Em andamento' | 'Pendente';

function getAptoStatus(s: ApartamentoStatus): string {
  return statusApto(s);
}

export function ProgressHeatmap({ status, onNavigateToApto }: ProgressHeatmapProps) {
  const [filtro, setFiltro] = useState<FilterStatus>('todos');

  const porTorre = useMemo(() => {
    const map = new Map<string, ApartamentoStatus[]>();
    for (const s of status) {
      const arr = map.get(s.bloco) ?? [];
      arr.push(s);
      map.set(s.bloco, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [status]);

  const filterButtons: { label: string; value: FilterStatus; color: string }[] = [
    { label: 'Todos', value: 'todos', color: 'bg-base-overlay text-content-secondary' },
    { label: 'Concluido', value: 'Concluido', color: 'bg-success text-base' },
    { label: 'Andamento', value: 'Em andamento', color: 'bg-warn text-base' },
    { label: 'Pendente', value: 'Pendente', color: 'bg-danger/60 text-base' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.3 }}
      className="mb-4"
    >
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {filterButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => { haptic('light'); setFiltro(btn.value); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
              filtro === btn.value
                ? btn.color + ' ring-2 ring-accent/30'
                : 'bg-base-overlay text-content-tertiary hover:text-content'
            }`}
          >
            <div className={`w-2 h-2 rounded-sm ${
              btn.value === 'todos' ? 'bg-content-tertiary' :
              btn.value === 'Concluido' ? 'bg-success' :
              btn.value === 'Em andamento' ? 'bg-warn' : 'bg-danger/60'
            }`} />
            {btn.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {porTorre.map(([torre, aptos]) => {
          const filtered = filtro === 'todos' ? aptos : aptos.filter((s) => getAptoStatus(s) === filtro);
          const concluidos = aptos.filter((s) => getAptoStatus(s) === 'Concluido').length;
          const pct = aptos.length > 0 ? Math.round((concluidos / aptos.length) * 100) : 0;

          if (filtered.length === 0 && filtro !== 'todos') return null;

          return (
            <div key={torre} className="bg-base-raised border border-base-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-content">{torre}</span>
                <span className="text-[10px] text-content-tertiary">{concluidos}/{aptos.length} ({pct}%)</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {filtered
                  .sort((a, b) => a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true }))
                  .map((s) => {
                    const st = getAptoStatus(s);
                    const hasNotes = s.notas && s.notas.length > 0;
                    return (
                      <button
                        key={s.apartamento}
                        onClick={() => {
                          haptic('light');
                          onNavigateToApto(torre, s.apartamento);
                        }}
                        title={`${normApto(s.apartamento)} — ${st}${hasNotes ? `\nNotas: ${s.notas!.join(', ')}` : ''}`}
                        className={`relative w-7 h-7 rounded text-[9px] font-bold text-base/90 transition-all ${STATUSCellStyle[st] ?? 'bg-base-border'}`}
                      >
                        {normApto(s.apartamento)}
                        {hasNotes && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
