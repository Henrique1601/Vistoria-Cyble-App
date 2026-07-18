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
} from '@phosphor-icons/react';
import { salvarFoto, deletarFoto, fotosDoApartamento, comprimirImagem, atualizarNota, FotoRecord, Categoria } from '@/lib/db';
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
  const { toast } = useToast();
  const deletedRef = useRef<Map<number, FotoRecord>>(new Map());

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
    const comprimido = await comprimirImagem(file);
    setEditingPhoto({ blob: comprimido, categoria });
  }

  async function handleEditorSalvar(blob: Blob) {
    if (!editingPhoto) return;
    const [comprimido, gps] = await Promise.all([comprimirImagem(new File([blob], 'foto.jpg', { type: 'image/jpeg' })), getGPS()]);
    await salvarFoto({
      bloco, apartamento, categoria: editingPhoto.categoria, blob: comprimido, timestamp: Date.now(), synced: false,
      gps: gps || undefined,
    });
    haptic('success');
    playScanFeedback('photo_captured');
    setEditingPhoto(null);
    await recarregar();
    onFotoSalva();
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
          </div>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {CATEGORIAS.map((cat) => {
            const doCategoria = fotos
              .filter((f) => f.categoria === cat.key)
              .sort((a, b) => a.timestamp - b.timestamp);

            return (
              <motion.div
                key={cat.key}
                variants={item}
                className="bg-base-raised border border-base-border rounded-2xl p-5"
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
                      className="mt-3 flex flex-wrap gap-2"
                    >
                      {doCategoria.map((f) => {
                        const src = f.synced && f.uploadUrl ? f.uploadUrl : (f.blob.size > 0 ? URL.createObjectURL(f.blob) : '');
                        return (
                          <motion.div
                            key={f.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={spring}
                            className="relative group"
                          >
                            {src ? (
                              <img
                                src={src}
                                alt=""
                                className="w-16 h-16 rounded-xl object-cover border border-base-border group-hover:border-accent/30 transition-colors"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-base-overlay border border-base-border flex items-center justify-center">
                                <ImageIcon size={20} weight="light" className="text-content-tertiary" aria-hidden="true" />
                              </div>
                            )}

                            <div className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full border-2 border-base-raised flex items-center justify-center text-[9px] ${
                              f.synced ? 'bg-success text-base' : 'bg-base-overlay text-content-tertiary border-base-border'
                            }`} title={f.synced ? 'Sincronizada' : 'Pendente'}>
                              {f.synced ? <CloudCheck size={10} weight="bold" /> : <Hourglass size={10} weight="bold" />}
                            </div>

                             <button
                              onClick={() => f.id && handleDeletar(f.id)}
                              aria-label={`Excluir foto ${cat.label}`}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger border-2 border-base-raised flex items-center justify-center text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                            >
                              <Trash size={10} weight="bold" aria-hidden="true" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCompartilhar(f); }}
                              disabled={compartilhando === f.id}
                              aria-label={`Compartilhar foto ${cat.label}`}
                              className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-accent border-2 border-base-raised flex items-center justify-center text-base opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                            >
                              <ShareNetwork size={9} weight="bold" aria-hidden="true" />
                            </button>
                          </motion.div>
                        );
                      })}
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
    </main>
  );
}
