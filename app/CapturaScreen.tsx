'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  Trash,
  FileText,
  CloudCheck,
  Hourglass,
  Image as ImageIcon,
  ChatText,
  ShareNetwork,
  ArrowsLeftRight,
  Clock,
  ArrowRight,
  Repeat,
  X,
  ArrowsOut,
  DotsSixVertical,
} from '@phosphor-icons/react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { salvarFoto, deletarFoto, fotosDoApartamento, comprimirImagem, atualizarNota, moverFotoCategoria, reordenarFotos, FotoRecord, Categoria } from '@/lib/db';
import { useToast } from '@/components/Toast';
import { haptic } from '@/lib/haptic';
import { playScanFeedback } from '@/lib/scanPro';
import { EmptyStatePhotos } from '@/components/EmptyState';
import PhotoEditor from '@/components/PhotoEditor';
import { spring, stagger, item } from '@/lib/motion';

const CATEGORIAS: { key: Categoria; label: string; icon: React.ReactNode; multi: boolean }[] = [
  { key: 'cyble_antes', label: 'Cyble — Antes', icon: <Camera size={16} weight="duotone" />, multi: false },
  { key: 'cyble_depois', label: 'Cyble — Depois', icon: <Camera size={16} weight="duotone" />, multi: true },
  { key: 'documento', label: 'Documento do apartamento', icon: <FileText size={16} weight="duotone" />, multi: true },
];

function SortablePhoto({
  foto,
  src,
  categoriaLabel,
  isDragging,
  onDelete,
  onShare,
  onZoom,
  compartilhando,
}: {
  foto: FotoRecord;
  src: string;
  categoriaLabel: string;
  isDragging: boolean;
  onDelete: (id: number) => void;
  onShare: (f: FotoRecord) => void;
  onZoom: (src: string) => void;
  compartilhando: number | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } = useSortable({
    id: foto.id!,
    data: { type: 'photo', foto },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group touch-none">
      {src ? (
        <button
          onClick={(e) => { e.stopPropagation(); onZoom(src); }}
          className="w-16 h-16 rounded-xl overflow-hidden border border-base-border hover:border-accent/30 transition-colors"
        >
          <img src={src} alt="" className="w-full h-full object-cover" />
        </button>
      ) : (
        <div className="w-16 h-16 rounded-xl bg-base-overlay border border-base-border flex items-center justify-center">
          <ImageIcon size={20} weight="light" className="text-content-tertiary" aria-hidden="true" />
        </div>
      )}

      <div className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full border-2 border-base-raised flex items-center justify-center text-[9px] ${
        foto.synced ? 'bg-success text-base' : 'bg-base-overlay text-content-tertiary border-base-border'
      }`} title={foto.synced ? 'Sincronizada' : 'Pendente'}>
        {foto.synced ? <CloudCheck size={10} weight="bold" /> : <Hourglass size={10} weight="bold" />}
      </div>

      <button
        onClick={() => foto.id && onDelete(foto.id)}
        aria-label={`Excluir foto ${categoriaLabel}`}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger border-2 border-base-raised flex items-center justify-center text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      >
        <Trash size={10} weight="bold" aria-hidden="true" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onShare(foto); }}
        disabled={compartilhando === foto.id}
        aria-label={`Compartilhar foto ${categoriaLabel}`}
        className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-accent border-2 border-base-raised flex items-center justify-center text-base opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      >
        <ShareNetwork size={9} weight="bold" aria-hidden="true" />
      </button>

      <div
        {...attributes}
        {...listeners}
        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-base-overlay border-2 border-base-raised flex items-center justify-center text-content-tertiary opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        title="Arrastar"
      >
        <DotsSixVertical size={10} weight="bold" aria-hidden="true" />
      </div>
    </div>
  );
}

export default function CapturaScreen({
  bloco,
  apartamento,
  onVoltar,
  onFotoSalva,
  modoEscaneamento = false,
  fotosOnline = [],
  proximoApto,
  onProximoApto,
}: {
  bloco: string;
  apartamento: string;
  onVoltar: () => void;
  onFotoSalva: () => void;
  modoEscaneamento?: boolean;
  fotosOnline?: { foto_url: string; foto_index: number; data_leitura: string }[];
  proximoApto?: string;
  onProximoApto?: () => void;
}) {
  const [fotos, setFotos] = useState<FotoRecord[]>([]);
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const [timer, setTimer] = useState(0);
  const [showCompare, setShowCompare] = useState(false);
  const [compartilhando, setCompartilhando] = useState<number | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<{ blob: Blob; categoria: Categoria } | null>(null);
  const [keepInCamera, setKeepInCamera] = useState(false);
  const [fotoZoom, setFotoZoom] = useState<string | null>(null);
  const { toast } = useToast();
  const deletedRef = useRef<Map<number, FotoRecord>>(new Map());
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overCategory, setOverCategory] = useState<Categoria | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const activePhoto = activeId ? fotos.find((f) => f.id === activeId) : null;

  async function recarregar() {
    const f = await fotosDoApartamento(bloco, apartamento);
    setFotos(f);
  }

  useEffect(() => {
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloco, apartamento]);

  // Timer por apto
  useEffect(() => {
    setTimer(0);
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [bloco, apartamento]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Compartilhar foto individual
  async function handleCompartilhar(f: FotoRecord) {
    if (!f.id) return;
    haptic('light');
    setCompartilhando(f.id);
    try {
      const blob = f.blob.size > 0 ? f.blob : await fetch(f.uploadUrl || '').then((r) => r.blob());
      const file = new File([blob], `${f.categoria}_${f.apartamento}.jpg`, { type: 'image/jpeg' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${bloco} - ${apartamento} - ${f.categoria}`, files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${bloco}_${apartamento}_${f.categoria}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* user cancelled */ }
    setCompartilhando(null);
  }

  // GPS: obter geolocalização
  function getGPS(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000, maximumAge: 60000 }
      );
    });
  }

  // Modo escaneamento: abre câmera automaticamente na primeira categoria vazia
  useEffect(() => {
    if (!modoEscaneamento) return;
    const timer = setTimeout(() => {
      for (const cat of CATEGORIAS) {
        const temFoto = fotos.some((f) => f.categoria === cat.key);
        if (!temFoto || cat.multi) {
          inputsRef.current[cat.key]?.click();
          break;
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [modoEscaneamento, fotos]);

  async function handleFile(categoria: Categoria, file: File | null) {
    if (!file) return;
    haptic('medium');
    const dataStr = new Date().toLocaleDateString('pt-BR');
    const comprimido = await comprimirImagem(file, { texto: dataStr, bloco, apartamento });
    setEditingPhoto({ blob: comprimido, categoria });
  }

  async function handleEditorSalvar(blob: Blob) {
    if (!editingPhoto) return;
    const dataStr = new Date().toLocaleDateString('pt-BR');
    const [comprimido, gps] = await Promise.all([comprimirImagem(new File([blob], 'foto.jpg', { type: 'image/jpeg' }), { texto: dataStr, bloco, apartamento }), getGPS()]);
    const cat = editingPhoto.categoria;
    const isMulti = CATEGORIAS.find((c) => c.key === cat)?.multi ?? false;
    await salvarFoto({
      bloco, apartamento, categoria: cat, blob: comprimido, timestamp: Date.now(), synced: false,
      gps: gps || undefined,
    });
    haptic('success');
    playScanFeedback('photo_captured');
    setEditingPhoto(null);
    await recarregar();
    onFotoSalva();
    if (keepInCamera && isMulti) {
      setTimeout(() => { inputsRef.current[cat]?.click(); }, 300);
    }
  }

  async function handleDeletar(id: number) {
    const foto = fotos.find((f) => f.id === id);
    if (!foto) return;
    haptic('heavy');
    deletedRef.current.set(id, foto);
    await deletarFoto(id);
    await recarregar();
    onFotoSalva();
    toast('Foto excluida', 'info', {
      duration: 5000,
      undoLabel: 'Desfazer',
      onUndo: async () => {
        const restored = deletedRef.current.get(id);
        if (restored) {
          haptic('light');
          await salvarFoto({
            bloco: restored.bloco,
            apartamento: restored.apartamento,
            categoria: restored.categoria,
            blob: restored.blob,
            timestamp: restored.timestamp,
            synced: false,
            gps: restored.gps,
          });
          deletedRef.current.delete(id);
          await recarregar();
          onFotoSalva();
          toast('Foto restaurada', 'success');
        }
      },
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    setActiveId(active.id as number);
    haptic('light');
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setOverCategory(null);
      return;
    }
    const overData = over.data.current;
    if (overData?.type === 'category') {
      setOverCategory(overData.catKey as Categoria);
    } else if (overData?.type === 'photo') {
      setOverCategory(overData.foto.categoria as Categoria);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverCategory(null);
    if (!over || !active.id) return;

    const activeFoto = fotos.find((f) => f.id === active.id);
    if (!activeFoto) return;

    const overData = over.data.current;
    let targetCategoria: Categoria | null = null;

    if (overData?.type === 'category') {
      targetCategoria = overData.catKey as Categoria;
    } else if (overData?.type === 'photo') {
      targetCategoria = overData.foto.categoria as Categoria;
    }

    if (targetCategoria && targetCategoria !== activeFoto.categoria) {
      const catConfig = CATEGORIAS.find((c) => c.key === targetCategoria);
      const fotosNaCategoria = fotos.filter((f) => f.categoria === targetCategoria);
      if (catConfig && !catConfig.multi && fotosNaCategoria.length >= 1) {
        toast(`${catConfig.label} já possui foto`, 'warning');
        return;
      }
      haptic('medium');
      await moverFotoCategoria(activeFoto.id!, targetCategoria);
      await recarregar();
      onFotoSalva();
      const catLabel = CATEGORIAS.find((c) => c.key === targetCategoria)?.label || targetCategoria;
      toast(`Foto movida para ${catLabel}`, 'success');
      return;
    }

    if (targetCategoria === activeFoto.categoria) {
      const fotosDaCategoria = fotos
        .filter((f) => f.categoria === targetCategoria)
        .sort((a, b) => a.timestamp - b.timestamp);
      const oldIndex = fotosDaCategoria.findIndex((f) => f.id === active.id);
      const newIndex = fotosDaCategoria.findIndex((f) => f.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(fotosDaCategoria, oldIndex, newIndex);
        haptic('light');
        await reordenarFotos(reordered.map((f) => f.id!));
        await recarregar();
      }
    }
  }

  return (
    <main className="min-h-[100dvh] bg-base">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={spring}
          className="flex items-center gap-3 mb-8"
        >
          <button
            onClick={onVoltar}
            aria-label="Voltar para lista de apartamentos"
            className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{bloco}</h1>
            <p className="text-xs text-content-tertiary font-mono mt-0.5">{apartamento}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-content-tertiary">
              <Clock size={14} weight="bold" />
              <span className="text-xs font-mono tabular-nums">{formatTimer(timer)}</span>
            </div>
            {fotos.some((f) => f.categoria === 'cyble_antes') && fotos.some((f) => f.categoria === 'cyble_depois') && (
              <button
                onClick={() => setShowCompare(true)}
                aria-label="Comparar antes e depois"
                className="tactile-press w-9 h-9 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
              >
                <ArrowsLeftRight size={16} weight="bold" aria-hidden="true" />
              </button>
            )}
            <button
              onClick={() => setKeepInCamera(!keepInCamera)}
              aria-label={keepInCamera ? 'Desativar modo multi-foto' : 'Ativar modo multi-foto'}
              className={`tactile-press w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${
                keepInCamera
                  ? 'bg-accent-dim border-accent text-accent'
                  : 'bg-base-raised border-base-border text-content-secondary hover:text-content hover:border-accent/30'
              }`}
            >
              <Repeat size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {CATEGORIAS.map((cat) => {
              const doCategoria = fotos
                .filter((f) => f.categoria === cat.key)
                .sort((a, b) => a.timestamp - b.timestamp);

              const isOver = overCategory === cat.key;

              return (
                <motion.div
                  key={cat.key}
                  variants={item}
                  className={`bg-base-raised border rounded-2xl p-5 transition-colors ${
                    isOver ? 'border-accent border-dashed shadow-[0_0_12px_rgba(99,102,241,0.15)]' : 'border-base-border'
                  }`}
                  data-cat-key={cat.key}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-content-tertiary">{cat.icon}</span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                      {cat.label}
                    </span>
                    {doCategoria.length > 0 && (
                      <span className="ml-auto text-[11px] font-mono text-content-tertiary bg-base-overlay px-2 py-0.5 rounded-md">
                        {doCategoria.length}
                      </span>
                    )}
                    {isOver && (
                      <span className="text-[10px] font-semibold text-accent animate-pulse">
                        Solte aqui
                      </span>
                    )}
                  </div>

                  <input
                    ref={(el) => { inputsRef.current[cat.key] = el; }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFile(cat.key, e.target.files?.[0] ?? null)}
                  />

                  <button
                    onClick={() => inputsRef.current[cat.key]?.click()}
                    aria-label={`Tirar foto ${cat.label}`}
                    className="tactile-press w-full flex items-center justify-center gap-2 bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all"
                  >
                    <Camera size={16} weight="bold" aria-hidden="true" />
                    {doCategoria.length > 0 && !cat.multi ? 'Tirar de novo' : 'Tirar foto'}
                  </button>

                  <AnimatePresence>
                    {doCategoria.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                      >
                        <SortableContext
                          items={doCategoria.map((f) => f.id!)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="flex flex-wrap gap-2">
                            {doCategoria.map((f) => {
                              const src = f.synced && f.uploadUrl ? f.uploadUrl : (f.blob.size > 0 ? URL.createObjectURL(f.blob) : '');
                              return (
                                <SortablePhoto
                                  key={f.id}
                                  foto={f}
                                  src={src}
                                  categoriaLabel={cat.label}
                                  isDragging={activeId === f.id}
                                  onDelete={handleDeletar}
                                  onShare={handleCompartilhar}
                                  onZoom={setFotoZoom}
                                  compartilhando={compartilhando}
                                />
                              );
                            })}
                          </div>
                        </SortableContext>
                        {doCategoria.map((f) => (
                          <div key={`note-${f.id}`} className="w-full">
                            <div className="flex items-center gap-1.5 mt-1">
                              <ChatText size={10} className="text-content-tertiary flex-shrink-0" />
                              <input
                                type="text"
                                defaultValue={f.nota || ''}
                                placeholder="Nota..."
                                onBlur={(e) => f.id && atualizarNota(f.id, e.target.value)}
                                className="w-full bg-transparent text-[10px] text-content-secondary placeholder:text-content-tertiary/40 border-b border-base-border focus:border-accent/50 outline-none py-0.5 transition-colors"
                              />
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {doCategoria.length === 0 && (
                    <div className="mt-3">
                      <EmptyStatePhotos />
                    </div>
                  )}
                </motion.div>
              );
            })}
            <DragOverlay>
              {activePhoto ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-accent shadow-lg opacity-90 rotate-3">
                  <img
                    src={activePhoto.synced && activePhoto.uploadUrl ? activePhoto.uploadUrl : (activePhoto.blob.size > 0 ? URL.createObjectURL(activePhoto.blob) : '')}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </motion.div>

        {fotosOnline.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="mt-4 bg-base-raised border border-base-border rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <CloudCheck size={16} weight="duotone" className="text-success" />
              <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                Fotos salvas online
              </span>
              <span className="ml-auto text-[11px] font-mono text-content-tertiary bg-base-overlay px-2 py-0.5 rounded-md">
                {fotosOnline.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {fotosOnline
                .sort((a, b) => a.foto_index - b.foto_index)
                .map((f, i) => (
                  <motion.a
                    key={i}
                    href={f.foto_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...spring, delay: i * 0.05 }}
                    className="block w-16 h-16 rounded-xl border border-base-border hover:border-accent/30 overflow-hidden transition-colors"
                  >
                    <img
                      src={f.foto_url}
                      alt={`Foto online ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </motion.a>
                ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.3 }}
          className="mt-6 flex gap-3"
        >
          {proximoApto && onProximoApto ? (
            <button
              onClick={onProximoApto}
              className="tactile-press flex-1 flex items-center justify-center gap-2 bg-accent text-base font-semibold text-sm rounded-xl px-6 py-3.5 hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
            >
              Próximo: {proximoApto}
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </button>
          ) : (
            <button
              onClick={onVoltar}
              className="tactile-press flex-1 bg-accent text-base font-semibold text-sm rounded-xl px-6 py-3.5 hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
            >
              Concluir e voltar pra lista
            </button>
          )}
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onVoltar}
          aria-label="Voltar para lista de apartamentos"
          className="fixed bottom-20 right-4 w-auto h-11 px-4 bg-base-raised border border-base-border rounded-full text-xs font-semibold text-content shadow-diffusion flex items-center gap-1.5 z-50 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <ArrowLeft size={14} weight="bold" aria-hidden="true" />
          Lista
        </motion.button>

        {/* Modal Comparar Antes/Depois */}
        <AnimatePresence>
          {showCompare && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-base/90 backdrop-blur-sm z-[60] flex items-center justify-center px-4"
              onClick={() => setShowCompare(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-base-raised border border-base-border rounded-2xl p-4 max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-content">Comparar Antes / Depois</span>
                  <button onClick={() => setShowCompare(false)} className="text-content-tertiary hover:text-content">
                    <span className="sr-only">Fechar</span>✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(['cyble_antes', 'cyble_depois'] as const).map((cat) => {
                    const foto = fotos.find((f) => f.categoria === cat);
                    const src = foto?.synced && foto?.uploadUrl ? foto.uploadUrl : (foto?.blob.size ? URL.createObjectURL(foto.blob) : '');
                    return (
                      <div key={cat} className="text-center">
                        <span className="text-[10px] font-semibold uppercase text-content-tertiary mb-2 block">
                          {cat === 'cyble_antes' ? 'Antes' : 'Depois'}
                        </span>
                        {src ? (
                          <img src={src} alt={cat} className="w-full aspect-square object-cover rounded-xl border border-base-border" />
                        ) : (
                          <div className="w-full aspect-square rounded-xl bg-base-overlay border border-base-border flex items-center justify-center">
                            <ImageIcon size={24} weight="light" className="text-content-tertiary" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {editingPhoto && (
          <PhotoEditor
            imagemBlob={editingPhoto.blob}
            onSalvar={handleEditorSalvar}
            onCancelar={() => setEditingPhoto(null)}
          />
        )}
      </AnimatePresence>

      {/* Lightbox de visualizacao da foto */}
      <AnimatePresence>
        {fotoZoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-base/95 backdrop-blur-md z-[80] flex items-center justify-center p-4"
            onClick={() => setFotoZoom(null)}
          >
            <button
              onClick={() => setFotoZoom(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-base-raised/80 border border-base-border flex items-center justify-center text-content-secondary hover:text-content z-10"
            >
              <X size={20} weight="bold" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={fotoZoom}
              alt="Foto ampliada"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-base-border"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
