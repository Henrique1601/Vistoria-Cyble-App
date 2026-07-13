'use client';

import { useEffect, useRef, useState } from 'react';
import { salvarFoto, deletarFoto, fotosDoApartamento, comprimirImagem, FotoRecord, Categoria } from '@/lib/db';

const CATEGORIAS: { key: Categoria; label: string; multi: boolean }[] = [
  { key: 'cyble_antes', label: 'Cyble — Antes', multi: false },
  { key: 'cyble_depois', label: 'Cyble — Depois', multi: true },
  { key: 'documento', label: 'Documento do apartamento', multi: true },
];

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <main className="shell">
      <div className="top-bar">
        <button className="ghost" onClick={onVoltar}>←</button>
        <div>
          <h1 style={{ fontSize: 20 }}>{bloco} · {apartamento}</h1>
        </div>
      </div>

      {CATEGORIAS.map((cat) => {
        const doCategoria = fotos
          .filter((f) => f.categoria === cat.key)
          .sort((a, b) => a.timestamp - b.timestamp);
        return (
          <div className="panel" key={cat.key}>
            <div className="panel-title">{cat.label}</div>
            <input
              ref={(el) => { inputsRef.current[cat.key] = el; }}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(cat.key, e.target.files?.[0] ?? null)}
            />
            <button className="secondary" onClick={() => inputsRef.current[cat.key]?.click()}>
              {doCategoria.length > 0 && !cat.multi ? '📷 Tirar de novo' : '📷 Tirar foto'}
            </button>
            {doCategoria.length > 0 && (
              <div className="thumb-row">
                {doCategoria.map((f) => {
                  const src = f.synced && f.uploadUrl ? f.uploadUrl : (f.blob.size > 0 ? URL.createObjectURL(f.blob) : '');
                  return (
                    <div key={f.id} className="thumb-wrapper">
                      {src ? <img className="thumb" src={src} alt="" /> : <div className="thumb placeholder" />}
                      <span className={`sync-badge ${f.synced ? 'ok' : ''}`} title={f.synced ? 'Sincronizada' : 'Pendente'}>
                        {f.synced ? '☁' : '⏳'}
                      </span>
                      <button className="thumb-delete" onClick={() => f.id && handleDeletar(f.id)} title="Excluir foto">✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <button className="primary" onClick={onVoltar}>
        Concluir e voltar pra lista
      </button>

      <button className="fab-back" onClick={onVoltar} title="Voltar para lista">
        ← Lista
      </button>
    </main>
  );
}
