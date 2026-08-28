'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Buildings, Camera, Clock, Cloud, Calendar, X } from '@phosphor-icons/react';
import { ApartamentoStatus } from '@/lib/db';
import { normApto, emAndamento, obterPeriodoAtalho } from '@/lib/utils';
import { spring, stagger, item } from '@/lib/motion';
import { FotoOnline } from './EstatisticasPeriodo';

interface DashboardProps {
  status: ApartamentoStatus[];
  pendentes: number;
  fotosOnline: FotoOnline[];
  datasDisponiveis: string[];
  dataFiltro: string;
  dataInicio: string;
  onFiltroDataChange: (v: string) => void;
  onFiltroInicioChange: (v: string) => void;
}

export const Dashboard = memo(function Dashboard({
  status,
  pendentes,
  fotosOnline,
  datasDisponiveis,
  dataFiltro,
  dataInicio,
  onFiltroDataChange,
  onFiltroInicioChange,
}: DashboardProps) {
  const aptosComFotoOnline = useMemo(() => {
    const set = new Set<string>();
    fotosOnline.forEach((f) => set.add(`${f.bloco}__${normApto(f.apartamento)}`));
    return set;
  }, [fotosOnline]);

  const totalAptos = status.length;

  const aptosCompletos = useMemo(() => {
    const set = new Set<string>();
    status.filter((s) => s.cybleAntesFeito && s.cybleDepoisFeito).forEach((s) => {
      set.add(`${s.bloco}__${normApto(s.apartamento)}`);
    });
    aptosComFotoOnline.forEach((key) => set.add(key));
    return set;
  }, [status, aptosComFotoOnline]);

  const aptosAndamento = useMemo(() => {
    const set = new Set<string>();
    status.filter((s) => emAndamento(s)).forEach((s) => {
      const key = `${s.bloco}__${normApto(s.apartamento)}`;
      if (!aptosCompletos.has(key)) set.add(key);
    });
    return set;
  }, [status, aptosCompletos]);

  const completos = aptosCompletos.size;
  const totalFotosLocal = status.reduce((acc, s) => acc + s.qtdFotos, 0);
  const totalFotos = Math.max(totalFotosLocal, fotosOnline.length);
  const pct = totalAptos > 0 ? Math.round((completos / totalAptos) * 100) : 0;

  const cards = [
    {
      icon: <CheckCircle size={20} weight="duotone" aria-hidden="true" />,
      value: `${pct}%`,
      label: 'Concluido',
      accent: pct === 100,
      span: 'col-span-2',
      extra: (
        <div className="h-1 bg-base-overlay rounded-full overflow-hidden mt-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ ...spring, delay: 0.5 }}
            className="h-full bg-success rounded-full"
          />
        </div>
      ),
    },
    {
      icon: <Buildings size={20} weight="duotone" aria-hidden="true" />,
      value: `${completos}`,
      sub: `/${totalAptos}`,
      label: 'Aptos feitos',
      accent: false,
      span: 'col-span-1',
    },
    {
      icon: <Camera size={20} weight="duotone" aria-hidden="true" />,
      value: `${totalFotos}`,
      label: 'Fotos tiradas',
      accent: false,
      span: 'col-span-1',
    },
    {
      icon: pendentes > 0 ? <Clock size={20} weight="duotone" aria-hidden="true" /> : <Cloud size={20} weight="duotone" aria-hidden="true" />,
      value: `${pendentes}`,
      label: 'Pendente sync',
      accent: pendentes > 0,
      span: 'col-span-2',
    },
  ];

  return (
    <div className="mb-8">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 mb-4"
      >
        {cards.map((c, i) => (
          <motion.div
            key={i}
            variants={item}
            className={`${c.span} bg-base-raised border border-base-border rounded-2xl p-5 group hover:border-base-border/80 transition-colors`}
          >
            <div className={`mb-3 ${c.accent ? 'text-accent' : 'text-content-tertiary'}`}>
              {c.icon}
            </div>
            <div className="font-mono text-2xl font-bold tracking-tight text-content">
              {c.value}
              {c.sub && <span className="text-base text-content-tertiary font-normal">{c.sub}</span>}
            </div>
            <div className="text-[11px] text-content-tertiary uppercase tracking-widest mt-1">{c.label}</div>
            {c.extra}
          </motion.div>
        ))}
      </motion.div>

      {/* Filtro por período */}
      {datasDisponiveis.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.3 }}
          className="space-y-3"
        >
          {/* Date range inputs */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <Calendar size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => onFiltroInicioChange(e.target.value)}
                aria-label="Data inicial do período"
                className="w-full bg-base-raised border border-base-border rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-content-secondary focus:outline-none focus:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all"
              />
            </div>
            <span className="text-content-tertiary text-xs">até</span>
            <div className="flex-1 relative">
              <Calendar size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
              <input
                type="date"
                value={dataFiltro}
                onChange={(e) => onFiltroDataChange(e.target.value)}
                aria-label="Data final do período"
                className="w-full bg-base-raised border border-base-border rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-content-secondary focus:outline-none focus:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all"
              />
            </div>
            {(dataInicio || dataFiltro) && (
              <button
                onClick={() => {
                  onFiltroInicioChange('');
                  onFiltroDataChange('');
                }}
                aria-label="Limpar filtro de período"
                className="w-9 h-9 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-tertiary hover:text-content transition-colors"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>

          {/* Quick shortcuts */}
          <div className="flex gap-2 flex-wrap">
            {([
              { label: 'Hoje', atalho: 'hoje' as const },
              { label: '7 dias', atalho: 'semana' as const },
              { label: '30 dias', atalho: 'mes' as const },
              { label: '90 dias', atalho: 'trimestre' as const },
            ]).map(({ label, atalho }) => (
              <button
                key={atalho}
                onClick={() => {
                  const periodo = obterPeriodoAtalho(atalho);
                  onFiltroInicioChange(periodo.inicio);
                  onFiltroDataChange(periodo.fim);
                }}
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider bg-base-overlay border border-base-border rounded-lg text-content-tertiary hover:text-content hover:border-accent/30 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
});
