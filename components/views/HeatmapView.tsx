'use client';

import { motion } from 'framer-motion';
import { ArrowLeft } from '@phosphor-icons/react';
import { spring } from '@/lib/motion';
import { ProgressHeatmap } from '@/components/ProgressHeatmap';
import BottomNav from '@/components/BottomNav';
import type { ApartamentoStatus } from '@/lib/db';

interface HeatmapViewProps {
  statusMerged: ApartamentoStatus[];
  onVoltar: () => void;
  onNavigateToApto: (bloco: string, apto: string) => void;
  onNavigate: (view: string) => void;
}

export function HeatmapView({
  statusMerged,
  onVoltar,
  onNavigateToApto,
  onNavigate,
}: HeatmapViewProps) {
  return (
    <>
      <main className="min-h-[100dvh] bg-base">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={spring}
            className="flex items-center gap-3 mb-6"
          >
            <button
              onClick={onVoltar}
              aria-label="Voltar"
              className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
            >
              <ArrowLeft size={18} weight="bold" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Mapa de Progresso</h1>
              <p className="text-xs text-content-tertiary mt-0.5">Visão geral por torre e apartamento</p>
            </div>
          </motion.div>
          <ProgressHeatmap
            status={statusMerged}
            onNavigateToApto={onNavigateToApto}
          />
        </div>
      </main>
      <BottomNav active="inicio" onNavigate={onNavigate} />
    </>
  );
}
