'use client';

import { Camera, CalendarDots, ChatText, ArrowUpRight } from '@phosphor-icons/react';
import { useLongPress } from '@/components/ContextMenu';
import { haptic } from '@/lib/haptic';
import { normApto } from '@/lib/utils';
import type { ApartamentoStatus } from '@/lib/db';

interface StatusDotProps {
  done: boolean;
  partial?: boolean;
  label: string;
}

function StatusDot({ done, partial, label }: StatusDotProps) {
  return (
    <div className="flex items-center gap-1">
      <div
        className={`w-2 h-2 rounded-full transition-colors duration-300 ${
          done ? 'bg-success shadow-[0_0_6px_rgba(52,211,153,0.4)]' :
          partial ? 'bg-warn shadow-[0_0_6px_rgba(251,191,36,0.3)]' :
          'bg-base-border'
        }`}
        title={label}
        aria-hidden="true"
      />
    </div>
  );
}

function emAndamento(s: ApartamentoStatus) {
  const temFoto = s.cybleAntesFeito || s.cybleDepoisFeito;
  const completo = s.cybleAntesFeito && s.cybleDepoisFeito;
  return temFoto && !completo;
}

interface AptoCardProps {
  s: ApartamentoStatus;
  aptosOnlineDoBloco: Set<string>;
  modoCompacto: boolean;
  modoEscaneamento: boolean;
  blocoAtual: string | null;
  onAbrir: () => void;
  onAgendar: () => void;
}

export default function AptoCard({ s, aptosOnlineDoBloco, modoCompacto, modoEscaneamento, blocoAtual, onAbrir, onAgendar }: AptoCardProps) {
  const longPressProps = useLongPress({
    onLongPress: () => {
      haptic('medium');
      onAbrir();
    },
    onClick: () => { haptic('light'); onAbrir(); },
  });

  return (
    <div
      role="button"
      tabIndex={0}
      {...longPressProps}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic('light'); onAbrir(); } }}
      className={`tactile-press flex items-center justify-between cursor-pointer hover:bg-base-overlay/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors ${
        modoCompacto ? 'px-3 py-2' : 'px-4 py-3.5'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`font-mono font-medium ${modoCompacto ? 'text-xs' : 'text-sm'}`}>{s.apartamento}</span>
        {s.qtdFotos > 0 && (
          <span className={`font-mono text-content-tertiary bg-base-overlay px-2 py-0.5 rounded-md ${modoCompacto ? 'text-[9px]' : 'text-[11px]'}`}>
            {s.qtdFotos} foto{s.qtdFotos > 1 ? 's' : ''}
          </span>
        )}
        {aptosOnlineDoBloco.has(normApto(s.apartamento)) && s.qtdFotos === 0 && (
          <span className="text-[11px] font-mono text-success bg-success/10 px-2 py-0.5 rounded-md">
            online
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <StatusDot done={s.cybleAntesFeito} partial={emAndamento(s)} label="Antes" />
        <StatusDot done={s.cybleDepoisFeito} partial={emAndamento(s)} label="Depois" />
        <StatusDot done={s.qtdDocumentos > 0} label="Doc" />
        {s.notas && s.notas.length > 0 && (
          <span className="flex items-center gap-0.5 text-[9px] text-accent" title={s.notas.join(' | ')}>
            <ChatText size={10} weight="fill" />
            {s.notas.length}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); haptic('light'); onAgendar(); }}
          className="tactile-press flex items-center justify-center w-7 h-7 rounded-lg text-content-tertiary hover:text-accent hover:bg-accent-dim transition-colors ml-1"
          aria-label={`Agendar ${s.apartamento}`}
        >
          <CalendarDots size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}
