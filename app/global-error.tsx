'use client';

import { useEffect } from 'react';
import { Warning } from '@phosphor-icons/react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for debugging (Sentry may not be available in global-error)
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-[100dvh] bg-[#0c0f14] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <Warning size={28} weight="duotone" className="text-red-400" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mb-2">
            Algo deu errado
          </h1>
          <p className="text-sm text-gray-400 mb-6">
            Ocorreu um erro inesperado no aplicativo. Tente novamente ou recarregue a página.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-gray-500 mb-4">
              {error.digest}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-[#ff6b35] text-white hover:bg-[#ff6b35]/90 transition-colors"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              Recarregar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
