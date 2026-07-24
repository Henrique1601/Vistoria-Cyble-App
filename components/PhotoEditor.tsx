'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pencil,
  ArrowUpRight,
  TextAa,
  ArrowUUpLeft,
  Check,
  X,
  Palette,
} from '@phosphor-icons/react';
import {
  criarEstadoInicial,
  renderizarCanvas,
  obterPontoCanvas,
  paraBlob,
  EstadoEditor,
  Ferramenta,
  AcaoDesenho,
} from '@/lib/drawing';
import { haptic } from '@/lib/haptic';

const CORES = ['#FF0000', '#00FF00', '#0066FF', '#FFFF00', '#FF00FF', '#FFFFFF'];
const ESCALAS = [1, 2, 3];

export default function PhotoEditor({
  imagemBlob,
  onSalvar,
  onCancelar,
}: {
  imagemBlob: Blob;
  onSalvar: (blob: Blob) => void;
  onCancelar: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<EstadoEditor>(criarEstadoInicial);
  const [showCores, setShowCores] = useState(false);
  const [textoInput, setTextoInput] = useState('');
  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setEstado((prev) => ({ ...prev, imagem: img }));
    };
    img.src = URL.createObjectURL(imagemBlob);
    return () => {
      img.src = '';
    };
  }, [imagemBlob]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !estado.imagem) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const imgW = estado.imagem.width;
    const imgH = estado.imagem.height;

    const escala = Math.min(containerW / imgW, containerH / imgH, 1);
    const w = Math.round(imgW * escala);
    const h = Math.round(imgH * escala);

    canvas.width = w;
    canvas.height = h;

    const offsetX = (containerW - w) / 2;
    const offsetY = (containerH - h) / 2;

    setEstado((prev) => ({
      ...prev,
      offset: { x: offsetX, y: offsetY },
      escala,
    }));
  }, [estado.imagem]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderizarCanvas(canvas, estado);
  }, [estado]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !estadoRef.current.imagem) return;

    const estadoAtual = estadoRef.current;
    const ponto = obterPontoCanvas(canvas, estadoAtual, e.clientX, e.clientY);

    if (estadoAtual.ferramenta === 'texto') {
      setEstado((prev) => ({
        ...prev,
        textoPendente: { posicao: ponto, texto: '' },
      }));
      setTextoInput('');
      return;
    }

    setEstado((prev) => ({
      ...prev,
      desenhando: true,
      pontoAtual: ponto,
      acoesDesfeitas: [],
      acoes:
        estadoAtual.ferramenta === 'caneta'
          ? [
              ...prev.acoes,
              {
                tipo: 'caneta',
                pontos: [ponto],
                cor: prev.cor,
                espessura: prev.espessura,
              },
            ]
          : prev.acoes,
    }));
    haptic('light');
  }, []);

  const rafRef = useRef<number>(0);
  const pendingPointRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !estadoRef.current.desenhando) return;

    const estadoAtual = estadoRef.current;
    const ponto = obterPontoCanvas(canvas, estadoAtual, e.clientX, e.clientY);

    if (estadoAtual.ferramenta === 'caneta') {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const p = pendingPointRef.current;
        if (!p) return;
        pendingPointRef.current = null;
        setEstado((prev) => {
          const acoes = [...prev.acoes];
          const ultima = acoes[acoes.length - 1];
          if (ultima?.tipo === 'caneta') {
            acoes[acoes.length - 1] = {
              ...ultima,
              pontos: [...ultima.pontos, p],
            };
          }
          return { ...prev, acoes };
        });
      });
      pendingPointRef.current = ponto;
    } else if (estadoAtual.ferramenta === 'seta' && estadoAtual.pontoAtual) {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const p = pendingPointRef.current;
        if (!p) return;
        pendingPointRef.current = null;
        setEstado((prev) => {
          const acoes = [...prev.acoes];
          const ultima = acoes[acoes.length - 1];
          if (ultima?.tipo === 'seta') {
            acoes[acoes.length - 1] = { ...ultima, fim: p };
          } else {
            acoes.push({
              tipo: 'seta',
              inicio: estadoAtual.pontoAtual!,
              fim: p,
              cor: prev.cor,
              espessura: prev.espessura,
            });
          }
          return { ...prev, acoes };
        });
      });
      pendingPointRef.current = ponto;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    setEstado((prev) => ({
      ...prev,
      desenhando: false,
      pontoAtual: null,
    }));
  }, []);

  const handleDesfazer = useCallback(() => {
    setEstado((prev) => {
      if (prev.acoes.length === 0) return prev;
      const acoes = prev.acoes.slice(0, -1);
      const acoesDesfeitas = [...prev.acoesDesfeitas, prev.acoes[prev.acoes.length - 1]];
      return { ...prev, acoes, acoesDesfeitas };
    });
    haptic('light');
  }, []);

  const handleSalvarTexto = useCallback(() => {
    const estadoAtual = estadoRef.current;
    if (!estadoAtual.textoPendente || !textoInput.trim()) return;

    const novaAcao: AcaoDesenho = {
      tipo: 'texto',
      posicao: estadoAtual.textoPendente.posicao,
      texto: textoInput.trim(),
      cor: estadoAtual.cor,
      tamanho: 32,
    };

    setEstado((prev) => ({
      ...prev,
      acoes: [...prev.acoes, novaAcao],
      textoPendente: null,
    }));
    setTextoInput('');
    haptic('light');
  }, [textoInput]);

  const handleSalvar = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    haptic('success');
    const blob = await paraBlob(canvas);
    onSalvar(blob);
  }, [onSalvar]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-base z-[70] flex flex-col"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-base-border bg-base-raised">
        <button
          onClick={onCancelar}
          className="tactile-press w-9 h-9 rounded-xl bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary hover:text-danger transition-colors"
          aria-label="Cancelar"
        >
          <X size={16} weight="bold" />
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setEstado((prev) => ({ ...prev, ferramenta: 'caneta' }))}
            className={`tactile-press w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              estado.ferramenta === 'caneta'
                ? 'bg-accent text-base'
                : 'bg-base-overlay border border-base-border text-content-secondary hover:text-content'
            }`}
            aria-label="Caneta"
          >
            <Pencil size={16} weight="bold" />
          </button>
          <button
            onClick={() => setEstado((prev) => ({ ...prev, ferramenta: 'seta' }))}
            className={`tactile-press w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              estado.ferramenta === 'seta'
                ? 'bg-accent text-base'
                : 'bg-base-overlay border border-base-border text-content-secondary hover:text-content'
            }`}
            aria-label="Seta"
          >
            <ArrowUpRight size={16} weight="bold" />
          </button>
          <button
            onClick={() => setEstado((prev) => ({ ...prev, ferramenta: 'texto' }))}
            className={`tactile-press w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              estado.ferramenta === 'texto'
                ? 'bg-accent text-base'
                : 'bg-base-overlay border border-base-border text-content-secondary hover:text-content'
            }`}
            aria-label="Texto"
          >
            <TextAa size={16} weight="bold" />
          </button>

          <div className="w-px h-5 bg-base-border mx-1" />

          <button
            onClick={() => setShowCores(!showCores)}
            className="tactile-press w-9 h-9 rounded-xl bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary hover:text-content transition-colors"
            aria-label="Cor"
          >
            <div
              className="w-4 h-4 rounded-full border border-base-border"
              style={{ backgroundColor: estado.cor }}
            />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleDesfazer}
            disabled={estado.acoes.length === 0}
            className="tactile-press w-9 h-9 rounded-xl bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary hover:text-content disabled:opacity-30 transition-colors"
            aria-label="Desfazer"
          >
            <ArrowUUpLeft size={16} weight="bold" />
          </button>
          <button
            onClick={handleSalvar}
            className="tactile-press w-9 h-9 rounded-xl bg-accent text-base flex items-center justify-center hover:bg-accent-hover transition-colors"
            aria-label="Salvar"
          >
            <Check size={16} weight="bold" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showCores && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 py-2 border-b border-base-border bg-base-raised flex items-center gap-2"
          >
            {CORES.map((cor) => (
              <button
                key={cor}
                onClick={() => {
                  setEstado((prev) => ({ ...prev, cor }));
                  setShowCores(false);
                }}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  estado.cor === cor ? 'border-accent scale-110' : 'border-base-border'
                }`}
                style={{ backgroundColor: cor }}
                aria-label={`Cor ${cor}`}
              />
            ))}
            <div className="ml-auto flex items-center gap-1">
              {ESCALAS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEstado((prev) => ({ ...prev, espessura: e }))}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono ${
                    estado.espessura === e
                      ? 'bg-accent text-base'
                      : 'bg-base-overlay border border-base-border text-content-secondary'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-black/50">
        <canvas
          ref={canvasRef}
          className="absolute touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      <AnimatePresence>
        {estado.textoPendente && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-3 right-3 bg-base-raised border border-base-border rounded-xl p-3 shadow-lg"
          >
            <input
              type="text"
              value={textoInput}
              onChange={(e) => setTextoInput(e.target.value)}
              placeholder="Digite o texto..."
              autoFocus
              className="w-full bg-base-overlay border border-base-border rounded-lg px-4 py-3 text-base text-content focus:border-accent/50 outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSalvarTexto();
                if (e.key === 'Escape') {
                  setEstado((prev) => ({ ...prev, textoPendente: null }));
                  setTextoInput('');
                }
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setEstado((prev) => ({ ...prev, textoPendente: null }));
                  setTextoInput('');
                }}
                className="flex-1 py-2 text-xs font-medium text-content-secondary bg-base-overlay border border-base-border rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarTexto}
                className="flex-1 py-2 text-xs font-medium text-base bg-accent rounded-lg"
              >
                Adicionar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
