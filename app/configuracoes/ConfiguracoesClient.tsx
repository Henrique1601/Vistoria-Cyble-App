'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  ArrowLeft,
  Moon,
  Sun,
  CircleHalf,
  Camera,
  Database,
  Warning,
  Trash,
  ArrowDown,
  ArrowUp,
  Lock,
  Info,
  GithubLogo,
  GearSix,
  Cloud,
  ArrowClockwise,
  Buildings,
  Images,
  FileText,
  FileCsv,
  FileXls,
  Folder,
} from '@phosphor-icons/react';
import { useTheme } from '@/lib/theme';
import { haptic } from '@/lib/haptic';
import {
  getQualidadeFoto,
  setQualidadeFoto,
  getScanMode,
  setScanMode,
  getDiasAlerta,
  setDiasAlerta,
  getItensPagina,
  setItensPagina,
  getBackupAutomatico,
  setBackupAutomatico,
  getBackupIntervalo,
  setBackupIntervalo,
} from '@/lib/settings';
import {
  backupDados,
  restaurarDados,
  checarEspacoStorage,
  exportarConfigCSV,
  exportarConfigXLSX,
  importarConfigCSV,
  importarConfigXLSX,
  importarConcluidosTxt,
  limparConcluidos,
  carregarConcluidos,
  exportarConcluidosTxt,
} from '@/lib/db';
import { useToast } from '@/components/Toast';
import { initGoogleDrive, requestGoogleDriveAccess, backupToGoogleDrive, listGoogleDriveBackups } from '@/lib/googleDrive';
import { authFetch } from '@/lib/api';
import { spring } from '@/lib/motion';
import { APP_VERSION } from '@/lib/version';
import ImportarFotosModal from '@/components/ImportarFotosModal';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-content-tertiary mb-3">
        {title}
      </h3>
      <div className="bg-base-raised border border-base-border rounded-2xl divide-y divide-base-border">
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-4">
      <div className="min-w-0">
        <span className="text-sm font-medium text-content">{label}</span>
        {description && (
          <p className="text-xs text-content-tertiary mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => { haptic('light'); onChange(opt.value); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            value === opt.value
              ? 'bg-accent text-base'
              : 'bg-base-overlay text-content-secondary hover:text-content border border-base-border'
          }`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function ConfiguracoesClient({ onVoltar, onRefresh, onNavigate, pin }: { onVoltar: () => void; onRefresh?: () => void; onNavigate?: (view: string) => void; pin?: string }) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const isAdmin = pin === '4821';
  const [qualidade, setQualidade] = useState(getQualidadeFoto);
  const [scanDefault, setScanDefault] = useState(getScanMode);
  const [dias, setDias] = useState(getDiasAlerta);
  const [itens, setItens] = useState(getItensPagina);
  const [backupAuto, setBackupAuto] = useState(getBackupAutomatico);
  const [backupInt, setBackupInt] = useState(getBackupIntervalo);
  const [espaco, setEspaco] = useState<{ usado: number; total: number; pct: number } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning';
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', variant: 'danger', onConfirm: () => {} });
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [showImportFotos, setShowImportFotos] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [gdriveConnected, setGdriveConnected] = useState(false);
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [fotosPendentes, setFotosPendentes] = useState(0);

  // Load storage info and pending photos on mount
  useEffect(() => {
    checarEspacoStorage().then(setEspaco);
    import('@/lib/db').then(({ fotosPendentes: count }) => {
      count().then((fotos) => setFotosPendentes(fotos.length));
    });
  }, []);

  async function handleSaveConfig() {
    setSavingConfig(true);
    haptic('medium');
    try {
      if (!navigator.onLine) {
        toast('Voce esta offline. Conecte-se a internet para salvar as configuracoes na nuvem.', 'error');
        setSavingConfig(false);
        return;
      }
      const { carregarListaApartamentos } = await import('@/lib/db');
      const lista = await carregarListaApartamentos();
      if (!lista) {
        toast('Nenhuma configuracao local para salvar', 'error');
        setSavingConfig(false);
        return;
      }
      const res = await authFetch('/api/building-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Predio AcquaPlay', config: lista }),
      });
      const data = await res.json();
      if (data.ok) {
        toast('Configuracao salva na nuvem', 'success');
        setLastSaved(new Date().toLocaleTimeString('pt-BR'));
      } else {
        toast('Erro ao salvar: ' + (data.error || 'desconhecido'), 'error');
      }
    } catch {
      toast('Erro ao salvar configuracao. Verifique sua conexao com a internet.', 'error');
    }
    setSavingConfig(false);
  }

  async function handleLoadConfig() {
    setLoadingConfig(true);
    haptic('medium');
    try {
      const res = await authFetch('/api/building-config');
      const data = await res.json();
      if (data.buildings && data.buildings.length > 0) {
        toast(`${data.buildings.length} prédio(s) encontrado(s) na nuvem`, 'success');
        setLastSaved(data.buildings[0].updated_at);
      } else {
        toast('Nenhum prédio na nuvem', 'error');
      }
    } catch {
      toast('Erro ao carregar configuracao', 'error');
    }
    setLoadingConfig(false);
  }

  const temIcon = theme === 'dark' ? <Moon size={14} /> : theme === 'light' ? <Sun size={14} /> : <CircleHalf size={14} />;

  function handleTema(t: string) {
    const newTheme = t as 'dark' | 'light' | 'auto';
    haptic('light');
    setTheme(newTheme);
  }

  function handleQualidade(q: string) {
    setQualidade(q as '50' | '75' | '90' | '100');
    setQualidadeFoto(q as '50' | '75' | '90' | '100');
    toast(`Qualidade alterada para ${q}%`, 'success');
  }

  function handleScanMode(v: string) {
    const val = v === 'true';
    setScanDefault(val);
    setScanMode(val);
    toast(val ? 'Modo escaneamento ativado por padrao' : 'Modo escaneamento desativado por padrao', 'info');
  }

  function handleDiasAlerta(d: string) {
    const val = Math.max(1, Math.min(90, Number(d) || 7));
    setDias(val);
    setDiasAlerta(val);
  }

  function handleItensPagina(v: string) {
    const val = Number(v) as 10 | 20 | 50 | 999;
    setItens(val);
    setItensPagina(val);
  }

  function handleBackupAuto(v: string) {
    const val = v === 'true';
    setBackupAuto(val);
    setBackupAutomatico(val);
  }

  function handleBackupIntervalo(v: string) {
    const val = Number(v) as 30 | 60 | 360 | 1440;
    setBackupInt(val);
    setBackupIntervalo(val);
  }

  async function handleExportBackup() {
    haptic('medium');
    try {
      const blob = await backupDados();
      downloadBlob(blob, `backup-completo-${dateStr()}.json`);
      toast('Backup completo exportado', 'success');
    } catch {
      toast('Erro ao exportar backup', 'error');
    }
  }

  async function handleExportFotos() {
    haptic('medium');
    try {
      const { backupFotos } = await import('@/lib/db');
      const blob = await backupFotos();
      downloadBlob(blob, `fotos-${dateStr()}.json`);
      toast('Fotos exportadas', 'success');
    } catch {
      toast('Erro ao exportar fotos', 'error');
    }
  }

  async function handleExportConfigCSV() {
    haptic('medium');
    try {
      const blob = await exportarConfigCSV();
      downloadBlob(blob, `configuracao-${dateStr()}.csv`);
      toast('Configuracao CSV exportada', 'success');
    } catch {
      toast('Erro ao exportar CSV', 'error');
    }
  }

  async function handleExportConfigXLSX() {
    haptic('medium');
    try {
      const blob = await exportarConfigXLSX();
      downloadBlob(blob, `configuracao-${dateStr()}.xlsx`);
      toast('Configuracao XLSX exportada', 'success');
    } catch {
      toast('Erro ao exportar XLSX', 'error');
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function dateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function handleImportBackup() {
    haptic('medium');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv,.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (ext === 'csv') {
          const text = await file.text();
          const result = await importarConfigCSV(text);
          toast(`CSV: ${result.blocos} blocos, ${result.aptos} apartamentos`, 'success');
          onRefresh?.();
        } else if (ext === 'xlsx' || ext === 'xls') {
          const result = await importarConfigXLSX(file);
          toast(`XLSX: ${result.blocos} blocos, ${result.aptos} apartamentos`, 'success');
          onRefresh?.();
        } else {
          const text = await file.text();
          const dados = JSON.parse(text);
          const tipo = dados.tipo || 'completo';
          const result = await restaurarDados(text);
          const label = tipo === 'configuracao' ? 'Configuracao' : tipo === 'fotos' ? 'Fotos' : 'Backup completo';
          toast(`${label}: ${result.blocos} blocos, ${result.fotos} fotos, ${result.syncLog} logs`, 'success');
          onRefresh?.();
        }
      } catch {
        toast('Erro ao importar arquivo', 'error');
      }
    };
    input.click();
  }

  async function handleImportConcluidos() {
    haptic('medium');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const result = await importarConcluidosTxt(text);
        toast(`${result.aptos} apartamentos marcados como concluidos (${result.blocos} blocos)`, 'success');
        onRefresh?.();
      } catch (err: any) {
        toast(err.message || 'Erro ao importar lista', 'error');
      }
    };
    input.click();
  }

  async function handleLimparConcluidos() {
    setConfirmDialog({
      open: true,
      title: 'Limpar concluídos?',
      message: 'Remover todos os apartamentos marcados como concluídos?',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, open: false }));
        haptic('medium');
        await limparConcluidos();
        toast('Lista de concluidos limpa', 'success');
        onRefresh?.();
      },
    });
  }

  async function handleExportarConcluidos() {
    haptic('medium');
    try {
      const blob = await exportarConcluidosTxt();
      downloadBlob(blob, `concluidos-${dateStr()}.txt`);
      const c = await carregarConcluidos();
      const total = Object.values(c).reduce((acc, a) => acc + a.length, 0);
      toast(`${total} apartamentos concluidos exportados`, 'success');
    } catch {
      toast('Erro ao exportar concluidos', 'error');
    }
  }

  async function handleClearLocalPhotos() {
    setConfirmDialog({
      open: true,
      title: 'Excluir fotos locais?',
      message: 'Excluir todas as fotos locais não sincronizadas? Esta ação não pode ser desfeita.',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, open: false }));
        setClearing(true);
        haptic('heavy');
        try {
          const { openDB } = await import('idb');
          const db = await openDB('vistoria-cyble', 2);
          await db.clear('fotos');
          await db.clear('syncLog');
          toast('Fotos locais excluidas', 'success');
          checarEspacoStorage().then(setEspaco);
        } catch {
          toast('Erro ao limpar dados', 'error');
        }
        setClearing(false);
      },
    });
  }

  async function handleClearAll() {
    setConfirmDialog({
      open: true,
      title: 'Excluir TODOS os dados?',
      message: 'Fotos, configurações e histórico serão perdidos. Esta ação não pode ser desfeita.',
      variant: 'danger',
      onConfirm: () => {
        setConfirmDialog({
          open: true,
          title: 'Tem certeza absoluta?',
          message: 'Não será possível recuperar os dados. Confirma a exclusão?',
          variant: 'danger',
          onConfirm: async () => {
            setConfirmDialog((d) => ({ ...d, open: false }));
            setClearing(true);
            haptic('heavy');
            try {
              indexedDB.deleteDatabase('vistoria-cyble');
              localStorage.clear();
              toast('Todos os dados excluidos', 'success');
              setTimeout(() => onVoltar(), 1000);
            } catch {
              toast('Erro ao limpar dados', 'error');
            }
            setClearing(false);
          },
        });
      },
    });
  }

  // Google Drive
  async function handleGoogleDriveConnect() {
    setGdriveLoading(true);
    haptic('medium');
    try {
      const inited = await initGoogleDrive();
      if (!inited) {
        toast('Erro ao inicializar Google Drive', 'error');
        setGdriveLoading(false);
        return;
      }
      const ok = await requestGoogleDriveAccess();
      if (ok) {
        setGdriveConnected(true);
        toast('Conectado ao Google Drive', 'success');
      } else {
        toast('Acesso negado ao Google Drive', 'error');
      }
    } catch {
      toast('Erro ao conectar ao Google Drive', 'error');
    }
    setGdriveLoading(false);
  }

  async function handleGoogleDriveBackup() {
    setGdriveLoading(true);
    haptic('medium');
    try {
      const blob = await backupDados();
      const fileName = `vistoria-backup-${dateStr()}.json`;
      const ok = await backupToGoogleDrive(blob, fileName);
      if (ok) {
        toast('Backup enviado ao Google Drive', 'success');
      } else {
        toast('Erro ao enviar backup', 'error');
      }
    } catch {
      toast('Erro ao enviar backup para Google Drive', 'error');
    }
    setGdriveLoading(false);
  }

  async function handleGoogleDriveList() {
    setGdriveLoading(true);
    haptic('medium');
    try {
      const files = await listGoogleDriveBackups();
      if (files.length === 0) {
        toast('Nenhum backup encontrado no Drive', 'info');
      } else {
        toast(`${files.length} backup(s) encontrado(s) no Drive`, 'success');
      }
    } catch {
      toast('Erro ao listar backups', 'error');
    }
    setGdriveLoading(false);
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  return (
    <main className="min-h-[100dvh] bg-base">
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((d) => ({ ...d, open: false }))}
      />
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={spring}
          className="flex items-center gap-3 mb-8"
        >
          <button
            onClick={onVoltar}
            aria-label="Voltar"
            className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <GearSix size={20} weight="duotone" className="text-accent" />
            <h1 className="text-xl font-semibold tracking-tight">Configuracoes</h1>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.1 }}>
          <Section title="Aparencia">
            <SettingRow label="Tema">
              <ToggleGroup
                value={theme}
                onChange={handleTema}
                options={[
                  { label: 'Escuro', value: 'dark', icon: <Moon size={12} /> },
                  { label: 'Claro', value: 'light', icon: <Sun size={12} /> },
                  { label: 'Auto', value: 'auto', icon: <CircleHalf size={12} /> },
                ]}
              />
            </SettingRow>
            <SettingRow label="Predio" description="Salvar e carregar configuracao dos blocos e apartamentos na nuvem">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="tactile-press flex items-center gap-1.5 bg-accent-dim border border-accent/30 rounded-lg px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
                  title="Salvar na nuvem"
                >
                  {savingConfig ? (
                    <ArrowClockwise size={14} weight="bold" className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Cloud size={14} weight="bold" aria-hidden="true" />
                  )}
                  Salvar
                </button>
                <button
                  onClick={handleLoadConfig}
                  disabled={loadingConfig}
                  className="tactile-press flex items-center gap-1.5 bg-base-overlay border border-base-border rounded-lg px-3 py-1.5 text-xs font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all disabled:opacity-30 disabled:pointer-events-none"
                  title="Carregar da nuvem"
                >
                  {loadingConfig ? (
                    <ArrowClockwise size={14} weight="bold" className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Database size={14} weight="bold" aria-hidden="true" />
                  )}
                  Carregar
                </button>
              </div>
            </SettingRow>
            {lastSaved && (
              <div className="px-4 py-2 text-center">
                <span className="text-[10px] text-content-tertiary">
                  Ultimo salvamento: {lastSaved}
                </span>
              </div>
            )}
          </Section>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 }}>
          <Section title="Captura">
            <SettingRow label="Qualidade da foto" description="Fotos maiores = mais detalhes, mais armazenamento">
              <ToggleGroup
                value={qualidade}
                onChange={handleQualidade}
                options={[
                  { label: '50%', value: '50' },
                  { label: '75%', value: '75' },
                  { label: '90%', value: '90' },
                  { label: '100%', value: '100' },
                ]}
              />
            </SettingRow>
            <SettingRow label="Modo escaneamento" description="Abrir camera automaticamente ao entrar no apto">
              <ToggleGroup
                value={String(scanDefault)}
                onChange={handleScanMode}
                options={[
                  { label: 'On', value: 'true', icon: <Camera size={12} /> },
                  { label: 'Off', value: 'false' },
                ]}
              />
            </SettingRow>
          </Section>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 }}>
          <Section title="Dados">
            <SettingRow label="Dias para alerta" description="Aptos sem foto ha mais de X dias aparecem como atrasados">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { haptic('light'); handleDiasAlerta(String(Math.max(1, dias - 1))); }}
                  className="w-8 h-8 rounded-lg bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary hover:text-content transition-colors"
                  aria-label="Diminuir"
                >
                  <ArrowDown size={14} weight="bold" />
                </button>
                <span className="w-8 text-center text-sm font-mono font-semibold tabular-nums">{dias}</span>
                <button
                  onClick={() => { haptic('light'); handleDiasAlerta(String(Math.min(90, dias + 1))); }}
                  className="w-8 h-8 rounded-lg bg-base-overlay border border-base-border flex items-center justify-center text-content-secondary hover:text-content transition-colors"
                  aria-label="Aumentar"
                >
                  <ArrowUp size={14} weight="bold" />
                </button>
              </div>
            </SettingRow>
            <SettingRow label="Itens por pagina" description="Quantidade de aptos exibidos na lista">
              <ToggleGroup
                value={String(itens)}
                onChange={handleItensPagina}
                options={[
                  { label: '10', value: '10' },
                  { label: '20', value: '20' },
                  { label: '50', value: '50' },
                  { label: 'Tudo', value: '999' },
                ]}
              />
            </SettingRow>
            <SettingRow label="Sincronizacao automatica" description="Envia fotos para a nuvem quando online">
              <ToggleGroup
                value={String(backupAuto)}
                onChange={handleBackupAuto}
                options={[
                  { label: 'Sim', value: 'true' },
                  { label: 'Nao', value: 'false' },
                ]}
              />
            </SettingRow>
            {!backupAuto && fotosPendentes > 0 && (
              <div className="mx-4 mb-3 p-3 rounded-xl bg-warn-dim border border-warn/30">
                <p className="text-xs text-warn font-medium">
                  {fotosPendentes} foto(s) pendente(s) de sincronizacao
                </p>
                <p className="text-[11px] text-warn/70 mt-1">
                  Ative a sincronizacao para enviar para a nuvem
                </p>
              </div>
            )}
            {backupAuto && (
              <SettingRow label="Intervalo do backup" description="Frequencia do backup automatico">
                <ToggleGroup
                  value={String(backupInt)}
                  onChange={handleBackupIntervalo}
                  options={[
                    { label: '30m', value: '30' },
                    { label: '1h', value: '60' },
                    { label: '6h', value: '360' },
                    { label: '24h', value: '1440' },
                  ]}
                />
              </SettingRow>
            )}
            <div className="px-4 py-3.5 space-y-2">
              <p className="text-xs text-content-tertiary mb-1">Opcoes de exportacao:</p>
              <button
                onClick={handleExportBackup}
                className="tactile-press w-full flex items-center justify-center gap-2 bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all"
              >
                <ArrowDown size={16} weight="bold" />
                Backup completo (JSON)
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleExportConfigCSV}
                  className="tactile-press flex-1 flex items-center justify-center gap-1.5 bg-base-overlay border border-base-border rounded-xl px-3 py-2.5 text-xs font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all"
                >
                  <FileCsv size={14} weight="bold" />
                  Config CSV
                </button>
                <button
                  onClick={handleExportConfigXLSX}
                  className="tactile-press flex-1 flex items-center justify-center gap-1.5 bg-base-overlay border border-base-border rounded-xl px-3 py-2.5 text-xs font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all"
                >
                  <FileXls size={14} weight="bold" />
                  Config XLSX
                </button>
                <button
                  onClick={handleExportFotos}
                  className="tactile-press flex-1 flex items-center justify-center gap-1.5 bg-base-overlay border border-base-border rounded-xl px-3 py-2.5 text-xs font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all"
                >
                  <Images size={14} weight="bold" />
                  Fotos JSON
                </button>
              </div>
            </div>
            <div className="px-4 py-3.5">
              <button
                onClick={handleImportBackup}
                className="tactile-press w-full flex items-center justify-center gap-2 bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all"
              >
                <ArrowUp size={16} weight="bold" />
                Importar (JSON / CSV / XLSX)
              </button>
            </div>
            <div className="px-4 py-3.5">
              <button
                onClick={() => { haptic('light'); setShowImportFotos(true); }}
                className="tactile-press w-full flex items-center justify-center gap-2 bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-sm font-medium text-accent hover:bg-accent/20 transition-all"
              >
                <Images size={16} weight="bold" />
                Importar fotos de pasta
              </button>
            </div>
            <div className="px-4 py-3.5">
              <button
                onClick={handleImportConcluidos}
                className="tactile-press w-full flex items-center justify-center gap-2 bg-success/10 border border-success/30 rounded-xl px-4 py-3 text-sm font-medium text-success hover:bg-success/20 transition-all"
              >
                <FileText size={16} weight="bold" />
                Importar lista de concluidos (.txt)
              </button>
            </div>
            <div className="px-4 py-3.5">
              <button
                onClick={handleExportarConcluidos}
                className="tactile-press w-full flex items-center justify-center gap-2 bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all"
              >
                <FileText size={16} weight="bold" />
                Exportar concluidos (.txt)
              </button>
            </div>

            {/* Google Drive */}
            <div className="px-4 py-2">
              <p className="text-xs text-content-tertiary font-medium uppercase tracking-wider">Google Drive</p>
            </div>
            <div className="px-4 py-3.5">
              {!gdriveConnected ? (
                <button
                  onClick={handleGoogleDriveConnect}
                  disabled={gdriveLoading}
                  className="tactile-press w-full flex items-center justify-center gap-2 bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-sm font-medium text-accent hover:bg-accent/20 disabled:opacity-40 transition-all"
                >
                  <Cloud size={16} weight="bold" />
                  {gdriveLoading ? 'Conectando...' : 'Conectar ao Google Drive'}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/30 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-xs font-medium text-success">Conectado ao Google Drive</span>
                  </div>
                  <button
                    onClick={handleGoogleDriveBackup}
                    disabled={gdriveLoading}
                    className="tactile-press w-full flex items-center justify-center gap-2 bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 disabled:opacity-40 transition-all"
                  >
                    <ArrowDown size={16} weight="bold" />
                    {gdriveLoading ? 'Enviando...' : 'Backup no Google Drive'}
                  </button>
                  <button
                    onClick={handleGoogleDriveList}
                    disabled={gdriveLoading}
                    className="tactile-press w-full flex items-center justify-center gap-2 bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 disabled:opacity-40 transition-all"
                  >
                    <Folder size={16} weight="bold" />
                    {gdriveLoading ? 'Listando...' : 'Listar backups no Drive'}
                  </button>
                </div>
              )}
            </div>

            {/* Danger Zone — Admin only */}
            {isAdmin && (
              <>
                <div className="px-4 pt-4 pb-1">
                  <div className="flex items-center gap-2 border-t border-danger/20 pt-4">
                    <Warning size={16} className="text-danger" weight="fill" />
                    <h3 className="text-sm font-bold text-danger uppercase tracking-wider">Danger Zone</h3>
                  </div>
                  <p className="text-xs text-content-tertiary mt-1">Acoes irreversiveis. Apenas administradores.</p>
                </div>
                <div className="px-4 py-2">
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        open: true,
                        title: 'Limpar lista de concluidos?',
                        message: 'Tem certeza? Os apartamentos marcados como concluidos serao desmarcados.',
                        variant: 'warning',
                        onConfirm: () => {
                          setConfirmDialog({
                            open: true,
                            title: 'Confirmar limpeza?',
                            message: 'Esta acao nao pode ser desfeita. Confirma?',
                            variant: 'danger',
                            onConfirm: async () => {
                              setConfirmDialog((d) => ({ ...d, open: false }));
                              haptic('heavy');
                              await handleLimparConcluidos();
                            },
                          });
                        },
                      });
                    }}
                    className="tactile-press w-full flex items-center justify-center gap-2 bg-warn/10 border border-warn/30 rounded-xl px-4 py-3 text-xs font-medium text-warn hover:bg-warn/20 transition-all"
                  >
                    Limpar lista de concluidos
                  </button>
                </div>
                <div className="px-4 py-2">
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        open: true,
                        title: 'Limpar fotos locais?',
                        message: 'Todas as fotos salvas no celular serao removidas. As fotos ja enviadas nao serao afetadas.',
                        variant: 'warning',
                        onConfirm: () => {
                          setConfirmDialog({
                            open: true,
                            title: 'Confirmar limpeza de fotos?',
                            message: 'Esta acao nao pode ser desfeita. Confirma?',
                            variant: 'danger',
                            onConfirm: async () => {
                              setConfirmDialog((d) => ({ ...d, open: false }));
                              haptic('heavy');
                              await handleClearLocalPhotos();
                            },
                          });
                        },
                      });
                    }}
                    disabled={clearing}
                    className="tactile-press w-full flex items-center justify-center gap-2 bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-sm font-medium text-danger hover:bg-danger/20 disabled:opacity-40 transition-all"
                  >
                    <Trash size={16} weight="bold" />
                    {clearing ? 'Limpando...' : 'Limpar fotos locais'}
                  </button>
                </div>
                <div className="px-4 py-2 pb-4">
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        open: true,
                        title: 'Excluir TODOS os dados?',
                        message: 'Fotos, configuracoes e historico serao perdidos. Esta acao nao pode ser desfeita.',
                        variant: 'danger',
                        onConfirm: () => {
                          setConfirmDialog({
                            open: true,
                            title: 'Tem certeza absoluta?',
                            message: 'Nao sera possivel recuperar os dados. Confirma a exclusao?',
                            variant: 'danger',
                            onConfirm: async () => {
                              setConfirmDialog((d) => ({ ...d, open: false }));
                              haptic('heavy');
                              await handleClearAll();
                            },
                          });
                        },
                      });
                    }}
                    disabled={clearing}
                    className="tactile-press w-full flex items-center justify-center gap-2 bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-sm font-medium text-danger hover:bg-danger/20 disabled:opacity-40 transition-all"
                  >
                    <Warning size={16} weight="bold" />
                    {clearing ? 'Limpando...' : 'Limpar tudo'}
                  </button>
                </div>
              </>
            )}
          </Section>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.25 }}>
          <Section title="Sobre">
            <SettingRow label="Versao" description={`Vistoria Cyble v${APP_VERSION}`}>
              <Info size={16} className="text-content-tertiary" />
            </SettingRow>
            {onNavigate && (
              <SettingRow label="Status do Sistema" description="Verificar status da conexao, banco de dados e fila de sync">
                <button
                  onClick={() => { haptic('light'); onNavigate('status'); }}
                  className="tactile-press bg-accent-dim border border-accent/30 rounded-lg px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all"
                >
                  Ver Status
                </button>
              </SettingRow>
            )}
            {espaco && (
              <SettingRow label="Armazenamento" description={`${formatBytes(espaco.usado)} de ${formatBytes(espaco.total)} (${espaco.pct}%)`}>
                <div className="w-16 h-2 bg-base-overlay rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      espaco.pct > 85 ? 'bg-danger' : espaco.pct > 60 ? 'bg-warn' : 'bg-success'
                    }`}
                    style={{ width: `${Math.min(100, espaco.pct)}%` }}
                  />
                </div>
              </SettingRow>
            )}
            <div className="px-4 py-3.5">
              <a
                href="https://github.com/Henrique1601/Vistoria-Cyble-App"
                target="_blank"
                rel="noopener noreferrer"
                className="tactile-press w-full flex items-center justify-center gap-2 bg-base-overlay border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 transition-all"
              >
                <GithubLogo size={16} weight="bold" />
                Ver no GitHub
              </a>
            </div>
          </Section>
        </motion.div>
      </div>
      {showImportFotos && (
        <ImportarFotosModal
          onFechar={() => setShowImportFotos(false)}
          onImportado={() => { toast('Fotos importadas com sucesso', 'success'); setShowImportFotos(false); }}
        />
      )}
    </main>
  );
}
