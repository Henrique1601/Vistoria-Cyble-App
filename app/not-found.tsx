'use client';

import { motion } from 'framer-motion';
import { HouseLine, ArrowLeft } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { spring } from '@/lib/motion';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-dvh bg-base flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring}
        className="mb-8"
      >
        <div className="w-20 h-20 rounded-full bg-danger-dim border border-danger/30 flex items-center justify-center mx-auto">
          <span className="text-3xl font-bold text-danger font-mono">404</span>
        </div>
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring, delay: 0.1 }}
        className="text-xl font-bold text-content mb-2"
      >
        Pagina nao encontrada
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring, delay: 0.2 }}
        className="text-sm text-content-secondary max-w-xs mb-8"
      >
        O endereco que voce procura nao existe ou foi movido.
      </motion.p>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring, delay: 0.3 }}
        onClick={() => router.push('/')}
        className="tactile-press flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-base font-semibold hover:bg-accent-hover transition-colors"
      >
        <HouseLine size={18} weight="bold" />
        Voltar ao inicio
      </motion.button>
    </div>
  );
}
