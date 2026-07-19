'use client';

import { useMemo } from 'react';
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
  Concluido: 'bg-success/80 hover:bg-success',
  'Em andamento': 'bg-warn/80 hover:bg-warn',
  Pendente: 'bg-danger/60 hover:bg-danger',
};

function getAptoStatus(s: ApartamentoStatus): string {
  return statusApto(s);
}

export function ProgressHeatmap({ status, onNavigateToApto }: ProgressHeatmapProps) {
  const porTorre = useMemo(() => {
    const map = new Map<string, ApartamentoStatus[]>();
    for (const s of status) {
      const arr = map.get(s.bloco) ?? [];
      arr.push(s);
      map.set(s.bloco, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [status]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.3 }}
      className="mb-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-success/80" />
          <span className="text-[10px] text-content-tertiary">Concluido</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-warn/80" />
          <span className="text-[10px] text-content-tertiary">Andamento</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-danger/60" />
          <span className="text-[10px] text-content-tertiary">Pendente</span>
        </div>
      </div>

      <div className="space-y-3">
        {porTorre.map(([torre, aptos]) => {
          const concluidos = aptos.filter((s) => getAptoStatus(s) === 'Concluido').length;
          const pct = aptos.length > 0 ? Math.round((concluidos / aptos.length) * 100) : 0;

          return (
            <div key={torre} className="bg-base-raised border border-base-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-content">{torre}</span>
                <span className="text-[10px] text-content-tertiary">{concluidos}/{aptos.length} ({pct}%)</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {aptos
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
