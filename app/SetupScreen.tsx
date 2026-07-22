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
  Cloud,
  ArrowClockwise,
  Database,
} from '@phosphor-icons/react';
import { salvarListaApartamentos } from '@/lib/db';

type Mode = 'manual' | 'importar' | 'nuvem';

interface BuildingConfig {
  id: number;
  nome: string;
  config: Record<string, string[]>;
  updated_at: string;
}

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
          if (obj.blocos && typeof obj.blocos === 'object' && !Array.isArray(obj.blocos)) {
            return obj.blocos as Record<string, string[]>;
          }
          if (obj.lista && typeof obj.lista === 'object' && !Array.isArray(obj.lista)) {
            return obj.lista as Record<string, string[]>;
          }
          const lista: Record<string, string[]> = {};
          for (const [key, val] of Object.entries(obj)) {
            if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
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
  const [buildingConfigs, setBuildingConfigs] = useState<BuildingConfig[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingConfig | null>(null);

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

  async function handleLoadBuildings() {
    setLoadingBuildings(true);
    try {
      const res = await fetch('/api/building-config');
      const data = await res.json();
      setBuildingConfigs(data.buildings || []);
      setSelectedBuilding(null);
    } catch {
      setBuildingConfigs([]);
    }
    setLoadingBuildings(false);
  }

  function handleSelectBuilding(b: BuildingConfig) {
    setSelectedBuilding(b);
    setListaImportada(b.config);
  }

  async function salvar() {
    let lista: Record<string, string[]>;
    if ((mode === 'importar' || mode === 'nuvem') && listaImportada) {
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
  const total = (mode === 'importar' || mode === 'nuvem') ? totalImport : totalManual;

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
              <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_0_4px_rgba(232,130,58,0.2)]" aria-hidden="true" />
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
            aria-pressed={mode === 'manual'}
            className={`tactile-press flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
              mode === 'manual'
                ? 'bg-accent-dim border-accent text-accent'
                : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
            }`}
          >
            <ListNumbers size={16} weight="bold" aria-hidden="true" />
            Manual
          </button>
          <button
            onClick={() => setMode('importar')}
            aria-pressed={mode === 'importar'}
            className={`tactile-press flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
              mode === 'importar'
                ? 'bg-accent-dim border-accent text-accent'
                : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
            }`}
          >
            <Upload size={16} weight="bold" aria-hidden="true" />
            Importar
          </button>
          <button
            onClick={() => { setMode('nuvem'); if (buildingConfigs.length === 0) handleLoadBuildings(); }}
            aria-pressed={mode === 'nuvem'}
            className={`tactile-press flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
              mode === 'nuvem'
                ? 'bg-accent-dim border-accent text-accent'
                : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
            }`}
          >
            <Cloud size={16} weight="bold" aria-hidden="true" />
            Nuvem
          </button>
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
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
                  <Buildings size={16} weight="duotone" className="text-content-tertiary" aria-hidden="true" />
                  <label htmlFor="num-blocos" className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                    Quantidade de blocos/torres
                  </label>
                </div>
                <input
                  id="num-blocos"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  value={numBlocos}
                  onChange={(e) => setNumBlocos(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="w-full bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-mono text-content focus:outline-none focus:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none focus:shadow-glow-accent transition-all"
                />
              </div>

              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
                {Array.from({ length: numBlocos }, (_, i) => (
                  <motion.div key={i} variants={item} className="bg-base-raised border border-base-border rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <label htmlFor={`bloco-${i}`} className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                        Bloco {i + 1} — apartamentos (um por linha)
                      </label>
                    </div>
                    <textarea
                      id={`bloco-${i}`}
                      value={textos[i] || ''}
                      onChange={(e) => updateTexto(i, e.target.value)}
                      placeholder={'101\n102\n103\u2026'}
                      className="w-full bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-mono text-content placeholder:text-content-tertiary/50 focus:outline-none focus:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none focus:shadow-glow-accent transition-all min-h-[100px] resize-y"
                    />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          ) : mode === 'importar' ? (
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
                  <FileText size={16} weight="duotone" className="text-content-tertiary" aria-hidden="true" />
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
                  aria-label="Escolher arquivo JSON ou TXT para importar"
                  className="tactile-press w-full flex items-center justify-center gap-2 bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all"
                >
                  <Upload size={16} weight="bold" aria-hidden="true" />
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
                  id="import-text"
                  value={importText}
                  onChange={(e) => { setImportText(e.target.value); setListaImportada(null); setImportError(''); }}
                  placeholder={'Torre A\n0031\n0032\n0033\n\nTorre B\n0101\n0102'}
                  aria-label="Cole o conteudo do arquivo aqui"
                  className="w-full bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-mono text-content placeholder:text-content-tertiary/50 focus:outline-none focus:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none focus:shadow-glow-accent transition-all min-h-[140px] resize-y"
                />
                <button
                  onClick={handleImport}
                  disabled={!importText.trim()}
                  aria-label="Interpretar texto colado como lista de apartamentos"
                  className="tactile-press w-full mt-3 flex items-center justify-center gap-2 bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  Interpretar lista
                </button>

                {importError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-danger-dim/30 border border-danger/20"
                  >
                    <Warning size={14} weight="bold" className="text-danger flex-shrink-0" aria-hidden="true" />
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
                    <CheckCircle size={16} weight="duotone" className="text-success" aria-hidden="true" />
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
          ) : (
            <motion.div
              key="nuvem"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={spring}
              className="space-y-4"
            >
              <div className="bg-base-raised border border-base-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Database size={16} weight="duotone" className="text-content-tertiary" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                    Predios salvos na nuvem
                  </span>
                </div>
                {loadingBuildings ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-content-tertiary">
                    <ArrowClockwise size={16} weight="bold" className="animate-spin" />
                    <span className="text-sm">Carregando...</span>
                  </div>
                ) : buildingConfigs.length === 0 ? (
                  <div className="text-center py-8">
                    <Cloud size={32} weight="duotone" className="mx-auto mb-2 text-content-tertiary/50" />
                    <p className="text-sm text-content-tertiary">Nenhum predio salvo na nuvem</p>
                    <p className="text-xs text-content-tertiary mt-1">
                      Salve primeiro em Configuracoes &gt; Aparencia
                    </p>
                    <button
                      onClick={handleLoadBuildings}
                      className="tactile-press mt-4 flex items-center justify-center gap-2 bg-base-overlay border border-base-border rounded-xl px-4 py-2.5 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all mx-auto"
                    >
                      <ArrowClockwise size={14} weight="bold" aria-hidden="true" />
                      Tentar novamente
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {buildingConfigs.map((b) => {
                      const totalAptos = Object.values(b.config).reduce((acc, arr) => acc + arr.length, 0);
                      const numBlocos = Object.keys(b.config).length;
                      const isSelected = selectedBuilding?.id === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => handleSelectBuilding(b)}
                          className={`tactile-press w-full text-left p-4 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-accent-dim border-accent text-accent'
                              : 'bg-base-overlay border-base-border text-content hover:border-accent/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold">{b.nome}</span>
                            {isSelected && <CheckCircle size={16} weight="fill" className="text-accent" />}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-content-tertiary">
                            <span>{numBlocos} blocos</span>
                            <span>{totalAptos} apartamentos</span>
                          </div>
                          <div className="text-[10px] text-content-tertiary mt-1">
                            Atualizado: {new Date(b.updated_at).toLocaleString('pt-BR')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedBuilding && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-base-raised border border-success/20 rounded-2xl p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={16} weight="duotone" className="text-success" aria-hidden="true" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-success">
                      {selectedBuilding.nome} — {Object.keys(selectedBuilding.config).length} blocos, {totalImport} apartamentos
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {Object.entries(selectedBuilding.config).map(([nome, aptos]) => (
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
            aria-label={`Salvar e comecar vistoria com ${total} apartamentos`}
            className="tactile-press w-full bg-accent text-base font-semibold text-sm rounded-xl px-6 py-3.5 hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            Salvar e comecar ({total} apartamentos)
          </button>
        </motion.div>
      </div>
    </main>
  );
}
