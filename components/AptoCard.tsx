'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { CalendarDots, ChatText, Star, CheckCircle, CaretRight, Warning, CloudCheck, CloudArrowUp } from '@phosphor-icons/react';
import { useToast } from '@/components/Toast';
import { haptic } from '@/lib/haptic';
import { normApto, emAndamento } from '@/lib/utils';
import { toggleFavorito, isFavorito } from '@/lib/settings';
import StatusDot from '@/components/StatusDot';
import type { ApartamentoStatus } from '@/lib/db';

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
  onDesmarcar?: () => void;
  userRole?: string | null;
}

/**
 * Walk up from an element checking if it or any ancestor has a data-action attribute.
 * Returns the action string if found, null otherwise.
 */
function getDataAction(el: HTMLElement | null): string | null {
  while (el) {
    const action = el.getAttribute('data-action');
    if (action) return action;
    el = el.parentElement;
  }
  return null;
}

export default function AptoCard({ s, aptosOnlineDoBloco, modoCompacto, modoEscaneamento, blocoAtual, onAbrir, onAgendar, onComentario, comentarioCount = 0, onDesmarcar, userRole }: AptoCardProps) {
  const { toast } = useToast();
  const [isFavorited, setIsFavorited] = useState(() => isFavorito(s.bloco, s.apartamento));
  const [swipeX, setSwipeX] = useState(0);
  const [showSwipeAction, setShowSwipeAction] = useState<'open' | 'done' | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTouchEndRef = useRef(0);
  const didScrollRef = useRef(false);
  const swipeThreshold = 80;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    };
  }, []);

  const isComplete = s.cybleAntesFeito && s.cybleDepoisFeito;
  const isInProgress = emAndamento(s);

  /** Dispatch action based on data-action attribute */
  const dispatchAction = useCallback((action: string | null) => {
    if (!action) return false;
    haptic('light');
    switch (action) {
      case 'desmarcar':
        onDesmarcar?.();
        return true;
      case 'agendar':
        onAgendar();
        return true;
      case 'comentario':
        onComentario?.();
        return true;
      default:
        return false;
    }
  }, [onAgendar, onComentario, onDesmarcar]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    // If touch is on an action button, don't track swipe
    if (getDataAction(target)) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    didScrollRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    if (dy > 40 || dy > Math.abs(dx)) {
      didScrollRef.current = true;
      setSwipeX(0);
      setShowSwipeAction(null);
      return;
    }
    const clamped = Math.max(-120, Math.min(120, dx));
    setSwipeX(clamped);
    if (dx > swipeThreshold) setShowSwipeAction('done');
    else if (dx < -swipeThreshold) setShowSwipeAction('open');
    else setShowSwipeAction(null);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Use elementFromPoint with changedTouches for reliable target detection on mobile.
    // React's e.target on onTouchEnd can be unreliable when the handler is on a parent div.
    const touch = e.changedTouches?.[0];
    let target: HTMLElement | null;
    if (touch) {
      target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    } else {
      target = e.target as HTMLElement | null;
    }

    // If touch ended on an action button → dispatch action
    const action = getDataAction(target);
    if (action) {
      if (singleTapTimerRef.current) { clearTimeout(singleTapTimerRef.current); singleTapTimerRef.current = null; }
      dispatchAction(action);
      setSwipeX(0);
      setShowSwipeAction(null);
      lastTouchEndRef.current = Date.now();
      return;
    }

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    // If user was scrolling → skip all tap actions
    if (didScrollRef.current) {
      setSwipeX(0);
      setShowSwipeAction(null);
      lastTouchEndRef.current = now;
      return;
    }

    if (swipeX < -swipeThreshold) {
      // Swipe left → open camera
      if (singleTapTimerRef.current) { clearTimeout(singleTapTimerRef.current); singleTapTimerRef.current = null; }
      haptic('medium');
      onAbrir();
    } else if (swipeX > swipeThreshold) {
      // Swipe right → placeholder
      if (singleTapTimerRef.current) { clearTimeout(singleTapTimerRef.current); singleTapTimerRef.current = null; }
      haptic('light');
    } else if (swipeX === 0 && timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap → favorite
      if (singleTapTimerRef.current) { clearTimeout(singleTapTimerRef.current); singleTapTimerRef.current = null; }
      haptic('success');
      const wasFav = toggleFavorito(s.bloco, s.apartamento);
      setIsFavorited(wasFav);
      toast(wasFav ? 'Adicionado aos favoritos' : 'Removido dos favoritos', 'success');
    } else if (swipeX === 0) {
      // Single tap → delay before opening
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = setTimeout(() => {
        haptic('light');
        onAbrir();
      }, 320);
    }

    lastTapRef.current = now;
    lastTouchEndRef.current = now;
    setSwipeX(0);
    setShowSwipeAction(null);
  }, [swipeX, s.bloco, s.apartamento, onAbrir, dispatchAction, toast]);

  /** Handle click for PC (mouse) */
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // If clicked on an action → dispatch
    const action = getDataAction(target);
    if (action) {
      dispatchAction(action);
      return;
    }
    // On mobile, click fires after touchend — skip to avoid double-triggering
    if (Date.now() - lastTouchEndRef.current < 400) return;
    onAbrir();
  }, [onAbrir, dispatchAction]);

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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? 'transform 0.2s ease' : 'none' }}
        className={`tactile-press flex items-center justify-between cursor-pointer hover:bg-base-overlay/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors relative ${
          statusGradient(s)
        } ${modoCompacto ? 'px-3 py-2' : 'px-4 py-3.5'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`badge-mono-pill px-2.5 py-0.5 font-bold tracking-tight text-content ${modoCompacto ? 'text-xs' : 'text-sm'}`}>
            {s.apartamento}
          </span>
          {isFavorited && <Star size={12} weight="fill" className="text-warn flex-shrink-0" />}

          {/* Indicador de Sincronização em Nuvem / Local */}
          {(s.qtdPendentes ?? 0) > 0 ? (
            <span
              className="flex items-center gap-1 text-[10px] font-mono text-warn bg-warn/10 border border-warn/20 px-2 py-0.5 rounded-full flex-shrink-0"
              title={`${s.qtdPendentes} foto(s) pendente(s) de envio para a nuvem`}
            >
              <CloudArrowUp size={12} weight="duotone" className="animate-pulse" />
              <span>{s.qtdPendentes}</span>
            </span>
          ) : ((s.qtdSynced ?? 0) > 0 || aptosOnlineDoBloco.has(normApto(s.apartamento))) ? (
            <span
              className="flex items-center gap-1 text-[10px] font-mono text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full flex-shrink-0"
              title="Fotos salvas e sincronizadas na nuvem"
            >
              <CloudCheck size={12} weight="duotone" />
              <span className="hidden sm:inline text-[9px]">nuvem</span>
            </span>
          ) : s.qtdFotos > 0 ? (
            <span className={`font-mono text-content-tertiary bg-base-overlay px-2 py-0.5 rounded-full flex-shrink-0 ${modoCompacto ? 'text-[9px]' : 'text-[10px]'}`}>
              {s.qtdFotos} foto{s.qtdFotos > 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusDot done={s.cybleAntesFeito} partial={isInProgress} label="Antes" />
          <StatusDot done={s.cybleDepoisFeito} partial={isInProgress} label="Depois" />
          <StatusDot done={s.qtdDocumentos > 0} label="Doc" />
          {s.notas && s.notas.length > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-accent" title={s.notas.join(' | ')}>
              <ChatText size={10} weight="fill" />
              {s.notas.length}
            </span>
          )}
          {/* Agendar */}
          <div
            data-action="agendar"
            className="tactile-press flex items-center justify-center w-8 h-8 rounded-lg text-content-tertiary hover:text-accent hover:bg-accent-dim transition-colors ml-0.5 cursor-pointer"
            role="button"
            aria-label={`Agendar ${s.apartamento}`}
          >
            <CalendarDots size={16} weight="bold" />
          </div>
          {/* Comentario */}
          {onComentario && (
            <div
              data-action="comentario"
              className="tactile-press relative flex items-center justify-center w-8 h-8 rounded-lg text-content-tertiary hover:text-accent hover:bg-accent-dim transition-colors cursor-pointer"
              role="button"
              aria-label={`Comentarios de ${s.apartamento}`}
            >
              <ChatText size={16} weight="bold" />
              {comentarioCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-accent text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {comentarioCount > 9 ? '9+' : comentarioCount}
                </span>
              )}
            </div>
          )}
          {/* Desmarcar — admin only, completed only */}
          {isComplete && onDesmarcar && userRole === 'admin' && (
            <div
              data-action="desmarcar"
              className="tactile-press flex items-center justify-center w-8 h-8 rounded-lg text-content-tertiary hover:text-danger hover:bg-danger-dim transition-colors cursor-pointer"
              role="button"
              aria-label={`Desmarcar conclusao de ${s.apartamento}`}
              title="Desmarcar como concluido"
            >
              <Warning size={16} weight="bold" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
