'use client';

import { Buildings } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { spring, stagger, item } from '@/lib/motion';
import { haptic } from '@/lib/haptic';
import ProgressRing from '@/components/ProgressRing';
import { EmptyStateBlocks } from '@/components/EmptyState';

interface BlocoProgresso {
  texto: string;
  pct: number;
}

interface BlocosGridProps {
  blocos: string[];
  progressoMap: Map<string, BlocoProgresso>;
  loading: boolean;
  onSelect: (bloco: string) => void;
}

export function BlocosGrid({ blocos, progressoMap, loading, onSelect }: BlocosGridProps) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-3 mb-6"
    >
      {loading && blocos.length === 0
        ? Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-${i}`} className="bg-base-raised border border-base-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-9 h-9 rounded-xl" />
                  <div>
                    <div className="skeleton w-20 h-4 rounded-md mb-1.5" />
                    <div className="skeleton w-28 h-3 rounded-md" />
                  </div>
                </div>
                <div className="skeleton w-10 h-10 rounded-full" />
              </div>
              <div className="skeleton w-full h-1 rounded-full" />
            </div>
          ))
        : blocos.length === 0
          ? <EmptyStateBlocks />
          : blocos.map((b) => {
          const prog = progressoMap.get(b) || { texto: '0/0', pct: 0 };
          return (
            <motion.div
              key={b}
              variants={item}
              role="button"
              tabIndex={0}
              onClick={() => { haptic('light'); onSelect(b); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic('light'); onSelect(b); } }}
              className="tactile-press group bg-base-raised border border-base-border rounded-2xl p-5 cursor-pointer hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none hover:shadow-diffusion transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-base-overlay border border-base-border-subtle flex items-center justify-center group-hover:border-accent/30 transition-colors">
                    <Buildings size={18} weight="duotone" className="text-content-secondary group-hover:text-accent transition-colors" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{b}</div>
                    <div className="text-[11px] text-content-tertiary font-mono">{prog.texto} concluidos</div>
                  </div>
                </div>
                <ProgressRing percentage={prog.pct} size={40} strokeWidth={3} />
              </div>
              <div className="h-1 bg-base-overlay rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${prog.pct}%` }}
                  transition={{ ...spring, delay: 0.3 }}
                  className="h-full bg-success rounded-full"
                />
              </div>
            </motion.div>
          );
        })}
    </motion.div>
  );
}
