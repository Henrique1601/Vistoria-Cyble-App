'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ApartamentoStatus } from '@/lib/db';
import { normApto, normalizeBloco } from '@/lib/utils';
import { FotoOnline } from './EstatisticasPeriodo';

interface EstatisticasPorTorreProps {
  status: ApartamentoStatus[];
  fotosOnline: FotoOnline[];
  lista: Record<string, string[]> | null;
}

export function EstatisticasPorTorre({ status, fotosOnline, lista }: EstatisticasPorTorreProps) {
  const dados = useMemo(() => {
    const porTorre: Record<string, { total: number; feitos: number; fotos: number }> = {};

    // Pre-build status Map for O(1) lookups
    const statusMap = new Map<string, ApartamentoStatus>();
    for (const s of status) {
      statusMap.set(`${normalizeBloco(s.bloco)}__${normApto(s.apartamento)}`, s);
    }

    // Index online photos by bloco (normalized)
    const onlinePorBloco: Record<string, Set<string>> = {};
    fotosOnline.forEach((f) => {
      const key = normalizeBloco(f.bloco);
      if (!onlinePorBloco[key]) onlinePorBloco[key] = new Set();
      onlinePorBloco[key].add(normApto(f.apartamento));
    });

    // Count online photos per apto (normalized)
    const fotosOnlineCount: Record<string, number> = {};
    fotosOnline.forEach((f) => {
      const key = `${normalizeBloco(f.bloco)}__${normApto(f.apartamento)}`;
      fotosOnlineCount[key] = (fotosOnlineCount[key] || 0) + 1;
    });

    // Build merged status per torre using lista + online
    const torres = new Set<string>([...Object.keys(lista || {}), ...fotosOnline.map((f) => normalizeBloco(f.bloco))]);
    for (const torre of torres) {
      const codigosLocais = lista?.[torre] || [];
      const onlineAptos = onlinePorBloco[torre] || new Set();
      const allAptos = new Set<string>([...codigosLocais, ...onlineAptos]);

      porTorre[torre] = { total: 0, feitos: 0, fotos: 0 };
      for (const apto of allAptos) {
        porTorre[torre].total++;
        const local = statusMap.get(`${torre}__${normApto(apto)}`);
        const hasLocal = local && local.cybleAntesFeito && local.cybleDepoisFeito;
        const hasOnline = onlineAptos.has(normApto(apto));
        if (hasLocal || hasOnline) porTorre[torre].feitos++;
        porTorre[torre].fotos += (local?.qtdFotos || 0) + (fotosOnlineCount[`${torre}__${normApto(apto)}`] || 0);
      }
    }

    return Object.entries(porTorre)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([torre, d]) => ({
        torre,
        ...d,
        pct: d.total > 0 ? Math.round((d.feitos / d.total) * 100) : 0,
      }));
  }, [status, fotosOnline, lista]);

  const totalAptos = dados.reduce((a, d) => a + d.total, 0);
  const totalFeitos = dados.reduce((a, d) => a + d.feitos, 0);
  const pctGeral = totalAptos > 0 ? Math.round((totalFeitos / totalAptos) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-6 bg-base-raised border border-base-border rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">Progresso por torre</span>
        <span className="text-[11px] font-mono text-accent">{totalFeitos}/{totalAptos} ({pctGeral}%)</span>
      </div>
      <div className="space-y-2">
        {dados.map((d) => (
          <div key={d.torre} className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-content-secondary w-12 flex-shrink-0">{d.torre}</span>
            <div className="flex-1 h-2 bg-base-overlay rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${d.pct}%`,
                  backgroundColor: d.pct === 100 ? 'rgb(52, 211, 153)' : d.pct > 0 ? 'rgb(232, 130, 58)' : 'rgb(239, 68, 68)',
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-content-tertiary w-16 text-right">
              {d.feitos}/{d.total}
            </span>
            <span className="text-[10px] font-mono text-content-tertiary w-10 text-right">
              {d.pct}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
