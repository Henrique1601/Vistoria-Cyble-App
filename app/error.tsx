'use client';

import { Warning } from '@phosphor-icons/react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[100dvh] bg-base flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-danger-dim/30 border border-danger/20 flex items-center justify-center mx-auto mb-5">
          <Warning size={28} weight="duotone" className="text-danger" />
        </div>
        <h1 className="text-xl font-bold tracking-tight mb-2">Algo deu errado</h1>
        <p className="text-sm text-content-tertiary mb-6">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-content-tertiary/50 mb-4">
            {error.digest}
          </p>
        )}
        <button
          onClick={() => reset()}
          className="tactile-press bg-accent text-base font-semibold text-sm rounded-xl px-6 py-3 hover:bg-accent-hover transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
