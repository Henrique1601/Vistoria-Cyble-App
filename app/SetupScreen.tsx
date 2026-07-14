'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Upload,
  FileText,
  Warning,
  CheckCircle,
  ListNumbers,
  Buildings,
} from '@phosphor-icons/react';
import { salvarListaApartamentos } from '@/lib/db';

type Mode = 'manual' | 'importar';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring },
};

export default function SetupScreen({ onDone }: { onDone: (lista: Record<string, string[]>) => void }) {
  const [mode, setMode] = useState<Mode>('manual');
  const [numBlocos, setNumBlocos] = useState(8);
  const [textos, setTextos] = useState<string[]>(Array(8).fill(''));
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function updateTexto(i: number, v: string) {
    const next = [...textos];
    next[i] = v;
    setTextos(next);
  }

  function parseImport(text: string): Record<string, string[]> | null {
    const trimmed = text.trim();

    if (trimmed.startsWith('{')) {
      try {
        const obj = JSON.parse(trimmed);
        if (typeof obj === 'object' && obj !== null) {
          const lista: Record<string, string[]> = {};
          for (const [key, val] of Object.entries(obj)) {
            if (Array.isArray(val)) {
              lista[key] = val.map(String).map(s => s.trim()).filter(Boolean);
            } else if (typeof val === 'string') {
              lista[key] = val.split('\n').map(s => s.trim()).filter(Boolean);
            }
          }
          if (Object.keys(lista).length > 0) return lista;
        }
      } catch {}
    }

    const blocos: Record<string, string[]> = {};
    let currentBloco = '';
    for (const line of trimmed.split('\n')) {
      const l = line.trim();
      if (!l) {
        currentBloco = '';
        continue;
      }
      if (!/^\d+$/.test(l)) {
        currentBloco = l;
        if (!blocos[currentBloco]) blocos[currentBloco] = [];
      } else if (currentBloco) {
        blocos[currentBloco].push(l);
      }
    }
    if (Object.keys(blocos).length > 0) return blocos;

    return null;
  }

  function handleImport() {
    setImportError('');
    const lista = parseImport(importText);
    if (!lista) {
      setImportError('Nao consegui interpretar. Use JSON ({\"Torre A\":[\"0031\",...]}) ou TXT (nome do bloco seguido de aptos).');
      return;
    }
    setListaImportada(lista);
  }

  const [listaImportada, setListaImportada] = useState<Record<string, string[]> | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      setImportText(text);
      setMode('importar');
      const lista = parseImport(text);
      if (lista) {
        setListaImportada(lista);
        setImportError('');
      } else {
        setImportError('Arquivo nao reconhecido. Use .json ou .txt.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function salvar() {
    let lista: Record<string, string[]>;
    if (mode === 'importar' && listaImportada) {
      lista = listaImportada;
    } else {
      lista = {};
      for (let i = 0; i < numBlocos; i++) {
        const blocoNome = `Bloco ${i + 1}`;
        const aptos = (textos[i] || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        lista[blocoNome] = aptos;
      }
    }
    await salvarListaApartamentos(lista);
    onDone(lista);
  }

  const totalManual = textos.slice(0, numBlocos).reduce((acc, t) => acc + t.split('\n').filter((s) => s.trim()).length, 0);
  const totalImport = listaImportada
    ? Object.values(listaImportada).reduce((acc, arr) => acc + arr.length, 0)
    : 0;
  const total = mode === 'importar' ? totalImport : totalManual;

  return (
    <main className="min-h-[100dvh] bg-base">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_0_4px_rgba(232,130,58,0.2)]" />
            <h1 className="text-2xl font-bold tracking-tight">Configuracao</h1>
          </div>
          <p className="text-sm text-content-tertiary ml-5">
            Cadastre os apartamentos de cada torre/bloco.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="flex gap-2 mb-6"
        >
          <button
            onClick={() => setMode('manual')}
            className={`tactile-press flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
              mode === 'manual'
                ? 'bg-accent-dim border-accent text-accent'
                : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
            }`}
          >
            <ListNumbers size={16} weight="bold" />
            Manual
          </button>
          <button
            onClick={() => setMode('importar')}
            className={`tactile-press flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
              mode === 'importar'
                ? 'bg-accent-dim border-accent text-accent'
                : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
            }`}
          >
            <Upload size={16} weight="bold" />
            Importar arquivo
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'manual' ? (
            <motion.div
              key="manual"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={spring}
            >
              <div className="bg-base-raised border border-base-border rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Buildings size={16} weight="duotone" className="text-content-tertiary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                    Quantidade de blocos/torres
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={numBlocos}
                  onChange={(e) => setNumBlocos(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="w-full bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-mono text-content focus:outline-none focus:border-accent/50 focus:shadow-glow-accent transition-all"
                />
              </div>

              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
                {Array.from({ length: numBlocos }, (_, i) => (
                  <motion.div key={i} variants={item} className="bg-base-raised border border-base-border rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                        Bloco {i + 1} — apartamentos (um por linha)
                      </span>
                    </div>
                    <textarea
                      value={textos[i] || ''}
                      onChange={(e) => updateTexto(i, e.target.value)}
                      placeholder={'101\n102\n103\n...'}
                      className="w-full bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-mono text-content placeholder:text-content-tertiary/50 focus:outline-none focus:border-accent/50 focus:shadow-glow-accent transition-all min-h-[100px] resize-y"
                    />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="importar"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={spring}
              className="space-y-4"
            >
              <div className="bg-base-raised border border-base-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={16} weight="duotone" className="text-content-tertiary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                    Importar de arquivo (.json ou .txt)
                  </span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFile}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="tactile-press w-full flex items-center justify-center gap-2 bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all"
                >
                  <Upload size={16} weight="bold" />
                  Escolher arquivo
                </button>
              </div>

              <div className="bg-base-raised border border-base-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                    Ou cole o conteudo aqui
                  </span>
                </div>
                <textarea
                  value={importText}
                  onChange={(e) => { setImportText(e.target.value); setListaImportada(null); setImportError(''); }}
                  placeholder={'Torre A\n0031\n0032\n0033\n\nTorre B\n0101\n0102'}
                  className="w-full bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-mono text-content placeholder:text-content-tertiary/50 focus:outline-none focus:border-accent/50 focus:shadow-glow-accent transition-all min-h-[140px] resize-y"
                />
                <button
                  onClick={handleImport}
                  disabled={!importText.trim()}
                  className="tactile-press w-full mt-3 flex items-center justify-center gap-2 bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  Interpretar lista
                </button>

                {importError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-danger-dim/30 border border-danger/20"
                  >
                    <Warning size={14} weight="bold" className="text-danger flex-shrink-0" />
                    <span className="text-xs text-danger">{importError}</span>
                  </motion.div>
                )}
              </div>

              {listaImportada && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-base-raised border border-success/20 rounded-2xl p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={16} weight="duotone" className="text-success" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-success">
                      Previa — {Object.keys(listaImportada).length} torres/blocos, {totalImport} apartamentos
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {Object.entries(listaImportada).map(([nome, aptos]) => (
                      <div key={nome} className="text-sm">
                        <span className="font-semibold text-content">{nome}</span>
                        <span className="text-content-tertiary ml-2">— {aptos.length} aptos</span>
                        <div className="text-[11px] font-mono text-content-tertiary mt-0.5">
                          {aptos.slice(0, 5).join(', ')}{aptos.length > 5 ? `... +${aptos.length - 5}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.3 }}
          className="mt-6"
        >
          <button
            onClick={salvar}
            disabled={total === 0}
            className="tactile-press w-full bg-accent text-base font-semibold text-sm rounded-xl px-6 py-3.5 hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            Salvar e comecar ({total} apartamentos)
          </button>
        </motion.div>
      </div>
    </main>
  );
}
