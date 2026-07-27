'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ApartamentoStatus } from '@/lib/db';
import { statusApto } from '@/lib/export/utils';
import { normalizeBloco } from '@/lib/utils';
import { spring } from '@/lib/motion';

interface TowerComparisonProps {
  status: ApartamentoStatus[];
  lista: Record<string, string[]>;
}

interface TowerData {
  nome: string;
  total: number;
  concluidos: number;
  emAndamento: number;
  pendentes: number;
  percentual: number;
}

export default function TowerComparison({ status, lista }: TowerComparisonProps) {
  const dados = useMemo(() => {
    const byTower: Record<string, TowerData> = {};

    for (const nome of Object.keys(lista)) {
      byTower[nome] = { nome, total: 0, concluidos: 0, emAndamento: 0, pendentes: 0, percentual: 0 };
    }

    for (const s of status) {
      const tower = normalizeBloco(s.bloco);
      if (!byTower[tower]) {
        byTower[tower] = { nome: tower, total: 0, concluidos: 0, emAndamento: 0, pendentes: 0, percentual: 0 };
      }
      byTower[tower].total++;
      const st = statusApto(s);
      if (st === 'Concluido') byTower[tower].concluidos++;
      else if (st === 'Em andamento') byTower[tower].emAndamento++;
      else byTower[tower].pendentes++;
    }

    for (const t of Object.values(byTower)) {
      t.percentual = t.total > 0 ? Math.round((t.concluidos / t.total) * 100) : 0;
    }

    return Object.values(byTower).sort((a, b) => b.percentual - a.percentual);
  }, [status, lista]);

  const maxTotal = Math.max(...dados.map((d) => d.total), 1);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-content">Comparativo entre Torres</h3>
      {dados.map((d, i) => (
        <div key={d.nome} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-content">{d.nome}</span>
            <span className="text-content-tertiary">
              {d.concluidos}/{d.total} <span className="text-accent font-bold">{d.percentual}%</span>
            </span>
          </div>
          <div className="h-5 bg-base-surface rounded-full overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${d.percentual}%` }}
              transition={{ ...spring, delay: i * 0.08 }}
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: d.percentual >= 80
                  ? 'linear-gradient(90deg, #34d399, #10b981)'
                  : d.percentual >= 40
                  ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                  : 'linear-gradient(90deg, #f87171, #ef4444)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-content drop-shadow-sm">
              {d.concluidos} de {d.total}
            </div>
          </div>
          <div className="flex gap-3 text-[10px] text-content-tertiary">
            <span className="text-success">{d.concluidos} ok</span>
            <span className="text-warn">{d.emAndamento} andamento</span>
            <span className="text-danger">{d.pendentes} pendente</span>
          </div>
        </div>
      ))}
    </div>
  );
}
