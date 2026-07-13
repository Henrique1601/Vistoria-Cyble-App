'use client';

import { useEffect, useMemo, useState } from 'react';
import PinGate from './PinGate';
import SetupScreen from './SetupScreen';
import CapturaScreen from './CapturaScreen';
import {
  carregarListaApartamentos,
  statusDeTodosApartamentos,
  fotosPendentes,
  marcarSincronizada,
  ApartamentoStatus,
} from '@/lib/db';

type View = 'blocos' | 'apartamentos' | 'captura';

export default function Home() {
  const [pin, setPin] = useState<string | null>(null);
  const [pinChecked, setPinChecked] = useState(false);
  const [lista, setLista] = useState<Record<string, string[]> | null>(null);
  const [status, setStatus] = useState<ApartamentoStatus[]>([]);
  const [view, setView] = useState<View>('blocos');
  const [blocoAtual, setBlocoAtual] = useState<string | null>(null);
  const [aptoAtual, setAptoAtual] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [pendentes, setPendentes] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('vistoria_pin');
    setPin(saved);
    setPinChecked(true);
  }, []);

  useEffect(() => {
    if (pin) {
      carregarListaApartamentos().then((l) => setLista(Object.keys(l).length ? l : null));
    }
  }, [pin]);

  async function refreshStatus() {
    if (lista) setStatus(await statusDeTodosApartamentos(lista));
    setPendentes((await fotosPendentes()).length);
  }

  useEffect(() => {
    if (lista) refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); tentarSincronizar(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const interval = setInterval(tentarSincronizar, 15000);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function tentarSincronizar() {
    if (!navigator.onLine || !pin) return;
    const pendentesLista = await fotosPendentes();
    for (const foto of pendentesLista) {
      try {
        const form = new FormData();
        form.append('file', foto.blob, `${foto.categoria}.jpg`);
        form.append('bloco', foto.bloco);
        form.append('apartamento', foto.apartamento);
        form.append('categoria', foto.categoria);
        form.append('timestamp', String(foto.timestamp));
        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'x-app-pin': pin },
          body: form,
        });
        if (resp.ok) {
          const data = await resp.json();
          await marcarSincronizada(foto.id!, data.url);
        } else {
          break; // para no primeiro erro (ex: PIN mudou, ou sem token configurado)
        }
      } catch {
        break; // sem internet de verdade — tenta de novo no próximo ciclo
      }
    }
    await refreshStatus();
  }

  const blocos = useMemo(() => (lista ? Object.keys(lista) : []), [lista]);

  const aptosDoBloco = useMemo(() => {
    if (!blocoAtual || !lista) return [];
    const codigos = lista[blocoAtual] || [];
    return codigos
      .map((c) => status.find((s) => s.bloco === blocoAtual && s.apartamento === c) ?? {
        bloco: blocoAtual, apartamento: c, cybleAntesFeito: false, cybleDepoisFeito: false, qtdDocumentos: 0, qtdFotos: 0,
      })
      .filter((s) => s.apartamento.toLowerCase().includes(busca.toLowerCase()));
  }, [blocoAtual, lista, status, busca]);

  function progressoBloco(bloco: string) {
    const codigos = lista?.[bloco] || [];
    const completos = codigos.filter((c) => {
      const st = status.find((x) => x.bloco === bloco && x.apartamento === c);
      return st && st.cybleAntesFeito && st.cybleDepoisFeito && st.qtdDocumentos > 0;
    }).length;
    const pct = codigos.length > 0 ? Math.round((completos / codigos.length) * 100) : 0;
    return { texto: `${completos}/${codigos.length}`, pct };
  }

  if (!pinChecked) return null;

  if (!pin) {
    return (
      <PinGate
        onOk={(p) => {
          localStorage.setItem('vistoria_pin', p);
          setPin(p);
        }}
      />
    );
  }

  if (!lista) {
    return <SetupScreen onDone={(l) => setLista(l)} />;
  }

  if (view === 'captura' && blocoAtual && aptoAtual) {
    return (
      <>
        <CapturaScreen
          bloco={blocoAtual}
          apartamento={aptoAtual}
          onVoltar={() => { setView('apartamentos'); refreshStatus(); }}
          onFotoSalva={() => { refreshStatus(); tentarSincronizar(); }}
        />
        <SyncBanner online={online} pendentes={pendentes} />
      </>
    );
  }

  if (view === 'apartamentos' && blocoAtual) {
    return (
      <main className="shell">
        <div className="top-bar">
          <button className="ghost" onClick={() => setView('blocos')}>←</button>
          <h1 style={{ fontSize: 20 }}>{blocoAtual}</h1>
        </div>
        <div className="search-box">
          <input type="text" placeholder="Buscar apartamento…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="apt-list">
          {aptosDoBloco.map((s) => (
            <div
              key={s.apartamento}
              className="apt-row"
              onClick={() => { setAptoAtual(s.apartamento); setView('captura'); }}
            >
              <span>{s.apartamento}</span>
              <span className="badges">
                {s.qtdFotos > 0 && <span className="apt-count mono">{s.qtdFotos} foto{s.qtdFotos > 1 ? 's' : ''}</span>}
                <span className={`dot ${s.cybleAntesFeito ? 'on' : ''}`} title="Cyble antes" />
                <span className={`dot ${s.cybleDepoisFeito ? 'on' : ''}`} title="Cyble depois" />
                <span className={`dot ${s.qtdDocumentos > 0 ? 'on' : ''}`} title="Documento" />
              </span>
            </div>
          ))}
        </div>
        <SyncBanner online={online} pendentes={pendentes} />
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="hero">
        <span className="hero-mark" />
        <h1>Vistoria Cyble</h1>
      </div>
      <p className="subtitle">Selecione o bloco para começar.</p>
      {blocos.map((b) => {
        const prog = progressoBloco(b);
        return (
          <div key={b} className="big-tile" onClick={() => { setBlocoAtual(b); setView('apartamentos'); setBusca(''); }}>
            <div style={{ flex: 1 }}>
              <div className="big-tile-label">{b}</div>
              <div className="big-tile-sub">{prog.texto} concluídos</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${prog.pct}%` }} />
              </div>
            </div>
          </div>
        );
      })}
      <button className="ghost" onClick={() => setLista(null)}>Editar lista de apartamentos</button>
      <SyncBanner online={online} pendentes={pendentes} />
    </main>
  );
}

function SyncBanner({ online, pendentes }: { online: boolean; pendentes: number }) {
  if (pendentes === 0) return null;
  return (
    <div className={`sync-banner ${online ? 'pending' : 'offline'}`}>
      <span>{online ? 'Sincronizando…' : 'Sem internet — fotos salvas no aparelho'}</span>
      <span className="mono">{pendentes} pendente(s)</span>
    </div>
  );
}
