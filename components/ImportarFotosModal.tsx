'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FolderOpen,
  Images,
  ArrowRight,
  CheckCircle,
  Warning,
  SpinnerGap,
} from '@phosphor-icons/react';
import { haptic } from '@/lib/haptic';
import { spring } from '@/lib/motion';
import { salvarFoto, comprimirImagem, Categoria, carregarListaApartamentos } from '@/lib/db';
import { normApto } from '@/lib/utils';

interface PhotoGroup {
  folderName: string;
  tower: string;
  apto: string;
  category: Categoria;
  files: File[];
  previews: string[];
}

interface ImportarFotosModalProps {
  onFechar: () => void;
  onImportado: () => void;
}

const CATEGORIA_OPTIONS: { key: Categoria; label: string }[] = [
  { key: 'cyble_antes', label: 'Cyble Antes' },
  { key: 'cyble_depois', label: 'Cyble Depois' },
  { key: 'documento', label: 'Documento' },
];

function parseFolderName(name: string): { tower: string; apto: string } {
  const match = name.match(/^(\d+)([A-H])$/i);
  if (match) {
    return { apto: match[1], tower: match[2].toUpperCase() };
  }
  const letterMatch = name.match(/^([A-H])(\d+)$/i);
  if (letterMatch) {
    return { tower: letterMatch[1].toUpperCase(), apto: letterMatch[2] };
  }
  return { tower: '', apto: name.replace(/[^0-9]/g, '') || name };
}

export default function ImportarFotosModal({ onFechar, onImportado }: ImportarFotosModalProps) {
  const [groups, setGroups] = useState<PhotoGroup[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<Record<string, string[]> | null>(null);

  useEffect(() => {
    carregarListaApartamentos().then((l) => { listaRef.current = l; });
  }, []);

  function mapBloco(tower: string): string {
    const lista = listaRef.current;
    if (!lista) return tower;
    const tUpper = tower.toUpperCase();
    for (const blocoNome of Object.keys(lista)) {
      const match = blocoNome.match(/([A-H])$/i);
      if (match && match[1].toUpperCase() === tUpper) return blocoNome;
    }
    return tower;
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    haptic('light');

    const folderMap = new Map<string, File[]>();
    for (const file of files) {
      const path = file.webkitRelativePath;
      const parts = path.split('/');
      if (parts.length < 3) continue;
      const subfolder = parts[1];
      if (!folderMap.has(subfolder)) folderMap.set(subfolder, []);
      folderMap.get(subfolder)!.push(file);
    }

    const newGroups: PhotoGroup[] = [];
    for (const [folderName, folderFiles] of folderMap) {
      const { tower, apto } = parseFolderName(folderName);
      const mappedTower = mapBloco(tower);
      const previews = folderFiles.map((f) => URL.createObjectURL(f));
      newGroups.push({
        folderName,
        tower: mappedTower,
        apto,
        category: 'cyble_antes',
        files: folderFiles,
        previews,
      });
    }
    setGroups(newGroups);
  }, []);

  function updateGroup(idx: number, patch: Partial<PhotoGroup>) {
    setGroups((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  }

  function removeGroup(idx: number) {
    haptic('light');
    setGroups((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleImportar() {
    if (groups.length === 0) return;
    haptic('heavy');
    setImporting(true);
    const total = groups.reduce((s, g) => s + g.files.length, 0);
    setProgress({ current: 0, total });
    let ok = 0;
    let fail = 0;

    for (const group of groups) {
      for (const file of group.files) {
        try {
          const compressed = await comprimirImagem(file);
          await salvarFoto({
            bloco: group.tower,
            apartamento: normApto(group.apto),
            categoria: group.category,
            blob: compressed,
            timestamp: Date.now() + ok,
            synced: false,
          });
          ok++;
        } catch {
          fail++;
        }
        setProgress((p) => ({ ...p, current: p.current + 1 }));
      }
    }

    setImporting(false);
    setResult({ ok, fail });
    if (ok > 0) onImportado();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && !importing && onFechar()}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={spring}
        className="bg-base-raised border border-base-border rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-border">
          <div className="flex items-center gap-2">
            <Images size={18} weight="duotone" className="text-accent" />
            <h2 className="text-base font-bold">Importar Fotos</h2>
          </div>
          <button
            onClick={onFechar}
            disabled={importing}
            className="tactile-press flex items-center justify-center w-8 h-8 rounded-lg text-content-tertiary hover:text-content transition-colors disabled:opacity-40"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {groups.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-content-secondary text-center">
                Selecione uma pasta com as fotos organizadas por apartamento.
              </p>
              <p className="text-xs text-content-tertiary text-center">
                Estrutura esperada: <code className="text-accent">pasta/104A/foto.jpg</code>
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="tactile-press w-full flex items-center justify-center gap-2 bg-accent/10 border border-accent/30 rounded-xl px-4 py-4 text-sm font-medium text-accent hover:bg-accent/20 transition-all"
              >
                <FolderOpen size={20} weight="bold" />
                Selecionar pasta
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                // @ts-ignore
                webkitdirectory=""
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : result ? (
            <div className="text-center space-y-4 py-8">
              <CheckCircle size={48} weight="duotone" className="text-green mx-auto" />
              <p className="text-lg font-bold">Importacao concluida!</p>
              <p className="text-sm text-content-secondary">
                {result.ok} foto(s) importada(s)
                {result.fail > 0 && `, ${result.fail} falha(s)`}
              </p>
            </div>
          ) : importing ? (
            <div className="text-center space-y-4 py-8">
              <SpinnerGap size={48} weight="duotone" className="text-accent mx-auto animate-spin" />
              <p className="text-sm text-content-secondary">
                Importando foto {progress.current + 1} de {progress.total}...
              </p>
              <div className="w-full bg-base-overlay rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((progress.current + 1) / progress.total) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-content-tertiary">
                {groups.length} grupo(s) detectado(s). Ajuste antes de importar:
              </p>
              {groups.map((group, idx) => (
                <div
                  key={group.folderName}
                  className="bg-base-overlay border border-base-border rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-content-tertiary">
                      {group.folderName}/ ({group.files.length} fotos)
                    </span>
                    <button
                      onClick={() => removeGroup(idx)}
                      className="text-danger hover:text-danger/80 transition-colors"
                    >
                      <X size={14} weight="bold" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-widest text-content-tertiary mb-0.5 block">
                        Torre
                      </label>
                      <select
                        value={group.tower}
                        onChange={(e) => updateGroup(idx, { tower: e.target.value })}
                        className="w-full bg-base border border-base-border rounded-lg px-2 py-1.5 text-xs text-content"
                      >
                        <option value="">-</option>
                        {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((t) => (
                          <option key={t} value={t}>
                            Torre {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-widest text-content-tertiary mb-0.5 block">
                        Apto
                      </label>
                      <input
                        type="text"
                        value={group.apto}
                        onChange={(e) => updateGroup(idx, { apto: e.target.value })}
                        className="w-full bg-base border border-base-border rounded-lg px-2 py-1.5 text-xs text-content font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-widest text-content-tertiary mb-0.5 block">
                        Categoria
                      </label>
                      <select
                        value={group.category}
                        onChange={(e) => updateGroup(idx, { category: e.target.value as Categoria })}
                        className="w-full bg-base border border-base-border rounded-lg px-2 py-1.5 text-xs text-content"
                      >
                        {CATEGORIA_OPTIONS.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {group.previews.length > 0 && (
                    <div className="flex gap-1 overflow-x-auto pt-1">
                      {group.previews.slice(0, 5).map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt=""
                          className="w-10 h-10 object-cover rounded-lg border border-base-border flex-shrink-0"
                        />
                      ))}
                      {group.previews.length > 5 && (
                        <span className="w-10 h-10 flex items-center justify-center text-[10px] text-content-tertiary bg-base-overlay rounded-lg border border-base-border">
                          +{group.previews.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {groups.length > 0 && !result && !importing && (
          <div className="p-4 border-t border-base-border">
            <button
              onClick={handleImportar}
              className="tactile-press w-full flex items-center justify-center gap-2 bg-accent text-base font-semibold text-sm rounded-xl px-6 py-3 hover:bg-accent-hover transition-colors"
            >
              Importar {groups.reduce((s, g) => s + g.files.length, 0)} fotos
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        )}
        {result && (
          <div className="p-4 border-t border-base-border">
            <button
              onClick={onFechar}
              className="tactile-press w-full bg-base-overlay border border-base-border text-content-secondary font-semibold text-sm rounded-xl px-6 py-3 hover:text-content transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
