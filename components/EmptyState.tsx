'use client';

import { motion } from 'framer-motion';

export function EmptyStatePhotos() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-10 gap-3"
    >
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="12" width="52" height="40" rx="6" className="fill-base-overlay stroke-base-border" strokeWidth="2" />
        <circle cx="24" cy="28" r="6" className="fill-accent/20 stroke-accent/40" strokeWidth="1.5" />
        <path d="M6 42L20 30L30 38L42 24L58 38V46C58 49.3137 55.3137 52 52 52H12C8.68629 52 6 49.3137 6 46V42Z" className="fill-accent/10" />
        <path d="M28 24L32 20L40 28" strokeLinecap="round" className="stroke-accent/30" strokeWidth="1.5" />
      </svg>
      <span className="text-sm text-content-tertiary">Nenhuma foto ainda</span>
      <span className="text-[11px] text-content-tertiary/60">Toque em um apartamento para comecar</span>
    </motion.div>
  );
}

export function EmptyStateSearch() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-10 gap-3"
    >
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="28" cy="28" r="16" className="fill-base-overlay stroke-base-border" strokeWidth="2" />
        <circle cx="28" cy="28" r="10" className="fill-accent/10" />
        <line x1="40" y1="40" x2="52" y2="52" strokeLinecap="round" className="stroke-accent/40" strokeWidth="2.5" />
        <path d="M22 28H34M28 22V34" strokeLinecap="round" className="stroke-accent/20" strokeWidth="1.5" />
      </svg>
      <span className="text-sm text-content-tertiary">Nenhum resultado encontrado</span>
    </motion.div>
  );
}

export function EmptyStateBlocks() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-10 gap-3"
    >
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="8" width="16" height="48" rx="3" className="fill-base-overlay stroke-base-border" strokeWidth="2" />
        <rect x="36" y="16" width="16" height="40" rx="3" className="fill-base-overlay stroke-base-border" strokeWidth="2" />
        <rect x="16" y="14" width="3" height="3" rx="0.5" className="fill-accent/30" />
        <rect x="22" y="14" width="3" height="3" rx="0.5" className="fill-accent/20" />
        <rect x="16" y="21" width="3" height="3" rx="0.5" className="fill-accent/20" />
        <rect x="22" y="21" width="3" height="3" rx="0.5" className="fill-success/40" />
        <rect x="40" y="22" width="3" height="3" rx="0.5" className="fill-accent/20" />
        <rect x="46" y="22" width="3" height="3" rx="0.5" className="fill-success/30" />
      </svg>
      <span className="text-sm text-content-tertiary">Nenhuma torre configurada</span>
      <span className="text-[11px] text-content-tertiary/60">Importe ou configure a lista de apartamentos</span>
    </motion.div>
  );
}
