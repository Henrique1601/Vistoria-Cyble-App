'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle,
  Clock,
  Warning,
  Camera,
  Cloud,
  ArrowRight,
} from '@phosphor-icons/react';
import type { ApartamentoStatus } from '@/lib/db';
import { statusApto } from '@/lib/export/utils';
import { normApto } from '@/lib/utils';
import { haptic } from '@/lib/haptic';
import { spring } from '@/lib/motion';

interface FotoOnline {
  id: number;
  bloco: string;
  apartamento: string;
  data_leitura: string;
  foto_url: string;
  foto_index: number;
}

interface TowerReportPanelProps {
  tower: string;
  status: ApartamentoStatus[];
  fotosOnline: FotoOnline[];
  fotosCountMap: Map<string, number>;
  onNavigateToApto: (bloco: string, apto: string) => void;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  Concluido: 'bg-success text-base',
  'Em andamento': 'bg-warn text-base',
  Pendente: 'bg-base-overlay text-content-tertiary border border-base-border',
};

export default function TowerReportPanel({
  tower,
  status,
  fotosOnline,
  fotosCountMap,
  onNavigateToApto,
  onClose,
}: TowerReportPanelProps) {
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'Concluido' | 'Em andamento' | 'Pendente'>('todos');

  const towerStatus = useMemo(
    () => status.filter((s) => s.bloco === tower),
    [status, tower]
  );

  const totalAptos = towerStatus.length;
  const concluidos = towerStatus.filter((s) => s.cybleAntesFeito && s.cybleDepoisFeito).length;
  const emAndamento = towerStatus.filter(
    (s) => (s.cybleAntesFeito || s.cybleDepoisFeito) && !(s.cybleAntesFeito && s.cybleDepoisFeito)
  ).length;
  const pendentes = totalAptos - concluidos - emAndamento;
  const pct = totalAptos > 0 ? Math.round((concluidos / totalAptos) * 100) : 0;

  const aptosFiltrados = useMemo(() => {
    let list = towerStatus;
    if (filtroStatus !== 'todos') {
      list = list.filter((s) => statusApto(s) === filtroStatus);
    }
    // Sort: pending first, then by apto number
    return [...list].sort((a, b) => {
      const aC = a.cybleAntesFeito && a.cybleDepoisFeito;
      const bC = b.cybleAntesFeito && b.cybleDepoisFeito;
      if (aC !== bC) return aC ? 1 : -1;
      return a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true });
    });
  }, [towerStatus, filtroStatus]);

  const lastDates = useMemo(() => {
    const map = new Map<string, string>();
    fotosOnline
      .filter((f) => f.bloco === tower)
      .forEach((f) => {
        const key = normApto(f.apartamento);
        if (!map.has(key) || f.data_leitura > map.get(key)!) {
          map.set(key, f.data_leitura);
        }
      });
    return map;
  }, [fotosOnline, tower]);

  const totalFotosOnline = useMemo(
    () => fotosOnline.filter((f) => f.bloco === tower).length,
    [fotosOnline, tower]
  );

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-base/60 backdrop-blur-sm z-[70]"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={spring}
        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-base z-[80] shadow-diffusion flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-base-border">
          <div>
            <h2 className="text-lg font-semibold text-content">{tower}</h2>
            <p className="text-xs text-content-tertiary">
              {totalAptos} aptos  ·  {totalFotosOnline} fotos online
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="tactile-press w-9 h-9 rounded-xl bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary hover:text-content transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 px-4 py-4">
          <div className="bg-base-raised border border-base-border rounded-xl p-3 text-center">
            <CheckCircle size={18} weight="duotone" className="text-success mx-auto mb-1" />
            <span className="text-lg font-bold tabular-nums">{concluidos}</span>
            <p className="text-[10px] text-content-tertiary">Concluidos</p>
          </div>
          <div className="bg-base-raised border border-base-border rounded-xl p-3 text-center">
            <Clock size={18} weight="duotone" className="text-warn mx-auto mb-1" />
            <span className="text-lg font-bold tabular-nums">{emAndamento}</span>
            <p className="text-[10px] text-content-tertiary">Em andamento</p>
          </div>
          <div className="bg-base-raised border border-base-border rounded-xl p-3 text-center">
            <Warning size={18} weight="duotone" className="text-danger mx-auto mb-1" />
            <span className="text-lg font-bold tabular-nums">{pendentes}</span>
            <p className="text-[10px] text-content-tertiary">Pendentes</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-content-tertiary">Progresso</span>
            <span className="text-xs font-semibold tabular-nums">{pct}%</span>
          </div>
          <div className="h-2.5 bg-base-overlay rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ ...spring, delay: 0.3 }}
              className="h-full bg-success rounded-full"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 pb-3 flex gap-1.5">
          {(['todos', 'Pendente', 'Em andamento', 'Concluido'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { haptic('light'); setFiltroStatus(f); }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                filtroStatus === f
                  ? 'bg-accent text-base'
                  : 'bg-base-overlay text-content-secondary border border-base-border hover:text-content'
              }`}
            >
              {f === 'todos' ? 'Todos' : f}
            </button>
          ))}
        </div>

        {/* Apartment list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-1.5">
            {aptosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-content-tertiary text-sm">
                Nenhum apto encontrado
              </div>
            ) : (
              aptosFiltrados.map((s) => {
                const st = statusApto(s);
                const lastDate = lastDates.get(normApto(s.apartamento));
                const fotoCount = fotosCountMap.get(`${tower}__${normApto(s.apartamento)}`) || 0;

                return (
                  <button
                    key={s.apartamento}
                    onClick={() => {
                      haptic('light');
                      onNavigateToApto(tower, s.apartamento);
                    }}
                    className="w-full flex items-center gap-3 bg-base-raised border border-base-border rounded-xl px-4 py-3 hover:border-accent/30 transition-colors text-left group"
                  >
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                        st === 'Concluido' ? 'bg-success/15 text-success' :
                        st === 'Em andamento' ? 'bg-warn/15 text-warn' :
                        'bg-base-overlay text-content-tertiary'
                      }`}>
                        {s.apartamento}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          st === 'Concluido' ? 'bg-success/15 text-success' :
                          st === 'Em andamento' ? 'bg-warn/15 text-warn' :
                          'bg-base-overlay text-content-tertiary'
                        }`}>
                          {st}
                        </span>
                        {lastDate && (
                          <span className="text-[10px] text-content-tertiary">{lastDate}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {s.qtdFotos > 0 && (
                          <span className="text-[10px] text-content-tertiary flex items-center gap-0.5">
                            <Camera size={10} /> {s.qtdFotos}
                          </span>
                        )}
                        {fotoCount > 0 && (
                          <span className="text-[10px] text-accent flex items-center gap-0.5">
                            <Cloud size={10} /> {fotoCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-content-tertiary group-hover:text-accent transition-colors flex-shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
