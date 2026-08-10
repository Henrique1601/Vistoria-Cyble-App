'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pencil,
  ArrowUpRight,
  TextAa,
  ArrowUUpLeft,
  ArrowUUpRight,
  Check,
  X,
  Palette,
  Eraser,
  HighlighterCircle,
  Square,
  Circle,
  Trash,
  Minus,
  Plus,
} from '@phosphor-icons/react';
import {
  criarEstadoInicial,
  renderizarCanvas,
  obterPontoCanvas,
  paraBlob,
  encontrarAcaoProxima,
  EstadoEditor,
  Ferramenta,
  AcaoDesenho,
} from '@/lib/drawing';
import { haptic } from '@/lib/haptic';

const CORES = [
  '#FF0000', '#FF6B35', '#FFAA00', '#FFFF00',
  '#00FF00', '#00CC88', '#0066FF', '#3399FF',
  '#FF00FF', '#CC33FF', '#FFFFFF', '#000000',
];
const ESPESSES = [2, 4, 6, 10];
const TAMANHOS_TEXTO = [20, 28, 36, 48, 64];

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
  const [showOpcoes, setShowOpcoes] = useState(false);
  const [textoInput, setTextoInput] = useState('');
  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  // Pinch zoom state
  const lastTouchDistance = useRef<number>(0);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

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

    if (estadoAtual.ferramenta === 'borracha') {
      const idx = encontrarAcaoProxima(estadoAtual.acoes, ponto, 25);
      if (idx >= 0) {
        haptic('medium');
        setEstado((prev) => ({
          ...prev,
          acoes: prev.acoes.filter((_, i) => i !== idx),
          acoesDesfeitas: [],
        }));
      }
      return;
    }

    setEstado((prev) => ({
      ...prev,
      desenhando: true,
      pontoAtual: ponto,
      acoesDesfeitas: [],
      acoes:
        estadoAtual.ferramenta === 'caneta' || estadoAtual.ferramenta === 'marcador'
          ? [
              ...prev.acoes,
              {
                tipo: estadoAtual.ferramenta,
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

    if (estadoAtual.ferramenta === 'caneta' || estadoAtual.ferramenta === 'marcador') {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const p = pendingPointRef.current;
        if (!p) return;
        pendingPointRef.current = null;
        const tipo = estadoAtual.ferramenta;
        setEstado((prev) => {
          const acoes = [...prev.acoes];
          const ultima = acoes[acoes.length - 1];
          if (ultima && (ultima.tipo === 'caneta' || ultima.tipo === 'marcador') && ultima.tipo === tipo) {
            acoes[acoes.length - 1] = {
              ...ultima,
              pontos: [...ultima.pontos, p],
            };
          }
          return { ...prev, acoes };
        });
      });
      pendingPointRef.current = ponto;
    } else if (
      (estadoAtual.ferramenta === 'seta' ||
        estadoAtual.ferramenta === 'retangulo' ||
        estadoAtual.ferramenta === 'circulo') &&
      estadoAtual.pontoAtual
    ) {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const p = pendingPointRef.current;
        if (!p) return;
        pendingPointRef.current = null;
        setEstado((prev) => {
          const acoes = [...prev.acoes];
          const ultima = acoes[acoes.length - 1];

          if (estadoAtual.ferramenta === 'seta') {
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
          } else if (estadoAtual.ferramenta === 'retangulo') {
            if (ultima?.tipo === 'retangulo') {
              acoes[acoes.length - 1] = { ...ultima, fim: p };
            } else {
              acoes.push({
                tipo: 'retangulo',
                inicio: estadoAtual.pontoAtual!,
                fim: p,
                cor: prev.cor,
                espessura: prev.espessura,
              });
            }
          } else if (estadoAtual.ferramenta === 'circulo') {
            const dx = p.x - estadoAtual.pontoAtual!.x;
            const dy = p.y - estadoAtual.pontoAtual!.y;
            const raio = Math.sqrt(dx * dx + dy * dy);
            if (ultima?.tipo === 'circulo') {
              acoes[acoes.length - 1] = { ...ultima, raio };
            } else {
              acoes.push({
                tipo: 'circulo',
                centro: estadoAtual.pontoAtual!,
                raio,
                cor: prev.cor,
                espessura: prev.espessura,
              });
            }
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

  // Pinch-to-zoom handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / lastTouchDistance.current;
      lastTouchDistance.current = dist;

      setEstado((prev) => ({
        ...prev,
        zoom: Math.max(0.5, Math.min(4, prev.zoom * scale)),
      }));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = 0;
    lastTouchCenter.current = null;
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

  const handleRefazer = useCallback(() => {
    setEstado((prev) => {
      if (prev.acoesDesfeitas.length === 0) return prev;
      const acoesDesfeitas = prev.acoesDesfeitas.slice(0, -1);
      const acoes = [...prev.acoes, prev.acoesDesfeitas[prev.acoesDesfeitas.length - 1]];
      return { ...prev, acoes, acoesDesfeitas };
    });
    haptic('light');
  }, []);

  const handleLimparTudo = useCallback(() => {
    setEstado((prev) => ({ ...prev, acoes: [], acoesDesfeitas: [] }));
    haptic('heavy');
  }, []);

  const handleSalvarTexto = useCallback(() => {
    const estadoAtual = estadoRef.current;
    if (!estadoAtual.textoPendente || !textoInput.trim()) return;

    const novaAcao: AcaoDesenho = {
      tipo: 'texto',
      posicao: estadoAtual.textoPendente.posicao,
      texto: textoInput.trim(),
      cor: estadoAtual.cor,
      tamanho: estadoAtual.tamanhoTexto,
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

  const handleZoomIn = useCallback(() => {
    setEstado((prev) => ({
      ...prev,
      zoom: Math.min(4, prev.zoom * 1.25),
    }));
    haptic('light');
  }, []);

  const handleZoomOut = useCallback(() => {
    setEstado((prev) => ({
      ...prev,
      zoom: Math.max(0.5, prev.zoom / 1.25),
    }));
    haptic('light');
  }, []);

  const handleZoomReset = useCallback(() => {
    setEstado((prev) => ({ ...prev, zoom: 1 }));
    haptic('light');
  }, []);

  const ferramentas: { id: Ferramenta; icon: React.ReactNode; label: string }[] = [
    { id: 'caneta', icon: <Pencil size={16} weight="bold" />, label: 'Caneta' },
    { id: 'marcador', icon: <HighlighterCircle size={16} weight="bold" />, label: 'Marcador' },
    { id: 'seta', icon: <ArrowUpRight size={16} weight="bold" />, label: 'Seta' },
    { id: 'retangulo', icon: <Square size={16} weight="bold" />, label: 'Retangulo' },
    { id: 'circulo', icon: <Circle size={16} weight="bold" />, label: 'Circulo' },
    { id: 'texto', icon: <TextAa size={16} weight="bold" />, label: 'Texto' },
    { id: 'borracha', icon: <Eraser size={16} weight="bold" />, label: 'Borracha' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-base z-[70] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-base-border bg-base-raised">
        <button
          onClick={onCancelar}
          className="tactile-press w-9 h-9 rounded-xl bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary hover:text-danger transition-colors"
          aria-label="Cancelar"
        >
          <X size={16} weight="bold" />
        </button>

        {/* Tool buttons — scrollable on mobile */}
        <div className="flex items-center gap-0.5 overflow-x-auto px-1">
          {ferramentas.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setEstado((prev) => ({ ...prev, ferramenta: f.id }));
                setShowCores(false);
                setShowOpcoes(false);
              }}
              className={`tactile-press w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                estado.ferramenta === f.id
                  ? 'bg-accent text-base'
                  : 'bg-base-overlay border border-base-border text-content-secondary hover:text-content'
              }`}
              aria-label={f.label}
            >
              {f.icon}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5">
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
          <button
            onClick={() => setShowOpcoes(!showOpcoes)}
            className="tactile-press w-9 h-9 rounded-xl bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary hover:text-content transition-colors"
            aria-label="Opcoes"
          >
            <Palette size={16} weight="bold" />
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={handleDesfazer}
            disabled={estado.acoes.length === 0}
            className="tactile-press w-8 h-8 rounded-lg bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary hover:text-content disabled:opacity-30 transition-colors"
            aria-label="Desfazer"
          >
            <ArrowUUpLeft size={14} weight="bold" />
          </button>
          <button
            onClick={handleRefazer}
            disabled={estado.acoesDesfeitas.length === 0}
            className="tactile-press w-8 h-8 rounded-lg bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary hover:text-content disabled:opacity-30 transition-colors"
            aria-label="Refazer"
          >
            <ArrowUUpRight size={14} weight="bold" />
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

      {/* Color picker panel */}
      <AnimatePresence>
        {showCores && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 py-2 border-b border-base-border bg-base-raised overflow-hidden"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              {CORES.map((cor) => (
                <button
                  key={cor}
                  onClick={() => {
                    setEstado((prev) => ({ ...prev, cor }));
                  }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    estado.cor === cor ? 'border-accent scale-110' : 'border-base-border'
                  }`}
                  style={{ backgroundColor: cor }}
                  aria-label={`Cor ${cor}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options panel (thickness, text size, clear) */}
      <AnimatePresence>
        {showOpcoes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 py-2 border-b border-base-border bg-base-raised overflow-hidden"
          >
            <div className="flex flex-col gap-2">
              {/* Thickness */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-content-secondary w-14">Espessura</span>
                <div className="flex items-center gap-1">
                  {ESPESSES.map((e) => (
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
              </div>

              {/* Text size */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-content-secondary w-14">Texto</span>
                <div className="flex items-center gap-1">
                  {TAMANHOS_TEXTO.map((t) => (
                    <button
                      key={t}
                      onClick={() => setEstado((prev) => ({ ...prev, tamanhoTexto: t }))}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono ${
                        estado.tamanhoTexto === t
                          ? 'bg-accent text-base'
                          : 'bg-base-overlay border border-base-border text-content-secondary'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-content-secondary w-14">Zoom</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleZoomOut}
                    className="w-7 h-7 rounded-lg bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary"
                  >
                    <Minus size={12} />
                  </button>
                  <button
                    onClick={handleZoomReset}
                    className="px-2 h-7 rounded-lg bg-base-overlay border border-base-border text-[10px] font-mono text-content-secondary"
                  >
                    {Math.round(estado.zoom * 100)}%
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="w-7 h-7 rounded-lg bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              {/* Clear all */}
              {estado.acoes.length > 0 && (
                <button
                  onClick={handleLimparTudo}
                  className="flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-danger bg-danger/10 border border-danger/20 rounded-lg"
                >
                  <Trash size={12} />
                  Limpar tudo ({estado.acoes.length})
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-black/50"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="absolute touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {/* Zoom indicator */}
        {estado.zoom !== 1 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-[10px] rounded-lg font-mono">
            {Math.round(estado.zoom * 100)}%
          </div>
        )}
      </div>

      {/* Text input panel */}
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
