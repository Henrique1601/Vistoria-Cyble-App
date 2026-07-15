'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Buildings,
  HouseLine,
  Camera,
  CheckCircle,
  Clock,
  FileText,
  Warning,
  SignOut,
  MagnifyingGlass,
  ArrowLeft,
  ArrowUpRight,
  SortAscending,
  Cloud,
  CloudSlash,
  PencilSimple,
  FileCsv,
  FilePdf,
  FunnelSimple,
  Images,
} from '@phosphor-icons/react';
import PinGate from './PinGate';
import SetupScreen from './SetupScreen';
import CapturaScreen from './CapturaScreen';
import {
  carregarListaApartamentos,
  statusDeTodosApartamentos,
  fotosPendentes,
  marcarSincronizada,
  registrarSync,
  ApartamentoStatus,
} from '@/lib/db';
import { exportarCSV, exportarPDF } from '@/lib/export';

type View = 'blocos' | 'apartamentos' | 'captura';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };
const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring },
};

export default function Home() {
  const [pin, setPin] = useState<string | null>(null);
  const [pinChecked, setPinChecked] = useState(false);
  const [lista, setLista] = useState<Record<string, string[]> | null>(null);
  const [status, setStatus] = useState<ApartamentoStatus[]>([]);
  const [view, setView] = useState<View>('blocos');
  const [blocoAtual, setBlocoAtual] = useState<string | null>(null);
  const [aptoAtual, setAptoAtual] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<'original' | 'pendentes'>('original');
  const [pendentes, setPendentes] = useState(0);
  const [online, setOnline] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    const saved = localStorage.getItem('vistoria_pin');
    setPin(saved);
    setPinChecked(true);
  }, []);

  useEffect(() => {
    if (!pin) return;
    const TIMEOUT_MS = 30 * 60 * 1000;
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    const resetTimer = () => setLastActivity(Date.now());
    events.forEach((e) => window.addEventListener(e, resetTimer));
    const check = setInterval(() => {
      if (Date.now() - lastActivity > TIMEOUT_MS) {
        localStorage.removeItem('vistoria_pin');
        setPin(null);
      }
    }, 60000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      clearInterval(check);
    };
  }, [pin]);

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
          await registrarSync({
            timestamp: Date.now(), bloco: foto.bloco, apartamento: foto.apartamento,
            categoria: foto.categoria, url: data.url, ok: true,
          });
        } else {
          await registrarSync({
            timestamp: Date.now(), bloco: foto.bloco, apartamento: foto.apartamento,
            categoria: foto.categoria, url: '', ok: false, erro: `HTTP ${resp.status}`,
          });
          break;
        }
      } catch (e: any) {
        await registrarSync({
          timestamp: Date.now(), bloco: foto.bloco, apartamento: foto.apartamento,
          categoria: foto.categoria, url: '', ok: false, erro: e?.message ?? 'offline',
        });
        break;
      }
    }
    await refreshStatus();
  }

  const blocos = useMemo(() => (lista ? Object.keys(lista) : []), [lista]);

  const aptosDoBloco = useMemo(() => {
    if (!blocoAtual || !lista) return [];
    const codigos = lista[blocoAtual] || [];
    const result = codigos
      .map((c) => status.find((s) => s.bloco === blocoAtual && s.apartamento === c) ?? {
        bloco: blocoAtual, apartamento: c, cybleAntesFeito: false, cybleDepoisFeito: false, qtdDocumentos: 0, qtdFotos: 0,
      })
      .filter((s) => s.apartamento.toLowerCase().includes(busca.toLowerCase()));

    if (ordem === 'pendentes') {
      result.sort((a, b) => {
        const aC = a.cybleAntesFeito && a.cybleDepoisFeito && a.qtdDocumentos > 0;
        const bC = b.cybleAntesFeito && b.cybleDepoisFeito && b.qtdDocumentos > 0;
        if (aC === bC) return 0;
        return aC ? 1 : -1;
      });
    }

    return result;
  }, [blocoAtual, lista, status, busca, ordem]);

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
      <main className="min-h-[100dvh] bg-base">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={spring}
            className="flex items-center gap-3 mb-6"
          >
            <button
              onClick={() => setView('blocos')}
              className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 transition-colors"
            >
              <ArrowLeft size={18} weight="bold" />
            </button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{blocoAtual}</h1>
              <p className="text-xs text-content-tertiary mt-0.5">
                {aptosDoBloco.length} apartamento{aptosDoBloco.length !== 1 ? 's' : ''}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            className="relative mb-4"
          >
            <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
            <input
              type="text"
              placeholder="Buscar apartamento..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-base-raised border border-base-border rounded-xl pl-10 pr-4 py-3 text-sm text-content placeholder:text-content-tertiary focus:outline-none focus:border-accent/50 focus:shadow-glow-accent transition-all"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.15 }}
            className="flex gap-2 mb-4"
          >
            <button
              onClick={() => setOrdem('original')}
              className={`tactile-press px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                ordem === 'original'
                  ? 'bg-accent-dim border-accent text-accent'
                  : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
              }`}
            >
              <SortAscending size={14} weight="bold" className="inline mr-1.5 -mt-0.5" />
              Numerica
            </button>
            <button
              onClick={() => setOrdem('pendentes')}
              className={`tactile-press px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                ordem === 'pendentes'
                  ? 'bg-accent-dim border-accent text-accent'
                  : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
              }`}
            >
              <FunnelSimple size={14} weight="bold" className="inline mr-1.5 -mt-0.5" />
              Pendentes primeiro
            </button>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="bg-base-raised border border-base-border rounded-2xl overflow-hidden divide-y divide-base-border"
          >
            {aptosDoBloco.length === 0 && (
              <div className="px-6 py-12 text-center">
                <HouseLine size={32} weight="light" className="mx-auto text-content-tertiary mb-3" />
                <p className="text-sm text-content-tertiary">
                  {busca ? 'Nenhum resultado para essa busca' : 'Nenhum apartamento neste bloco'}
                </p>
              </div>
            )}
            {aptosDoBloco.map((s) => (
              <motion.div
                key={s.apartamento}
                variants={item}
                onClick={() => { setAptoAtual(s.apartamento); setView('captura'); }}
                className="tactile-press flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-base-overlay/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium">{s.apartamento}</span>
                  {s.qtdFotos > 0 && (
                    <span className="text-[11px] font-mono text-content-tertiary bg-base-overlay px-2 py-0.5 rounded-md">
                      {s.qtdFotos} foto{s.qtdFotos > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusDot done={s.cybleAntesFeito} partial={emAndamento(s)} label="Antes" />
                  <StatusDot done={s.cybleDepoisFeito} partial={emAndamento(s)} label="Depois" />
                  <StatusDot done={s.qtdDocumentos > 0} label="Doc" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
        <SyncBanner online={online} pendentes={pendentes} />
      </main>
    );
  }

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
            <h1 className="text-2xl font-bold tracking-tight">Vistoria Cyble</h1>
          </div>
          <p className="text-sm text-content-tertiary ml-5">Selecione o bloco para comecar.</p>
        </motion.div>

        <Dashboard status={status} pendentes={pendentes} />

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-3 mb-6"
        >
          {blocos.map((b) => {
            const prog = progressoBloco(b);
            return (
              <motion.div
                key={b}
                variants={item}
                onClick={() => { setBlocoAtual(b); setView('apartamentos'); setBusca(''); }}
                className="tactile-press group bg-base-raised border border-base-border rounded-2xl p-5 cursor-pointer hover:border-accent/30 hover:shadow-diffusion transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-base-overlay border border-base-border-subtle flex items-center justify-center group-hover:border-accent/30 transition-colors">
                      <Buildings size={18} weight="duotone" className="text-content-secondary group-hover:text-accent transition-colors" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{b}</div>
                      <div className="text-[11px] text-content-tertiary font-mono">{prog.texto} concluidos</div>
                    </div>
                  </div>
                  <ArrowUpRight size={16} weight="bold" className="text-content-tertiary group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="h-1 bg-base-overlay rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${prog.pct}%` }}
                    transition={{ ...spring, delay: 0.3 }}
                    className="h-full bg-success rounded-full"
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.4 }}
          className="flex gap-3 mb-4"
        >
          <button
            onClick={() => exportarCSV(status)}
            disabled={status.length === 0}
            className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <FileCsv size={16} weight="bold" />
            Exportar CSV
          </button>
          <button
            onClick={() => exportarPDF(status, 'Vistoria Cyble')}
            disabled={status.length === 0}
            className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <FilePdf size={16} weight="bold" />
            Gerar relatorio
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-4"
        >
          <a
            href="/galeria"
            className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content transition-colors"
          >
            <Images size={13} weight="bold" />
            Galeria
          </a>
          <button
            onClick={() => setLista(null)}
            className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content transition-colors"
          >
            <PencilSimple size={13} weight="bold" />
            Editar lista
          </button>
          <button
            onClick={() => { localStorage.removeItem('vistoria_pin'); setPin(null); }}
            className="tactile-press flex items-center gap-1.5 text-xs text-danger hover:text-danger/80 transition-colors"
          >
            <SignOut size={13} weight="bold" />
            Sair
          </button>
        </motion.div>
      </div>
      <SyncBanner online={online} pendentes={pendentes} />
    </main>
  );
}

function StatusDot({ done, partial, label }: { done: boolean; partial?: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
          done ? 'bg-success shadow-[0_0_6px_rgba(52,211,153,0.4)]' :
          partial ? 'bg-warn shadow-[0_0_6px_rgba(251,191,36,0.3)]' :
          'bg-base-border'
        }`}
        title={label}
      />
    </div>
  );
}

function SyncBanner({ online, pendentes }: { online: boolean; pendentes: number }) {
  if (pendentes === 0) return null;
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={spring}
      className={`fixed bottom-0 left-0 right-0 border-t px-4 py-3 text-xs font-medium flex justify-between items-center z-50 backdrop-blur-md ${
        online
          ? 'bg-base-raised/90 border-accent/20 text-accent'
          : 'bg-base-raised/90 border-danger/20 text-danger'
      }`}
    >
      <span className="flex items-center gap-2">
        {online ? <Cloud size={14} weight="bold" /> : <CloudSlash size={14} weight="bold" />}
        {online ? 'Sincronizando...' : 'Sem internet — fotos salvas no aparelho'}
      </span>
      <span className="font-mono tabular-nums">{pendentes} pendente(s)</span>
    </motion.div>
  );
}

function Dashboard({ status, pendentes }: { status: ApartamentoStatus[]; pendentes: number }) {
  const totalAptos = status.length;
  const completos = status.filter((s) => s.cybleAntesFeito && s.cybleDepoisFeito && s.qtdDocumentos > 0).length;
  const andamento = status.filter((s) => emAndamento(s)).length;
  const totalFotos = status.reduce((acc, s) => acc + s.qtdFotos, 0);
  const pct = totalAptos > 0 ? Math.round((completos / totalAptos) * 100) : 0;

  const cards = [
    {
      icon: <CheckCircle size={20} weight="duotone" />,
      value: `${pct}%`,
      label: 'Concluido',
      accent: pct === 100,
      span: 'col-span-2',
      extra: (
        <div className="h-1 bg-base-overlay rounded-full overflow-hidden mt-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ ...spring, delay: 0.5 }}
            className="h-full bg-success rounded-full"
          />
        </div>
      ),
    },
    {
      icon: <Buildings size={20} weight="duotone" />,
      value: `${completos}`,
      sub: `/${totalAptos}`,
      label: 'Aptos feitos',
      accent: false,
      span: 'col-span-1',
    },
    {
      icon: <Camera size={20} weight="duotone" />,
      value: `${totalFotos}`,
      label: 'Fotos tiradas',
      accent: false,
      span: 'col-span-1',
    },
    {
      icon: pendentes > 0 ? <Clock size={20} weight="duotone" /> : <Cloud size={20} weight="duotone" />,
      value: `${pendentes}`,
      label: 'Pendente sync',
      accent: pendentes > 0,
      span: 'col-span-2',
    },
  ];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-3 mb-8"
    >
      {cards.map((c, i) => (
        <motion.div
          key={i}
          variants={item}
          className={`${c.span} bg-base-raised border border-base-border rounded-2xl p-5 group hover:border-base-border/80 transition-colors`}
        >
          <div className={`mb-3 ${c.accent ? 'text-accent' : 'text-content-tertiary'}`}>
            {c.icon}
          </div>
          <div className="font-mono text-2xl font-bold tracking-tight text-content">
            {c.value}
            {c.sub && <span className="text-base text-content-tertiary font-normal">{c.sub}</span>}
          </div>
          <div className="text-[11px] text-content-tertiary uppercase tracking-widest mt-1">{c.label}</div>
          {c.extra}
        </motion.div>
      ))}
    </motion.div>
  );
}

function emAndamento(s: ApartamentoStatus): boolean {
  const temFoto = s.cybleAntesFeito || s.cybleDepoisFeito;
  const completo = s.cybleAntesFeito && s.cybleDepoisFeito && s.qtdDocumentos > 0;
  return temFoto && !completo;
}
