'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LockKey, Warning } from '@phosphor-icons/react';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

export default function PinGate({ onOk }: { onOk: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [checking, setChecking] = useState(false);

  async function confirmar() {
    setChecking(true);
    setErro('');
    try {
      const resp = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await resp.json();
      if (data.ok) {
        onOk(pin);
      } else {
        setErro('PIN incorreto');
      }
    } catch {
      setErro('Sem conexao pra validar agora — tente de novo quando tiver sinal');
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-base flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_0_4px_rgba(232,130,58,0.2)]" />
          <h1 className="text-2xl font-bold tracking-tight">Vistoria Cyble</h1>
        </div>
        <p className="text-sm text-content-tertiary ml-5 mb-8">Digite o PIN de acesso.</p>

        <div className="bg-base-raised border border-base-border rounded-2xl p-6 shadow-diffusion">
          <div className="flex items-center gap-2 mb-4">
            <LockKey size={16} weight="duotone" className="text-content-tertiary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">PIN</span>
          </div>
          <input
            type="password"
            inputMode="numeric"
            placeholder="****"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && pin && !checking && confirmar()}
            className="w-full bg-base-overlay border border-base-border rounded-xl px-4 py-3.5 text-center text-lg font-mono tracking-[0.5em] text-content placeholder:text-content-tertiary/50 focus:outline-none focus:border-accent/50 focus:shadow-glow-accent transition-all"
          />

          {erro && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-danger-dim/30 border border-danger/20"
            >
              <Warning size={14} weight="bold" className="text-danger flex-shrink-0" />
              <span className="text-xs text-danger">{erro}</span>
            </motion.div>
          )}

          <button
            onClick={confirmar}
            disabled={!pin || checking}
            className="tactile-press w-full mt-5 bg-accent text-base font-semibold text-sm rounded-xl px-6 py-3.5 hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            {checking ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-base/30 border-t-base rounded-full animate-spin" />
                Verificando...
              </span>
            ) : (
              'Entrar'
            )}
          </button>
        </div>
      </motion.div>
    </main>
  );
}
