'use client';

import { Images, PencilSimple, Download, Upload, SignOut, Info } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

interface BottomLinksProps {
  online: boolean;
  appVersion: string;
  espacoStorage: { usado: number; total: number; pct: number } | null;
  updateDisponivel: boolean;
  versaoNova: string;
  onBackup: () => void;
  onRestore: () => void;
  onLogout: () => void;
  onUpdate: () => void;
  onEditLista: () => void;
  ultimoBackup: string;
}

export function BottomLinks({
  online,
  appVersion,
  espacoStorage,
  updateDisponivel,
  versaoNova,
  onBackup,
  onRestore,
  onLogout,
  onUpdate,
  onEditLista,
  ultimoBackup,
}: BottomLinksProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap gap-4 mb-4"
      >
        <a
          href="/galeria"
          aria-label="Abrir galeria de fotos"
          className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
        >
          <Images size={13} weight="bold" aria-hidden="true" />
          Galeria
        </a>
        <button
          onClick={onEditLista}
          aria-label="Editar lista de apartamentos"
          className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
        >
          <PencilSimple size={13} weight="bold" aria-hidden="true" />
          Editar lista
        </button>
        <button
          onClick={onBackup}
          aria-label="Fazer backup dos dados"
          className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
        >
          <Download size={13} weight="bold" aria-hidden="true" />
          Backup
        </button>
        <button
          onClick={onRestore}
          aria-label="Restaurar dados de backup"
          className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
        >
          <Upload size={13} weight="bold" aria-hidden="true" />
          Restaurar
        </button>
        <button
          onClick={onLogout}
          aria-label="Sair da aplicacao"
          className="tactile-press flex items-center gap-1.5 text-xs text-danger hover:text-danger/80 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
        >
          <SignOut size={13} weight="bold" aria-hidden="true" />
          Sair
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center justify-center gap-2 text-[10px] text-content-tertiary/50"
      >
        <Info size={10} weight="bold" aria-hidden="true" />
        <span>Vistoria Cyble v{appVersion}</span>
        {!online && <span className="text-danger font-semibold">• offline</span>}
        {espacoStorage && (
          <span className={espacoStorage.pct > 85 ? 'text-warning font-semibold' : ''}>
            • {espacoStorage.pct}% storage
          </span>
        )}
        <span>• backup: {ultimoBackup}</span>
        {updateDisponivel && (
          <button
            onClick={onUpdate}
            className="text-accent font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            • nova versão disponível (v{versaoNova})
          </button>
        )}
      </motion.div>
    </>
  );
}
