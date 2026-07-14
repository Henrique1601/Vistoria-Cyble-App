'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  Trash,
  FileText,
  CloudCheck,
  Hourglass,
  Image,
} from '@phosphor-icons/react';
import { salvarFoto, deletarFoto, fotosDoApartamento, comprimirImagem, FotoRecord, Categoria } from '@/lib/db';

const CATEGORIAS: { key: Categoria; label: string; icon: React.ReactNode; multi: boolean }[] = [
  { key: 'cyble_antes', label: 'Cyble — Antes', icon: <Camera size={16} weight="duotone" />, multi: false },
  { key: 'cyble_depois', label: 'Cyble — Depois', icon: <Camera size={16} weight="duotone" />, multi: true },
  { key: 'documento', label: 'Documento do apartamento', icon: <FileText size={16} weight="duotone" />, multi: true },
];

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring },
};

export default function CapturaScreen({
  bloco,
  apartamento,
  onVoltar,
  onFotoSalva,
}: {
  bloco: string;
  apartamento: string;
  onVoltar: () => void;
  onFotoSalva: () => void;
}) {
  const [fotos, setFotos] = useState<FotoRecord[]>([]);
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  async function recarregar() {
    const f = await fotosDoApartamento(bloco, apartamento);
    setFotos(f);
  }

  useEffect(() => {
    recarregar();
  }, [bloco, apartamento]);

  async function handleFile(categoria: Categoria, file: File | null) {
    if (!file) return;
    const comprimido = await comprimirImagem(file);
    await salvarFoto({ bloco, apartamento, categoria, blob: comprimido, timestamp: Date.now(), synced: false });
    await recarregar();
    onFotoSalva();
  }

  async function handleDeletar(id: number) {
    await deletarFoto(id);
    await recarregar();
    onFotoSalva();
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
            className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 transition-colors"
          >
            <ArrowLeft size={18} weight="bold" />
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{bloco}</h1>
            <p className="text-xs text-content-tertiary font-mono mt-0.5">{apartamento}</p>
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
                  className="tactile-press w-full flex items-center justify-center gap-2 bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all"
                >
                  <Camera size={16} weight="bold" />
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
                                <Image size={20} weight="light" className="text-content-tertiary" />
                              </div>
                            )}

                            <div className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full border-2 border-base-raised flex items-center justify-center text-[9px] ${
                              f.synced ? 'bg-success text-base' : 'bg-base-overlay text-content-tertiary border-base-border'
                            }`} title={f.synced ? 'Sincronizada' : 'Pendente'}>
                              {f.synced ? <CloudCheck size={10} weight="bold" /> : <Hourglass size={10} weight="bold" />}
                            </div>

                            <button
                              onClick={() => f.id && handleDeletar(f.id)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger border-2 border-base-raised flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Excluir foto"
                            >
                              <Trash size={10} weight="bold" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {doCategoria.length === 0 && (
                  <div className="mt-3 flex items-center justify-center gap-2 py-4 text-content-tertiary">
                    <Image size={20} weight="light" />
                    <span className="text-xs">Nenhuma foto ainda</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.3 }}
          className="mt-6"
        >
          <button
            onClick={onVoltar}
            className="tactile-press w-full bg-accent text-base font-semibold text-sm rounded-xl px-6 py-3.5 hover:bg-accent-hover transition-colors"
          >
            Concluir e voltar pra lista
          </button>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onVoltar}
          className="fixed bottom-20 right-4 w-auto h-11 px-4 bg-base-raised border border-base-border rounded-full text-xs font-semibold text-content shadow-diffusion flex items-center gap-1.5 z-50 backdrop-blur-sm"
          title="Voltar para lista"
        >
          <ArrowLeft size={14} weight="bold" />
          Lista
        </motion.button>
      </div>
    </main>
  );
}
