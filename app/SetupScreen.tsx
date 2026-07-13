'use client';

import { useState } from 'react';
import { salvarListaApartamentos } from '@/lib/db';

export default function SetupScreen({ onDone }: { onDone: (lista: Record<string, string[]>) => void }) {
  const [numBlocos, setNumBlocos] = useState(8);
  const [textos, setTextos] = useState<string[]>(Array(8).fill(''));

  function updateTexto(i: number, v: string) {
    const next = [...textos];
    next[i] = v;
    setTextos(next);
  }

  async function salvar() {
    const lista: Record<string, string[]> = {};
    for (let i = 0; i < numBlocos; i++) {
      const blocoNome = `Bloco ${i + 1}`;
      const aptos = (textos[i] || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      lista[blocoNome] = aptos;
    }
    await salvarListaApartamentos(lista);
    onDone(lista);
  }

  const totalAptos = textos.slice(0, numBlocos).reduce((acc, t) => acc + t.split('\n').filter((s) => s.trim()).length, 0);

  return (
    <main className="shell">
      <div className="hero">
        <span className="hero-mark" />
        <h1>Configuração</h1>
      </div>
      <p className="subtitle">
        Cadastre os apartamentos de cada bloco uma única vez. Cole um apartamento por linha (ex: 101, 102, 103…).
      </p>

      <div className="panel">
        <div className="panel-title">Quantidade de blocos</div>
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

      <button className="primary" onClick={salvar} disabled={totalAptos === 0}>
        Salvar e começar ({totalAptos} apartamentos)
      </button>
    </main>
  );
}
