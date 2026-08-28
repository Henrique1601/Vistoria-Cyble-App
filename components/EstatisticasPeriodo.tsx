'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface FotoOnline {
  id: number;
  bloco: string;
  apartamento: string;
  data_leitura: string;
  foto_url: string;
  foto_index: number;
}

interface EstatisticasPeriodoProps {
  fotosOnline: FotoOnline[];
}

export function EstatisticasPeriodo({ fotosOnline }: EstatisticasPeriodoProps) {
  const dados = useMemo(() => {
    const agora = new Date();
    const dias: { data: string; label: string; total: number; porBloco: Record<string, number> }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(agora);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dias.push({ data: key, label, total: 0, porBloco: {} });
    }
    fotosOnline.forEach((f) => {
      const dia = dias.find((d) => d.data === f.data_leitura);
      if (dia) {
        dia.total++;
        dia.porBloco[f.bloco] = (dia.porBloco[f.bloco] || 0) + 1;
      }
    });
    return dias;
  }, [fotosOnline]);

  const maxTotal = Math.max(...dados.map((d) => d.total), 1);
  const totalFotos = dados.reduce((acc, d) => acc + d.total, 0);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-6 bg-base-raised border border-base-border rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">Fotos por dia (14 dias)</span>
        <span className="text-[11px] font-mono text-accent">{totalFotos} total</span>
      </div>
      <div className="flex items-end gap-1 h-24">
        {dados.map((d) => (
          <div key={d.data} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col-reverse" style={{ height: '60px' }}>
              <div
                className="w-full bg-accent/80 rounded-t-sm transition-all duration-300"
                style={{ height: `${(d.total / maxTotal) * 100}%`, minHeight: d.total > 0 ? '2px' : '0' }}
                title={`${d.label}: ${d.total} fotos`}
              />
            </div>
            <span className="text-[8px] text-content-tertiary font-mono -rotate-45 origin-left">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
