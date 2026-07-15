'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
 MagnifyingGlass,
  Calendar,
  Buildings,
  HouseLine,
  Image,
  X,
  ArrowsOut,
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

export default function GaleriaClient() {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroBloco, setFiltroBloco] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [busca, setBusca] = useState('');
  const [fotoSelecionada, setFotoSelecionada] = useState<Foto | null>(null);

  useEffect(() => {
    fetch('/api/fotos')
      .then((r) => r.json())
      .then((data) => {
        setFotos(data.fotos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const blocos = [...new Set(fotos.map((f) => f.bloco))].sort();
  const datas = [...new Set(fotos.map((f) => f.data_leitura))].sort().reverse();

  const filtradas = fotos.filter((f) => {
    if (filtroBloco && f.bloco !== filtroBloco) return false;
    if (filtroData && f.data_leitura !== filtroData) return false;
    if (busca && !f.apartamento.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const agrupadas = filtradas.reduce((acc, f) => {
    const key = `${f.data_leitura}__${f.bloco}__${f.apartamento}`;
    if (!acc[key]) acc[key] = { data: f.data_leitura, bloco: f.bloco, apartamento: f.apartamento, fotos: [] };
    acc[key].fotos.push(f);
    return acc;
  }, {} as Record<string, { data: string; bloco: string; apartamento: string; fotos: Foto[] }>);

  const grupos = Object.values(agrupadas).sort((a, b) => b.data.localeCompare(a.data));

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
            className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 transition-colors"
          >
            <ArrowLeft size={18} weight="bold" />
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
            <Image size={40} weight="light" className="mx-auto text-content-tertiary mb-4" />
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
                  <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                    {grupo.bloco} / {grupo.apartamento}
                  </span>
                  <span className="text-[11px] font-mono text-content-tertiary bg-base-overlay px-2 py-0.5 rounded-md">
                    {new Date(grupo.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  <span className="text-[11px] font-mono text-content-tertiary">
                    {grupo.fotos.length} foto{grupo.fotos.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {grupo.fotos.map((f) => (
                    <motion.button
                      key={f.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setFotoSelecionada(f)}
                      className="tactile-press relative aspect-[4/3] rounded-xl overflow-hidden border border-base-border hover:border-accent/30 transition-colors group"
                    >
                      <img
                        src={f.foto_url}
                        alt={`${f.bloco} ${f.apartamento}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-base/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <ArrowsOut size={14} weight="bold" className="text-content" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {fotoSelecionada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-base/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setFotoSelecionada(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={spring}
              className="relative max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setFotoSelecionada(null)}
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
              <img
                src={fotoSelecionada.foto_url}
                alt={`${fotoSelecionada.bloco} ${fotoSelecionada.apartamento}`}
                className="w-full rounded-2xl border border-base-border"
              />
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
    </main>
  );
}
