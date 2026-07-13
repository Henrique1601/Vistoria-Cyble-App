'use client';

import { useState } from 'react';

export default function PinGate({ onOk }: { onOk: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [checking, setChecking] = useState(false);

  async function confirmar() {
    setChecking(true);
    setErro('');
    try {
      const resp = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await resp.json();
      if (data.ok) {
        onOk(pin);
      } else {
        setErro('PIN incorreto');
      }
    } catch {
      setErro('Sem conexão pra validar agora — tente de novo quando tiver sinal');
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="shell">
      <div className="hero">
        <span className="hero-mark" />
        <h1>Vistoria Cyble</h1>
      </div>
      <p className="subtitle">Digite o PIN de acesso.</p>
      <div className="panel">
        <input
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        {erro && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{erro}</p>}
        <div style={{ marginTop: 14 }}>
          <button className="primary" onClick={confirmar} disabled={!pin || checking}>
            {checking ? 'Verificando…' : 'Entrar'}
          </button>
        </div>
      </div>
    </main>
  );
}
