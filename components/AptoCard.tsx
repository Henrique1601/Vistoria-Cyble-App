'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, CalendarDots, ChatText, Star, CheckCircle, CaretRight } from '@phosphor-icons/react';
import { useLongPress } from '@/components/ContextMenu';
import { haptic } from '@/lib/haptic';
import { normApto } from '@/lib/utils';
import { toggleFavorito, getFavoritos } from '@/lib/settings';
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

function statusGradient(s: ApartamentoStatus): string {
  if (s.cybleAntesFeito && s.cybleDepoisFeito) return 'bg-gradient-to-r from-success/5 to-transparent';
  if (s.cybleAntesFeito || s.cybleDepoisFeito) return 'bg-gradient-to-r from-warn/5 to-transparent';
  return '';
}

interface AptoCardProps {
  s: ApartamentoStatus;
  aptosOnlineDoBloco: Set<string>;
  modoCompacto: boolean;
  modoEscaneamento: boolean;
  blocoAtual: string | null;
  onAbrir: () => void;
  onAgendar: () => void;
  onComentario?: () => void;
  comentarioCount?: number;
}

export default function AptoCard({ s, aptosOnlineDoBloco, modoCompacto, modoEscaneamento, blocoAtual, onAbrir, onAgendar, onComentario, comentarioCount = 0 }: AptoCardProps) {
  const [isFavorited, setIsFavorited] = useState(() => getFavoritos().has(s.apartamento));
  const [swipeX, setSwipeX] = useState(0);
  const [showSwipeAction, setShowSwipeAction] = useState<'open' | 'done' | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef(0);
  const swipeThreshold = 80;

  const longPressProps = useLongPress({
    onLongPress: () => {
      haptic('medium');
      onAbrir();
    },
    onClick: () => { haptic('light'); onAbrir(); },
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    if (dy > 20) { setSwipeX(0); setShowSwipeAction(null); return; }
    const clamped = Math.max(-120, Math.min(120, dx));
    setSwipeX(clamped);
    if (dx > swipeThreshold) setShowSwipeAction('done');
    else if (dx < -swipeThreshold) setShowSwipeAction('open');
    else setShowSwipeAction(null);
  }, []);

  const handleTouchEnd = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (Math.abs(swipeX) > swipeThreshold) {
      haptic('medium');
      if (showSwipeAction === 'done') {
        onAbrir();
      } else if (showSwipeAction === 'open') {
        onAbrir();
      }
    } else if (swipeX === 0 && timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      haptic('success');
      const wasFav = toggleFavorito(s.apartamento);
      setIsFavorited(wasFav);
    }

    lastTapRef.current = now;
    setSwipeX(0);
    setShowSwipeAction(null);
  }, [swipeX, showSwipeAction, s.apartamento, onAbrir]);

  const isComplete = s.cybleAntesFeito && s.cybleDepoisFeito;
  const isInProgress = emAndamento(s);

  return (
    <div className="relative overflow-hidden">
      {/* Swipe background — left action (open camera) */}
      {swipeX < -20 && (
        <div className="absolute inset-0 flex items-center pl-4 bg-accent/10 rounded-l-xl">
          <CaretRight size={20} weight="bold" className="text-accent" />
          <span className="text-xs font-medium text-accent ml-1">Abrir</span>
        </div>
      )}
      {/* Swipe background — right action (mark done) */}
      {swipeX > 20 && (
        <div className="absolute inset-0 flex items-center justify-end pr-4 bg-success/10 rounded-r-xl">
          <span className="text-xs font-medium text-success mr-1">Concluir</span>
          <CheckCircle size={20} weight="bold" className="text-success" />
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        {...longPressProps}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic('light'); onAbrir(); } }}
        style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? 'transform 0.2s ease' : 'none' }}
        className={`tactile-press flex items-center justify-between cursor-pointer hover:bg-base-overlay/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors relative ${
          statusGradient(s)
        } ${modoCompacto ? 'px-3 py-2' : 'px-4 py-3.5'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`font-mono font-medium ${modoCompacto ? 'text-xs' : 'text-sm'}`}>{s.apartamento}</span>
          {isFavorited && <Star size={12} weight="fill" className="text-warn flex-shrink-0" />}
          {s.qtdFotos > 0 && (
            <span className={`font-mono text-content-tertiary bg-base-overlay px-2 py-0.5 rounded-md flex-shrink-0 ${modoCompacto ? 'text-[9px]' : 'text-[11px]'}`}>
              {s.qtdFotos} foto{s.qtdFotos > 1 ? 's' : ''}
            </span>
          )}
          {aptosOnlineDoBloco.has(normApto(s.apartamento)) && s.qtdFotos === 0 && (
            <span className="text-[11px] font-mono text-success bg-success/10 px-2 py-0.5 rounded-md flex-shrink-0">
              online
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatusDot done={s.cybleAntesFeito} partial={isInProgress} label="Antes" />
          <StatusDot done={s.cybleDepoisFeito} partial={isInProgress} label="Depois" />
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
          {onComentario && (
            <button
              onClick={(e) => { e.stopPropagation(); haptic('light'); onComentario(); }}
              className="tactile-press relative flex items-center justify-center w-7 h-7 rounded-lg text-content-tertiary hover:text-accent hover:bg-accent-dim transition-colors"
              aria-label={`Comentarios de ${s.apartamento}`}
            >
              <ChatText size={14} weight="bold" />
              {comentarioCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-accent text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {comentarioCount > 9 ? '9+' : comentarioCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
