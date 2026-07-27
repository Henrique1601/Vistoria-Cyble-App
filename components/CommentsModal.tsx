'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PaperPlaneTilt, Trash } from '@phosphor-icons/react';
import { adicionarComentario, obterComentarios, excluirComentario, type ComentarioApto } from '@/lib/db';
import { spring } from '@/lib/motion';

interface CommentsModalProps {
  bloco: string;
  apartamento: string;
  isOpen: boolean;
  onClose: () => void;
  adminMode: boolean;
}

export default function CommentsModal({ bloco, apartamento, isOpen, onClose, adminMode }: CommentsModalProps) {
  const [comentarios, setComentarios] = useState<ComentarioApto[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bloco, apartamento]);

  async function carregar() {
    setLoading(true);
    const c = await obterComentarios(bloco, apartamento);
    setComentarios(c);
    setLoading(false);
  }

  async function handleEnviar() {
    if (!novoComentario.trim()) return;
    await adicionarComentario(bloco, apartamento, 'Usuário', novoComentario.trim());
    setNovoComentario('');
    await carregar();
  }

  async function handleExcluir(id: number) {
    await excluirComentario(id);
    await carregar();
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={spring}
            className="glass rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-base-border">
              <div>
                <h2 className="text-lg font-bold text-content">Comentários</h2>
                <p className="text-xs text-content-tertiary">{bloco} — Apt {apartamento}</p>
              </div>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-base-surface" aria-label="Fechar">
                <X size={20} className="text-content-tertiary" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[120px]">
              {loading ? (
                <div className="text-center text-content-tertiary text-sm py-8">Carregando...</div>
              ) : comentarios.length === 0 ? (
                <div className="text-center text-content-tertiary text-sm py-8">Nenhum comentário ainda</div>
              ) : (
                comentarios.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 rounded-xl bg-base-surface space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-accent">{c.autor}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-content-tertiary">{formatTime(c.criadoEm)}</span>
                        {adminMode && (
                          <button onClick={() => c.id && handleExcluir(c.id)} className="p-0.5 hover:text-danger transition-colors" aria-label="Excluir comentario">
                            <Trash size={12} className="text-content-tertiary" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-content leading-relaxed">{c.texto}</p>
                  </motion.div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-base-border flex gap-2">
              <input
                type="text"
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEnviar()}
                placeholder="Escreva um comentário..."
                className="flex-1 px-3 py-2 rounded-lg bg-base-surface border border-base-border text-content text-sm placeholder:text-content-tertiary"
              />
              <button
                onClick={handleEnviar}
                disabled={!novoComentario.trim()}
                className="p-2 rounded-lg bg-accent text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                aria-label="Enviar comentario"
              >
                <PaperPlaneTilt size={18} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
