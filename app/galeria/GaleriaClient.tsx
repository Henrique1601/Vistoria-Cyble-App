'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MagnifyingGlass,
  Calendar,
  Buildings,
  HouseLine,
  Image as ImageIcon,
  X,
  ArrowsOut,
  CaretLeft,
  CaretRight,
  Trash,
  PencilSimple,
  Check,
  Warning,
  CheckCircle,
  Circle,
  ListChecks,
} from '@phosphor-icons/react';
import Link from 'next/link';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: spring },
};

interface Foto {
  id: number;
  bloco: string;
  apartamento: string;
  data_leitura: string;
  foto_url: string;
  foto_index: number;
}

export default function GaleriaClient({ userRole = 'viewer' }: { userRole?: string }) {
  const isAdmin = userRole === 'admin';
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroBloco, setFiltroBloco] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [busca, setBusca] = useState('');
  const [fotoSelecionada, setFotoSelecionada] = useState<Foto | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fotoToDelete, setFotoToDelete] = useState<Foto | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [fotoToEdit, setFotoToEdit] = useState<Foto | null>(null);
  const [editBloco, setEditBloco] = useState('');
  const [editApartamento, setEditApartamento] = useState('');
  const [editing, setEditing] = useState(false);
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/fotos')
      .then((r) => r.json())
      .then((data) => {
        setFotos(data.fotos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const blocos = useMemo(() => [...new Set(fotos.map((f) => f.bloco))].sort(), [fotos]);
  const datas = useMemo(() => [...new Set(fotos.map((f) => f.data_leitura))].sort().reverse(), [fotos]);

  const filtradas = useMemo(() => fotos.filter((f) => {
    if (filtroBloco && f.bloco !== filtroBloco) return false;
    if (filtroData && f.data_leitura !== filtroData) return false;
    if (busca && !f.apartamento.toLowerCase().includes(busca.replace(/^0+/, '').toLowerCase())) return false;
    return true;
  }), [fotos, filtroBloco, filtroData, busca]);

  const grupos = useMemo(() => {
    const agrupadas = filtradas.reduce((acc, f) => {
      const key = `${f.data_leitura}__${f.bloco}__${f.apartamento}`;
      if (!acc[key]) acc[key] = { data: f.data_leitura, bloco: f.bloco, apartamento: f.apartamento, fotos: [] };
      acc[key].fotos.push(f);
      return acc;
    }, {} as Record<string, { data: string; bloco: string; apartamento: string; fotos: Foto[] }>);
    return Object.values(agrupadas).sort((a, b) => b.data.localeCompare(a.data));
  }, [filtradas]);

  const abrirLightbox = useCallback((f: Foto) => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setFotoSelecionada(f);
  }, []);

  const fecharLightbox = useCallback(() => {
    setFotoSelecionada(null);
    previousFocusRef.current?.focus();
  }, []);

  // Navegação no lightbox
  const fotoIndex = useMemo(() => {
    if (!fotoSelecionada) return -1;
    return grupos.findIndex((g) => g.fotos.some((f) => f.id === fotoSelecionada.id));
  }, [fotoSelecionada, grupos]);

  const todasFotos = useMemo(() => {
    return grupos.flatMap((g) => g.fotos);
  }, [grupos]);

  const navegarLightbox = useCallback((direcao: 'anterior' | 'proximo') => {
    if (!fotoSelecionada) return;
    const idx = todasFotos.findIndex((f) => f.id === fotoSelecionada.id);
    if (idx === -1) return;
    if (direcao === 'proximo' && idx < todasFotos.length - 1) {
      setFotoSelecionada(todasFotos[idx + 1]);
    } else if (direcao === 'anterior' && idx > 0) {
      setFotoSelecionada(todasFotos[idx - 1]);
    }
  }, [fotoSelecionada, todasFotos]);

  const handleDeleteClick = useCallback((f: Foto) => {
    setFotoToDelete(f);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!fotoToDelete) return;
    setDeleting(true);
    try {
      const resp = await fetch('/api/fotos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fotoToDelete.id }),
      });
      if (resp.ok) {
        setFotos((prev) => prev.filter((f) => f.id !== fotoToDelete.id));
        setShowDeleteModal(false);
        setFotoToDelete(null);
        if (fotoSelecionada?.id === fotoToDelete.id) {
          setFotoSelecionada(null);
        }
      }
    } catch (err) {
      console.error('Erro ao deletar foto:', err);
    } finally {
      setDeleting(false);
    }
  }, [fotoToDelete, fotoSelecionada]);

  const handleEditClick = useCallback((f: Foto) => {
    setFotoToEdit(f);
    setEditBloco(f.bloco);
    setEditApartamento(f.apartamento);
    setShowEditModal(true);
  }, []);

  const handleEditConfirm = useCallback(async () => {
    if (!fotoToEdit) return;
    setEditing(true);
    try {
      const resp = await fetch('/api/fotos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: fotoToEdit.id, 
          bloco: editBloco, 
          apartamento: editApartamento 
        }),
      });
      if (resp.ok) {
        setFotos((prev) => prev.map((f) => 
          f.id === fotoToEdit.id 
            ? { ...f, bloco: editBloco, apartamento: editApartamento }
            : f
        ));
        setShowEditModal(false);
        setFotoToEdit(null);
        if (fotoSelecionada?.id === fotoToEdit.id) {
          setFotoSelecionada((prev) => prev ? { ...prev, bloco: editBloco, apartamento: editApartamento } : null);
        }
      }
    } catch (err) {
      console.error('Erro ao editar foto:', err);
    } finally {
      setEditing(false);
    }
  }, [fotoToEdit, editBloco, editApartamento, fotoSelecionada]);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  const toggleSelectFoto = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = filtradas.map((f) => f.id);
    setSelectedIds(new Set(allIds));
  }, [filtradas]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedIds.size === 0) return;
    setShowBulkDeleteModal(true);
  }, [selectedIds]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const resp = await fetch('/api/fotos/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (resp.ok) {
        setFotos((prev) => prev.filter((f) => !selectedIds.has(f.id)));
        setSelectedIds(new Set());
        setShowBulkDeleteModal(false);
        setSelectionMode(false);
      }
    } catch (err) {
      console.error('Erro ao excluir fotos:', err);
    } finally {
      setBulkDeleting(false);
    }
  }, [selectedIds]);

  // Swipe gesture support
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) navegarLightbox('proximo');
      else navegarLightbox('anterior');
    }
  }, [navegarLightbox]);

  useEffect(() => {
    if (!fotoSelecionada) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fecharLightbox();
      if (e.key === 'ArrowRight') navegarLightbox('proximo');
      if (e.key === 'ArrowLeft') navegarLightbox('anterior');
    };
    document.addEventListener('keydown', handleKey);
    lightboxRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [fotoSelecionada, fecharLightbox, navegarLightbox]);

  return (
    <main className="min-h-[100dvh] bg-base">
      <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={spring}
          className="flex items-center gap-3 mb-6"
        >
          <Link
            href="/"
            aria-label="Voltar para pagina inicial"
            className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Galeria de Leituras</h1>
            <p className="text-xs text-content-tertiary mt-0.5">
              {fotos.length} foto{fotos.length !== 1 ? 's' : ''} no sistema
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"
        >
          <div className="relative">
            <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
            <input
              type="text"
              placeholder="Buscar apto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-base-raised border border-base-border rounded-xl pl-10 pr-4 py-3 text-sm text-content placeholder:text-content-tertiary focus:outline-none focus:border-accent/50 focus:shadow-glow-accent transition-all"
            />
          </div>
          <div className="relative">
            <Buildings size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
            <select
              value={filtroBloco}
              onChange={(e) => setFiltroBloco(e.target.value)}
              className="w-full bg-base-raised border border-base-border rounded-xl pl-10 pr-4 py-3 text-sm text-content appearance-none focus:outline-none focus:border-accent/50 focus:shadow-glow-accent transition-all"
            >
              <option value="">Todos os blocos</option>
              {blocos.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Calendar size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
            <select
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="w-full bg-base-raised border border-base-border rounded-xl pl-10 pr-4 py-3 text-sm text-content appearance-none focus:outline-none focus:border-accent/50 focus:shadow-glow-accent transition-all"
            >
              <option value="">Todas as datas</option>
              {datas.map((d) => (
                <option key={d} value={d}>{new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Selection Toolbar - Only for admin */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-4"
          >
            <button
              onClick={toggleSelectionMode}
              className={`tactile-press flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                selectionMode
                  ? 'bg-accent-dim border-accent text-accent'
                  : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
              }`}
            >
              <ListChecks size={16} weight="bold" />
              {selectionMode ? 'Cancelar seleção' : 'Selecionar'}
            </button>
            
            {selectionMode && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <span className="text-xs text-content-tertiary font-mono">
                  {selectedIds.size} selecionada{selectedIds.size !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={selectAll}
                  className="tactile-press px-3 py-1.5 rounded-lg text-xs font-medium bg-base-overlay border border-base-border text-content-secondary hover:text-content transition-colors"
                >
                  Todas
                </button>
                <button
                  onClick={deselectAll}
                  disabled={selectedIds.size === 0}
                  className="tactile-press px-3 py-1.5 rounded-lg text-xs font-medium bg-base-overlay border border-base-border text-content-secondary hover:text-content transition-colors disabled:opacity-30"
                >
                  Nenhuma
                </button>
                <button
                  onClick={handleBulkDeleteClick}
                  disabled={selectedIds.size === 0}
                  className="tactile-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-danger text-base hover:bg-danger/90 transition-colors disabled:opacity-30"
                >
                  <Trash size={12} weight="bold" />
                  Excluir
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-base-raised border border-base-border rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-base-overlay" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-base-overlay rounded w-1/2" />
                  <div className="h-2 bg-base-overlay rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : grupos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <ImageIcon size={40} weight="light" className="mx-auto text-content-tertiary mb-4" aria-hidden="true" />
            <p className="text-sm text-content-tertiary">
              {fotos.length === 0
                ? 'Nenhuma foto importada ainda. Execute o script de importacao.'
                : 'Nenhum resultado para os filtros selecionados.'}
            </p>
          </motion.div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            {grupos.map((grupo) => (
              <motion.div key={`${grupo.data}__${grupo.bloco}__${grupo.apartamento}`} variants={item}>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => {
                      localStorage.setItem('vistoria_navegar_para', JSON.stringify({ bloco: grupo.bloco, apto: grupo.apartamento }));
                      window.location.href = '/';
                    }}
                    className="text-xs font-semibold uppercase tracking-widest text-content-tertiary hover:text-accent transition-colors underline-offset-2 hover:underline"
                  >
                    {grupo.bloco} / {grupo.apartamento}
                  </button>
                  <span className="text-[11px] font-mono text-content-tertiary bg-base-overlay px-2 py-0.5 rounded-md">
                    {new Date(grupo.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  <span className="text-[11px] font-mono text-content-tertiary">
                    {grupo.fotos.length} foto{grupo.fotos.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {grupo.fotos.map((f) => {
                    const isSelected = selectedIds.has(f.id);
                    return (
                      <motion.div
                        key={f.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className={`relative aspect-[4/3] rounded-xl overflow-hidden transition-all group ${
                          isSelected
                            ? 'ring-2 ring-accent ring-offset-2 ring-offset-base border-accent'
                            : 'border border-base-border hover:border-accent/30'
                        }`}
                      >
                        {selectionMode && isAdmin ? (
                          <button
                            onClick={() => toggleSelectFoto(f.id)}
                            aria-label={isSelected ? `Desselecionar foto ${f.apartamento}` : `Selecionar foto ${f.apartamento}`}
                            className="tactile-press w-full h-full relative"
                          >
                            <img
                              src={f.foto_url}
                              alt={`Foto de ${f.bloco} apartamento ${f.apartamento}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              width={320}
                              height={240}
                            />
                            <div className={`absolute inset-0 transition-colors ${
                              isSelected ? 'bg-accent/20' : 'bg-base/10'
                            }`} />
                            <div className="absolute top-2 left-2 z-10">
                              {isSelected ? (
                                <CheckCircle size={24} weight="fill" className="text-accent drop-shadow-lg" />
                              ) : (
                                <Circle size={24} weight="regular" className="text-base/80 drop-shadow-lg" />
                              )}
                            </div>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => abrirLightbox(f)}
                              aria-label={`Ver foto ${f.bloco} ${f.apartamento} ampliada`}
                              className="tactile-press w-full h-full"
                            >
                              <img
                                src={f.foto_url}
                                alt={`Foto de ${f.bloco} apartamento ${f.apartamento}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                width={320}
                                height={240}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-base/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <ArrowsOut size={14} weight="bold" className="text-content" aria-hidden="true" />
                              </div>
                            </button>
                            
                            {isAdmin && (
                              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEditClick(f); }}
                                  className="w-6 h-6 rounded-full bg-accent/90 flex items-center justify-center text-base hover:bg-accent transition-colors"
                                  aria-label={`Editar foto ${f.apartamento}`}
                                >
                                  <PencilSimple size={12} weight="bold" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(f); }}
                                  className="w-6 h-6 rounded-full bg-danger/90 flex items-center justify-center text-base hover:bg-danger transition-colors"
                                  aria-label={`Excluir foto ${f.apartamento}`}
                                >
                                  <Trash size={12} weight="bold" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {fotoSelecionada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-base/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={fecharLightbox}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="dialog"
            aria-modal="true"
            aria-label="Foto ampliada"
            style={{ overscrollBehavior: 'contain' }}
          >
            <motion.div
              ref={lightboxRef}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={spring}
              className="relative max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
              tabIndex={-1}
            >
              {/* Botões de Editar e Excluir no Lightbox - Only for admin */}
              {isAdmin && (
                <div className="absolute top-2 left-2 flex gap-2 z-20">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditClick(fotoSelecionada); }}
                    className="w-10 h-10 rounded-full bg-accent/90 backdrop-blur-sm flex items-center justify-center text-base hover:bg-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                    aria-label="Editar foto"
                  >
                    <PencilSimple size={16} weight="bold" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(fotoSelecionada); }}
                    className="w-10 h-10 rounded-full bg-danger/90 backdrop-blur-sm flex items-center justify-center text-base hover:bg-danger focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                    aria-label="Excluir foto"
                  >
                    <Trash size={16} weight="bold" />
                  </button>
                </div>
              )}

              {/* Navegação */}
              {todasFotos.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); navegarLightbox('anterior'); }}
                    disabled={fotoIndex <= 0}
                    aria-label="Foto anterior"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-base-raised/80 border border-base-border flex items-center justify-center text-content-secondary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors disabled:opacity-30 disabled:pointer-events-none backdrop-blur-sm z-10"
                  >
                    <CaretLeft size={18} weight="bold" aria-hidden="true" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navegarLightbox('proximo'); }}
                    disabled={fotoIndex >= todasFotos.length - 1}
                    aria-label="Proxima foto"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-base-raised/80 border border-base-border flex items-center justify-center text-content-secondary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors disabled:opacity-30 disabled:pointer-events-none backdrop-blur-sm z-10"
                  >
                    <CaretRight size={18} weight="bold" aria-hidden="true" />
                  </button>
                  <div className="absolute bottom-14 left-0 right-0 text-center">
                    <span className="text-[11px] font-mono text-content-tertiary bg-base-raised/80 px-3 py-1 rounded-full backdrop-blur-sm">
                      {fotoIndex + 1} / {todasFotos.length}
                    </span>
                  </div>
                </>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={fotoSelecionada.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  className="relative"
                >
                  <img
                    src={fotoSelecionada.foto_url}
                    alt={`Foto de ${fotoSelecionada.bloco} apartamento ${fotoSelecionada.apartamento}`}
                    className="w-full rounded-2xl border border-base-border"
                    width={800}
                    height={600}
                  />
                  <button
                    onClick={fecharLightbox}
                    aria-label="Fechar foto ampliada"
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-base/80 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-danger/80 hover:border-danger/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors shadow-xl z-30"
                  >
                    <X size={20} weight="bold" aria-hidden="true" />
                  </button>
                </motion.div>
              </AnimatePresence>
              <div className="mt-3 flex items-center gap-3 text-sm text-content-tertiary">
                <span className="font-semibold text-content">{fotoSelecionada.bloco}</span>
                <span>{fotoSelecionada.apartamento}</span>
                <span className="font-mono text-xs">
                  {new Date(fotoSelecionada.data_leitura + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {showDeleteModal && fotoToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-base/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => { setShowDeleteModal(false); setFotoToDelete(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-base-raised border border-base-border rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
                  <Warning size={20} className="text-danger" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-content">Excluir foto</h3>
                  <p className="text-sm text-content-tertiary">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <p className="text-sm text-content-secondary mb-6">
                Tem certeza que deseja excluir a foto do apartamento <strong>{fotoToDelete.apartamento}</strong> do bloco <strong>{fotoToDelete.bloco}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setFotoToDelete(null); }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-base-overlay border border-base-border text-content-secondary hover:text-content transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-danger text-base hover:bg-danger/90 transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Edição */}
      <AnimatePresence>
        {showEditModal && fotoToEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-base/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => { setShowEditModal(false); setFotoToEdit(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-base-raised border border-base-border rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <PencilSimple size={20} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-content">Editar foto</h3>
                  <p className="text-sm text-content-tertiary">Altere o bloco ou apartamento</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-content-secondary mb-1.5">Bloco</label>
                  <input
                    type="text"
                    value={editBloco}
                    onChange={(e) => setEditBloco(e.target.value)}
                    className="w-full bg-base-overlay border border-base-border rounded-xl px-4 py-2.5 text-sm text-content focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content-secondary mb-1.5">Apartamento</label>
                  <input
                    type="text"
                    value={editApartamento}
                    onChange={(e) => setEditApartamento(e.target.value)}
                    className="w-full bg-base-overlay border border-base-border rounded-xl px-4 py-2.5 text-sm text-content focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowEditModal(false); setFotoToEdit(null); }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-base-overlay border border-base-border text-content-secondary hover:text-content transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditConfirm}
                  disabled={editing || !editBloco.trim() || !editApartamento.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-accent text-base hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {editing ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão em Lote */}
      <AnimatePresence>
        {showBulkDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-base/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowBulkDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-base-raised border border-base-border rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
                  <Warning size={20} className="text-danger" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-content">Excluir fotos selecionadas</h3>
                  <p className="text-sm text-content-tertiary">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <p className="text-sm text-content-secondary mb-6">
                Tem certeza que deseja excluir <strong>{selectedIds.size} foto{selectedIds.size !== 1 ? 's' : ''}</strong> selecionada{selectedIds.size !== 1 ? 's' : ''}?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-base-overlay border border-base-border text-content-secondary hover:text-content transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBulkDeleteConfirm}
                  disabled={bulkDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-danger text-base hover:bg-danger/90 transition-colors disabled:opacity-50"
                >
                  {bulkDeleting ? 'Excluindo...' : `Excluir ${selectedIds.size}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
