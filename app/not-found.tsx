'use client';

import { HouseLine } from '@phosphor-icons/react';

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] bg-base flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-base-overlay border border-base-border flex items-center justify-center mx-auto mb-5">
          <HouseLine size={28} weight="duotone" className="text-content-tertiary" />
        </div>
        <h1 className="text-xl font-bold tracking-tight mb-2">Pagina nao encontrada</h1>
        <p className="text-sm text-content-tertiary mb-6">
          O endereco que voce procura nao existe.
        </p>
        <a
          href="/"
          className="tactile-press inline-block bg-accent text-base font-semibold text-sm rounded-xl px-6 py-3 hover:bg-accent-hover transition-colors"
        >
          Voltar ao inicio
        </a>
      </div>
    </main>
  );
}
