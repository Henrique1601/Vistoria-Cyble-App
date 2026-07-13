'use client';

import { useRef, useState } from 'react';
import { salvarListaApartamentos } from '@/lib/db';

type Mode = 'manual' | 'importar';

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

    // Tentar JSON
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

    // Tentar TXT: "Torre A\n0031\n0032\n\nTorre B\n0101\n0102"
    const blocos: Record<string, string[]> = {};
    let currentBloco = '';
    for (const line of trimmed.split('\n')) {
      const l = line.trim();
      if (!l) {
        currentBloco = '';
        continue;
      }
      // Se a linha não é numérica e não tem só números, é nome do bloco
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
      setImportError('Não consegui interpretar. Use JSON ({"Torre A":["0031",...]}) ou TXT (nome do bloco seguido de aptos).');
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
      // Auto-parse
      const lista = parseImport(text);
      if (lista) {
        setListaImportada(lista);
        setImportError('');
      } else {
        setImportError('Arquivo não reconhecido. Use .json ou .txt.');
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
    <main className="shell">
      <div className="hero">
        <span className="hero-mark" />
        <h1>Configuração</h1>
      </div>
      <p className="subtitle">
        Cadastre os apartamentos de cada torre/bloco. Você pode preencher manualmente ou importar um arquivo.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={mode === 'manual' ? 'primary' : 'secondary'}
          style={{ flex: 1, fontSize: 14 }}
          onClick={() => setMode('manual')}
        >
          Manual
        </button>
        <button
          className={mode === 'importar' ? 'primary' : 'secondary'}
          style={{ flex: 1, fontSize: 14 }}
          onClick={() => setMode('importar')}
        >
          Importar arquivo
        </button>
      </div>

      {mode === 'manual' ? (
        <>
          <div className="panel">
            <div className="panel-title">Quantidade de blocos/torres</div>
            <input
              type="text"
              inputMode="numeric"
              value={numBlocos}
              onChange={(e) => setNumBlocos(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            />
          </div>

          {Array.from({ length: numBlocos }, (_, i) => (
            <div className="panel" key={i}>
              <div className="panel-title">Bloco {i + 1} — apartamentos (um por linha)</div>
              <textarea
                value={textos[i] || ''}
                onChange={(e) => updateTexto(i, e.target.value)}
                placeholder={'101\n102\n103\n...'}
              />
            </div>
          ))}
        </>
      ) : (
        <>
          <div className="panel">
            <div className="panel-title">Importar de arquivo (.json ou .txt)</div>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.txt"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
            <button className="secondary" onClick={() => fileRef.current?.click()} style={{ width: '100%' }}>
              📄 Escolher arquivo
            </button>
          </div>

          <div className="panel">
            <div className="panel-title">Ou cole o conteúdo aqui</div>
            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setListaImportada(null); setImportError(''); }}
              placeholder={'Torre A\n0031\n0032\n0033\n\nTorre B\n0101\n0102'}
              style={{ minHeight: 160, fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
            <button
              className="secondary"
              onClick={handleImport}
              disabled={!importText.trim()}
              style={{ marginTop: 10, width: '100%' }}
            >
              Interpretar lista
            </button>
            {importError && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{importError}</p>}
          </div>

          {listaImportada && (
            <div className="panel">
              <div className="panel-title">Prévia — {Object.keys(listaImportada).length} torres/blocos, {totalImport} apartamentos</div>
              <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 13 }}>
                {Object.entries(listaImportada).map(([nome, aptos]) => (
                  <div key={nome} style={{ marginBottom: 8 }}>
                    <strong>{nome}</strong> — {aptos.length} aptos
                    <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 2 }}>
                      {aptos.slice(0, 5).join(', ')}{aptos.length > 5 ? `... +${aptos.length - 5}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <button className="primary" onClick={salvar} disabled={total === 0}>
        Salvar e começar ({total} apartamentos)
      </button>
    </main>
  );
}
