'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  Trash,
  FileText,
  CloudCheck,
  CloudSlash,
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
  ArrowDown,
  Crosshair,
  Lightning,
  LightningSlash,
} from '@phosphor-icons/react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useDroppable,
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
import { salvarFoto, deletarFoto, fotosDoApartamento, comprimirImagem, comprimirImagemLocal, atualizarNota, moverFotoCategoria, reordenarFotos, FotoRecord, Categoria } from '@/lib/db';
import { useToast } from '@/components/Toast';
import { haptic } from '@/lib/haptic';
import { getSalvarEm } from '@/lib/settings';
import { playScanFeedback } from '@/lib/scanPro';
import { EmptyStatePhotos } from '@/components/EmptyState';
import PhotoEditor from '@/components/PhotoEditor';
import ConfirmDialog from '@/components/ConfirmDialog';
import { spring, stagger, item } from '@/lib/motion';
import { detectBlur } from '@/lib/blurDetect';
import { processarFotoCompleta, compararFotosSimilares } from '@/lib/imageProcessor';
import { TOUCH_SENSOR_DELAY, TOUCH_SENSOR_TOLERANCE, GPS_TIMEOUT_MS, GPS_MAX_AGE_MS } from '@/lib/constants';
import { formatarNomeFotoDownload } from '@/lib/utils';

function dispararDownloadBlob(blob: Blob, nomeArquivo: string) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch { /* silent */ }
}

const CATEGORIAS: { key: Categoria; label: string; icon: React.ReactNode; multi: boolean }[] = [
  { key: 'cyble_antes', label: 'Cyble — Antes', icon: <Camera size={16} weight="duotone" />, multi: false },
  { key: 'cyble_depois', label: 'Cyble — Depois', icon: <Camera size={16} weight="duotone" />, multi: true },
  { key: 'documento', label: 'Documento do apartamento', icon: <FileText size={16} weight="duotone" />, multi: true },
];

const WATERMARK_LABELS: Record<Categoria, string> = {
  cyble_antes: 'Cyble Antes',
  cyble_depois: 'Cyble Depois',
  documento: 'Documento',
};

function DroppableCategorySection({
  catKey,
  children,
  isOver,
}: {
  catKey: string;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `category-${catKey}`,
    data: { type: 'category', catKey },
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-base-raised border rounded-2xl p-5 transition-colors ${
        isOver ? 'border-accent border-dashed shadow-[0_0_12px_rgba(99,102,241,0.15)]' : 'border-base-border'
      }`}
    >
      {children}
    </div>
  );
}

function SortablePhoto({
  foto,
  src,
  categoriaLabel,
  isDragging,
  onDelete,
  onShare,
  onDownload,
  onZoom,
  compartilhando,
  confirmDeleteId,
  onConfirmDelete,
}: {
  foto: FotoRecord;
  src: string;
  categoriaLabel: string;
  isDragging: boolean;
  onDelete: (id: number) => void;
  onShare: (f: FotoRecord) => void;
  onDownload: (f: FotoRecord) => void;
  onZoom: (src: string) => void;
  compartilhando: number | null;
  confirmDeleteId: number | null;
  onConfirmDelete: (id: number | null) => void;
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
        onClick={() => {
          if (!foto.id) return;
          if (confirmDeleteId === foto.id) {
            onDelete(foto.id);
            onConfirmDelete(null);
          } else {
            haptic('medium');
            onConfirmDelete(foto.id);
            setTimeout(() => onConfirmDelete(null), 3000);
          }
        }}
        aria-label={confirmDeleteId === foto.id ? `Confirmar exclusão de ${categoriaLabel}` : `Excluir foto ${categoriaLabel}`}
        className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border-2 border-base-raised flex items-center justify-center text-white transition-all ${
          confirmDeleteId === foto.id
            ? 'bg-danger scale-125 opacity-100 animate-pulse'
            : 'bg-danger opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
        }`}
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
      <button
        onClick={(e) => { e.stopPropagation(); onDownload(foto); }}
        aria-label={`Baixar foto ${categoriaLabel}`}
        className="absolute -top-1.5 left-3 w-5 h-5 rounded-full bg-success border-2 border-base-raised flex items-center justify-center text-base opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      >
        <ArrowDown size={9} weight="bold" aria-hidden="true" />
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<{ blob: Blob; categoria: Categoria } | null>(null);
  const [keepInCamera, setKeepInCamera] = useState(false);
  const [fotoZoom, setFotoZoom] = useState<string | null>(null);
  const [blurWarning, setBlurWarning] = useState<{ message: string; file: File; categoria: Categoria } | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const processingRef = useRef(false);
  const { toast } = useToast();
  const deletedRef = useRef<Map<number, FotoRecord>>(new Map());
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overCategory, setOverCategory] = useState<Categoria | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showMiraGuia, setShowMiraGuia] = useState(false);
  const [liveCameraCat, setLiveCameraCat] = useState<Categoria | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [similarWarning, setSimilarWarning] = useState<{
    similarity: number;
    blob: Blob;
    categoria: Categoria;
  } | null>(null);

  const stopLiveCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setLiveCameraCat(null);
    setTorchActive(false);
    setHasTorch(false);
  }, []);

  useEffect(() => {
    return () => {
      stopLiveCamera();
    };
  }, [stopLiveCamera]);

  const startLiveCamera = async (cat: Categoria) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast('Câmera com retículo ao vivo não suportada neste dispositivo. Abrindo câmera padrão.', 'info');
      inputsRef.current[cat]?.click();
      return;
    }
    try {
      haptic('light');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setLiveCameraCat(cat);

      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
      if (capabilities && 'torch' in capabilities) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }
    } catch (err) {
      console.warn('Erro ao abrir câmera ao vivo:', err);
      toast('Permissão de câmera não concedida. Abrindo captura nativa.', 'warning');
      inputsRef.current[cat]?.click();
    }
  };

  useEffect(() => {
    if (liveCameraCat && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [liveCameraCat]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchActive;
      await (track as any).applyConstraints({
        advanced: [{ torch: next }],
      });
      setTorchActive(next);
      haptic('light');
    } catch (err) {
      console.warn('Erro ao alternar lanterna:', err);
      toast('Não foi possível acionar a lanterna do aparelho.', 'warning');
    }
  };

  const captureLiveFrame = async () => {
    if (!videoRef.current || !liveCameraCat) return;
    haptic('medium');
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const cat = liveCameraCat;
    stopLiveCamera();

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast('Falha ao capturar imagem da câmera.', 'error');
          return;
        }
        const file = new File([blob], `live_${cat}_${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleFile(cat, file);
      },
      'image/jpeg',
      0.92
    );
  };

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Revoke blob URLs when fotos change to prevent memory leaks
  useEffect(() => {
    const urls: string[] = [];
    for (const f of fotos) {
      if (!f.synced && f.blob.size > 0) {
        urls.push(URL.createObjectURL(f.blob));
      }
    }
    return () => { urls.forEach(URL.revokeObjectURL); };
  }, [fotos]);

  // Stable blob URL mapping - revokes old URLs when fotos change
  const fotoUrls = useMemo(() => {
    const map = new Map<number, string>();
    for (const f of fotos) {
      if (f.synced && f.uploadUrl) {
        map.set(f.id!, f.uploadUrl);
      } else if (f.blob.size > 0) {
        map.set(f.id!, URL.createObjectURL(f.blob));
      }
    }
    return map;
  }, [fotos]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      fotoUrls.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [fotoUrls]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: TOUCH_SENSOR_DELAY, tolerance: TOUCH_SENSOR_TOLERANCE } })
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
      const nomeArquivo = formatarNomeFotoDownload(bloco, apartamento, f.categoria);
      const file = new File([blob], nomeArquivo, { type: 'image/jpeg' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${bloco} - ${apartamento} - ${f.categoria}`, files: [file] });
      } else {
        dispararDownloadBlob(blob, nomeArquivo);
      }
    } catch { /* user cancelled */ }
    setCompartilhando(null);
  }

  // Baixar foto para o dispositivo
  async function handleDownload(f: FotoRecord) {
    if (!f.id) return;
    haptic('light');
    try {
      const blob = f.blob.size > 0 ? f.blob : await fetch(f.uploadUrl || '').then((r) => r.blob());
      const nomeArquivo = formatarNomeFotoDownload(bloco, apartamento, f.categoria);
      dispararDownloadBlob(blob, nomeArquivo);
    } catch { /* silent */ }
  }

  // GPS: obter geolocalização
  function getGPS(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: GPS_TIMEOUT_MS, maximumAge: GPS_MAX_AGE_MS }
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
    if (!file) {
      toast('Nenhuma foto recebida. Tente de novo.', 'warning');
      return;
    }
    // Guard against double-tap / double file input
    if (processingRef.current) return;
    processingRef.current = true;
    haptic('medium');
    setProcessingPhoto(true);

    // Timeout wrapper — if comprimirImagem hangs, show error after 25s
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Foto demorou demais para processar (timeout)')), 25000)
    );

    try {
      // Processamento em Web Worker (compressão + análise de nitidez simultâneas)
      const { blob: comprimido, blur: blurResult } = await Promise.race([
        processarFotoCompleta(file, comprimirImagemLocal),
        timeoutPromise,
      ]);

      if (blurResult.isBlurry || blurResult.isDark) {
        setBlurWarning({ message: blurResult.message || 'Foto com problema', file, categoria });
        processingRef.current = false;
        setProcessingPhoto(false);
        return;
      }

      // Verificação anti-erro de foto duplicada (Antes vs Depois)
      if (categoria === 'cyble_depois') {
        const fotoAntes = fotos.find((f) => f.categoria === 'cyble_antes');
        if (fotoAntes && fotoAntes.blob && fotoAntes.blob.size > 0) {
          try {
            const similaridade = await compararFotosSimilares(fotoAntes.blob, comprimido);
            if (similaridade >= 92) {
              haptic('heavy');
              setSimilarWarning({
                similarity: Math.round(similaridade),
                blob: comprimido,
                categoria,
              });
              processingRef.current = false;
              setProcessingPhoto(false);
              return;
            }
          } catch (simErr) {
            console.warn('Erro ao verificar similaridade:', simErr);
          }
        }
      }

      // TEMP: editor desabilitado — salvar direto
      await salvarDireto(comprimido, categoria);
    } catch (err) {
      console.warn('Erro ao processar foto:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('timeout')) {
        toast('Foto muito grande ou celular lento. Tente de novo.', 'error');
      } else {
        toast('Erro ao processar a foto. Verifique o tamanho e tente de novo.', 'error');
      }
      haptic('error');
    } finally {
      processingRef.current = false;
      setProcessingPhoto(false);
      // Reset input value so the same file can be re-selected
      const input = inputsRef.current[categoria];
      if (input) input.value = '';
    }
  }

  async function handleBlurOverride() {
    if (!blurWarning) return;
    const { file, categoria } = blurWarning;
    setBlurWarning(null);
    setProcessingPhoto(true);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Foto demorou demais para processar (timeout)')), 25000)
    );
    try {
      const comprimido = await Promise.race([
        comprimirImagem(file),
        timeoutPromise,
      ]);

      if (categoria === 'cyble_depois') {
        const fotoAntes = fotos.find((f) => f.categoria === 'cyble_antes');
        if (fotoAntes && fotoAntes.blob && fotoAntes.blob.size > 0) {
          try {
            const similaridade = await compararFotosSimilares(fotoAntes.blob, comprimido);
            if (similaridade >= 92) {
              haptic('heavy');
              setSimilarWarning({
                similarity: Math.round(similaridade),
                blob: comprimido,
                categoria,
              });
              processingRef.current = false;
              setProcessingPhoto(false);
              return;
            }
          } catch (simErr) {
            console.warn('Erro ao verificar similaridade:', simErr);
          }
        }
      }

      // TEMP: editor desabilitado — salvar direto
      await salvarDireto(comprimido, categoria);
    } catch (err) {
      console.warn('Erro ao processar foto (override):', err);
      toast('Foto com problema de processamento. Verifique o tamanho e tente de novo.', 'error');
      haptic('error');
      setProcessingPhoto(false);
      const input = inputsRef.current[categoria];
      if (input) input.value = '';
    }
  }

  // TEMP: salvar direto sem editor
  async function salvarDireto(blob: Blob, categoria: Categoria) {
    const cat = categoria;
    try {
      const { aplicarMarcaDagua } = await import('@/lib/db');
      const watermarkLabel = WATERMARK_LABELS[cat] || cat;
      const finalBlob = await aplicarMarcaDagua(blob, watermarkLabel, bloco, apartamento);
      const gpsPromise = getGPS();
      await salvarFoto({
        bloco, apartamento, categoria: cat, blob: finalBlob, timestamp: Date.now(), synced: false,
      });

      // Auto-download to device if setting is 'dispositivo' or 'ambos'
      const salvarEm = getSalvarEm();
      if (salvarEm === 'dispositivo' || salvarEm === 'ambos') {
        dispararDownloadBlob(finalBlob, formatarNomeFotoDownload(bloco, apartamento, cat));
      }

      const gps = await gpsPromise;
      if (gps) {
        try {
          const { atualizarGpsFoto } = await import('@/lib/db');
          await atualizarGpsFoto(bloco, apartamento, cat, gps);
        } catch { /* silent */ }
      }
      haptic('success');
      playScanFeedback('photo_captured');
      toast('Foto salva com sucesso!', 'success');
      await recarregar();
      onFotoSalva();
      const isMulti = CATEGORIAS.find((c) => c.key === cat)?.multi ?? false;
      if (keepInCamera && isMulti) {
        setTimeout(() => { inputsRef.current[cat]?.click(); }, 300);
      }
    } catch (err) {
      console.warn('Erro ao salvar foto:', err);
      toast('Foto nao foi salva. Verifique o armazenamento do celular e tente de novo.', 'error');
      haptic('error');
    } finally {
      processingRef.current = false;
      setProcessingPhoto(false);
      const input = inputsRef.current[cat];
      if (input) input.value = '';
    }
  }

  async function handleEditorSalvar(blob: Blob) {
    if (!editingPhoto) return;
    const cat = editingPhoto.categoria;
    try {
      // Apply watermark to final output
      const { aplicarMarcaDagua } = await import('@/lib/db');
      const watermarkLabel = WATERMARK_LABELS[cat] || cat;
      const finalBlob = await aplicarMarcaDagua(blob, watermarkLabel, bloco, apartamento);
      // Start GPS in parallel — don't block save
      const gpsPromise = getGPS();
      await salvarFoto({
        bloco, apartamento, categoria: cat, blob: finalBlob, timestamp: Date.now(), synced: false,
      });
      // Update with GPS when available (non-blocking)
      const gps = await gpsPromise;
      if (gps) {
        try {
          const { atualizarGpsFoto } = await import('@/lib/db');
          await atualizarGpsFoto(bloco, apartamento, cat, gps);
        } catch { /* silent — GPS is nice-to-have */ }
      }

      // Auto-download to device if setting is 'dispositivo' or 'ambos'
      const salvarEm = getSalvarEm();
      if (salvarEm === 'dispositivo' || salvarEm === 'ambos') {
        dispararDownloadBlob(finalBlob, formatarNomeFotoDownload(bloco, apartamento, cat));
      }

      haptic('success');
      playScanFeedback('photo_captured');
      toast('Foto salva com sucesso!', 'success');
      setEditingPhoto(null);
      await recarregar();
      onFotoSalva();
      const isMulti = CATEGORIAS.find((c) => c.key === cat)?.multi ?? false;
      if (keepInCamera && isMulti) {
        setTimeout(() => { inputsRef.current[cat]?.click(); }, 300);
      }
    } catch (err) {
      console.warn('Erro ao salvar foto:', err);
      toast('Foto nao foi salva. Verifique o armazenamento do celular e tente de novo.', 'error');
      haptic('error');
      setEditingPhoto(null);
    }
  }

  async function handleDeletar(id: number) {
    const foto = fotos.find((f) => f.id === id);
    if (!foto) return;
    haptic('heavy');
    deletedRef.current.set(id, foto);
    try {
      await deletarFoto(id);
      await recarregar();
      onFotoSalva();
    } catch (err) {
      console.warn('Erro ao deletar foto:', err);
      toast('Erro ao excluir foto', 'error');
      deletedRef.current.delete(id);
      return;
    }
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
            className="tactile-press w-11 h-11 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{bloco}</h1>
            <p className="text-xs text-content-tertiary font-mono mt-0.5">{apartamento}</p>
          </div>
          {!isOnline && (
            <div className="ml-2 flex items-center gap-1 px-2 py-1 rounded-full bg-warn-dim border border-warn/30 text-warn text-[10px] font-medium">
              <CloudSlash size={10} weight="bold" />
              Offline
            </div>
          )}
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-content-tertiary">
              <Clock size={14} weight="bold" />
              <span className="text-xs font-mono tabular-nums">{formatTimer(timer)}</span>
            </div>
            {fotos.some((f) => f.categoria === 'cyble_antes') && fotos.some((f) => f.categoria === 'cyble_depois') && (
              <button
                onClick={() => setShowCompare(true)}
                aria-label="Comparar antes e depois"
                className="tactile-press w-11 h-11 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
              >
                <ArrowsLeftRight size={16} weight="bold" aria-hidden="true" />
              </button>
            )}
            <button
              onClick={() => {
                haptic('light');
                setShowMiraGuia(!showMiraGuia);
              }}
              aria-label={showMiraGuia ? 'Ocultar mira guia do hidrômetro' : 'Exibir mira guia do hidrômetro'}
              title="Guia de Enquadramento do Hidrômetro"
              className={`tactile-press w-11 h-11 rounded-xl border flex items-center justify-center transition-colors ${
                showMiraGuia
                  ? 'bg-accent-dim border-accent text-accent'
                  : 'bg-base-raised border-base-border text-content-secondary hover:text-content hover:border-accent/30'
              }`}
            >
              <Crosshair size={18} weight={showMiraGuia ? 'fill' : 'bold'} aria-hidden="true" />
            </button>
            <button
              onClick={() => setKeepInCamera(!keepInCamera)}
              aria-label={keepInCamera ? 'Desativar modo multi-foto' : 'Ativar modo multi-foto'}
              className={`tactile-press w-11 h-11 rounded-xl border flex items-center justify-center transition-colors ${
                keepInCamera
                  ? 'bg-accent-dim border-accent text-accent'
                  : 'bg-base-raised border-base-border text-content-secondary hover:text-content hover:border-accent/30'
              }`}
            >
              <Repeat size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </motion.div>

        {/* Guia Visual de Enquadramento do Hidrômetro */}
        <AnimatePresence>
          {showMiraGuia && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring}
              className="glass-card rounded-2xl p-4 border border-accent/30 bg-accent-dim/10 relative overflow-hidden mb-6"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Crosshair size={18} weight="bold" className="text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-content">
                    Guia de Enquadramento — Hidrômetro & Cyble
                  </span>
                </div>
                <button
                  onClick={() => setShowMiraGuia(false)}
                  className="text-content-tertiary hover:text-content text-xs p-1"
                  aria-label="Fechar guia"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>

              {/* Retículo esquemático */}
              <div className="relative w-full h-44 rounded-xl bg-black/40 border border-white/[0.08] flex flex-col items-center justify-center p-3 mb-3 overflow-hidden select-none">
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-accent/60" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-accent/60" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-accent/60" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-accent/60" />

                <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-accent/70 flex items-center justify-center bg-accent/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                  <span className="absolute -top-3 px-1.5 py-0.5 rounded bg-base-raised text-[8px] font-mono font-semibold text-accent border border-accent/30 uppercase">
                    Mostrador / Relojaria
                  </span>
                </div>

                <div className="relative -mt-2 w-28 h-10 rounded-lg border-2 border-dashed border-amber-400/70 flex items-center justify-center bg-amber-400/5">
                  <span className="absolute -bottom-2.5 px-1.5 py-0.5 rounded bg-base-raised text-[8px] font-mono font-semibold text-amber-400 border border-amber-400/30 uppercase">
                    Sensor Cyble
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-content-secondary">
                <div className="flex items-center gap-1.5 bg-base-raised/60 px-2.5 py-1.5 rounded-lg border border-white/[0.05]">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  <span>Ângulo reto perpendicular (90°)</span>
                </div>
                <div className="flex items-center gap-1.5 bg-base-raised/60 px-2.5 py-1.5 rounded-lg border border-white/[0.05]">
                  <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
                  <span>Distância ideal: ~20 a 30 cm</span>
                </div>
                <div className="flex items-center gap-1.5 bg-base-raised/60 px-2.5 py-1.5 rounded-lg border border-white/[0.05]">
                  <span className="w-1.5 h-1.5 rounded-full bg-warn flex-shrink-0" />
                  <span>Evite reflexos diretos no vidro</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                >
                  <DroppableCategorySection catKey={cat.key} isOver={isOver}>
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => inputsRef.current[cat.key]?.click()}
                      disabled={processingPhoto}
                      aria-label={`Tirar foto ${cat.label}`}
                      className={`tactile-press flex-1 flex items-center justify-center gap-2 bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all ${processingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Camera size={16} weight="bold" aria-hidden="true" />
                      {processingPhoto ? 'Processando...' : (doCategoria.length > 0 && !cat.multi ? 'Tirar de novo' : 'Tirar foto')}
                    </button>
                    <button
                      onClick={() => startLiveCamera(cat.key)}
                      disabled={processingPhoto}
                      aria-label={`Abrir câmera com mira para ${cat.label}`}
                      title="Câmera ao vivo com retículo guia e lanterna"
                      className="tactile-press w-12 h-12 flex-shrink-0 flex items-center justify-center bg-base-overlay border border-base-border rounded-xl text-content-secondary hover:text-accent hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
                    >
                      <Crosshair size={18} weight="bold" aria-hidden="true" />
                    </button>
                  </div>

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
                              const src = fotoUrls.get(f.id!) || '';
                              return (
                                <SortablePhoto
                                  key={f.id}
                                  foto={f}
                                  src={src}
                                  categoriaLabel={cat.label}
                                  isDragging={activeId === f.id}
                                  onDelete={handleDeletar}
                                  onShare={handleCompartilhar}
                                  onDownload={handleDownload}
                                  onZoom={setFotoZoom}
                                  compartilhando={compartilhando}
                                  confirmDeleteId={confirmDeleteId}
                                  onConfirmDelete={setConfirmDeleteId}
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
                  </DroppableCategorySection>
                </motion.div>
              );
            })}
            <DragOverlay>
              {activePhoto ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-accent shadow-lg opacity-90 rotate-3">
                  <img
                    src={fotoUrls.get(activePhoto.id!) || ''}
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
                    const src = foto ? (fotoUrls.get(foto.id!) || '') : '';
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

      {/* TEMP: editor desabilitado para teste
      <AnimatePresence>
        {editingPhoto && (
          <PhotoEditor
            imagemBlob={editingPhoto.blob}
            onSalvar={handleEditorSalvar}
            onCancelar={() => setEditingPhoto(null)}
          />
        )}
      </AnimatePresence>
      */}

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

      {/* Blur/dark warning modal */}
      <AnimatePresence>
        {blurWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setBlurWarning(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={spring}
              className="glass rounded-2xl p-5 w-full max-w-sm space-y-4 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-warn/20 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-content">Foto com problema</h3>
              <p className="text-sm text-content-secondary">{blurWarning.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setBlurWarning(null)}
                  className="flex-1 py-2.5 rounded-xl bg-base-surface border border-base-border text-content-secondary font-semibold text-sm hover:bg-base-tertiary transition-colors"
                >
                  Reaparar
                </button>
                <button
                  onClick={handleBlurOverride}
                  className="flex-1 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Manter assim
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing overlay */}
      <AnimatePresence>
        {processingPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
              <p className="text-white text-sm font-medium">Processando foto...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Câmera com Retículo ao Vivo */}
      <AnimatePresence>
        {liveCameraCat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-between select-none overflow-hidden"
          >
            {/* Barra superior de controles */}
            <div className="w-full z-10 p-4 pt-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
              <button
                onClick={stopLiveCamera}
                className="w-10 h-10 rounded-full bg-black/50 border border-white/20 text-white flex items-center justify-center tactile-press"
                aria-label="Fechar câmera"
              >
                <X size={20} weight="bold" />
              </button>

              <div className="text-center">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-white/90 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                  {CATEGORIAS.find((c) => c.key === liveCameraCat)?.label}
                </span>
                <p className="text-[11px] text-white/60 font-mono mt-1">{bloco} — {apartamento}</p>
              </div>

              <div className="flex items-center gap-2">
                {hasTorch && (
                  <button
                    onClick={toggleTorch}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center tactile-press transition-colors ${
                      torchActive ? 'bg-warn text-black border-warn' : 'bg-black/50 border-white/20 text-white'
                    }`}
                    aria-label={torchActive ? 'Desligar lanterna' : 'Ligar lanterna'}
                    title={torchActive ? 'Desligar lanterna' : 'Ligar lanterna'}
                  >
                    {torchActive ? <Lightning size={20} weight="fill" /> : <LightningSlash size={20} weight="bold" />}
                  </button>
                )}
              </div>
            </div>

            {/* Área do vídeo com retículo central */}
            <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Retículo do Hidrômetro & Cyble sobreposto ao vídeo */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* 4 cantoneiras guias */}
                <div className="relative w-72 h-80 sm:w-80 sm:h-96 flex flex-col items-center justify-center">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-accent" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-accent" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-accent" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-accent" />

                  {/* Linhas de mira cruzada */}
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-accent/20" />
                  <div className="absolute inset-y-0 left-1/2 w-[1px] bg-accent/20" />

                  {/* Mostrador do Hidrômetro (Círculo) */}
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full border-2 border-dashed border-accent flex flex-col items-center justify-center bg-accent/5 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                    <span className="absolute top-2 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono font-semibold text-accent border border-accent/40 uppercase tracking-wider">
                      Mostrador / Relojaria
                    </span>
                    <div className="w-2 h-2 rounded-full bg-accent" />
                  </div>

                  {/* Slot do Módulo Cyble (Retângulo inferior) */}
                  <div className="relative -mt-6 w-44 h-16 sm:w-52 sm:h-20 rounded-xl border-2 border-dashed border-amber-400 flex items-center justify-center bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                    <span className="absolute bottom-1 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono font-semibold text-amber-300 border border-amber-400/40 uppercase tracking-wider">
                      Encaixe Módulo Cyble
                    </span>
                  </div>

                  <p className="absolute -bottom-8 text-[11px] font-medium text-white/90 bg-black/70 px-3 py-1 rounded-full border border-white/15 tracking-wide text-center whitespace-nowrap">
                    Alinhe mostrador e presilha do Cyble
                  </p>
                </div>
              </div>
            </div>

            {/* Barra inferior de disparo */}
            <div className="w-full z-10 p-6 pb-8 flex items-center justify-center bg-gradient-to-t from-black/90 to-transparent">
              <button
                onClick={captureLiveFrame}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center tactile-press active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                aria-label="Capturar foto com retículo"
              >
                <div className="w-16 h-16 rounded-full bg-white transition-transform" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerta Anti-Erro de Foto Duplicada (Antes vs Depois) */}
      <ConfirmDialog
        open={!!similarWarning}
        title="Foto Potencialmente Idêntica"
        message={`A foto capturada para "Depois" apresenta ${similarWarning?.similarity}% de similaridade visual com a foto de "Antes".\n\nO hidrômetro/módulo Cyble já foi realmente substituído neste apartamento?`}
        confirmLabel="Salvar mesmo assim"
        cancelLabel="Refazer foto"
        variant="warning"
        onConfirm={async () => {
          if (!similarWarning) return;
          const { blob, categoria } = similarWarning;
          setSimilarWarning(null);
          await salvarDireto(blob, categoria);
        }}
        onCancel={() => {
          if (!similarWarning) return;
          const cat = similarWarning.categoria;
          const input = inputsRef.current[cat];
          if (input) input.value = '';
          setSimilarWarning(null);
        }}
      />
    </main>
  );
}
