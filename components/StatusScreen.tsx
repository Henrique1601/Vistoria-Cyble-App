'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CloudCheck,
  CloudSlash,
  Database,
  HardDrive,
  Gear,
  Clock,
  CheckCircle,
  Warning,
  Info,
  ArrowClockwise,
} from '@phosphor-icons/react';
import { spring } from '@/lib/motion';
import { haptic } from '@/lib/haptic';
import { getQueueStats } from '@/lib/syncQueue';
import { authFetch } from '@/lib/api';
import { APP_VERSION } from '@/lib/version';

interface StatusScreenProps {
  onVoltar: () => void;
  online: boolean;
  pendentes: number;
  userRole: 'admin' | 'viewer' | null;
}

interface TowerStatus {
  bloco: string;
  total: number;
  concluidos: number;
  percentual: number;
}

interface SystemStatus {
  towers: TowerStatus[];
  totalFotos: number;
  lastUpdate: number;
  apiLatency: number;
}

export default function StatusScreen({ onVoltar, online, pendentes, userRole }: StatusScreenProps) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStats, setSyncStats] = useState({ total: 0, pending: 0, success: 0, failed: 0 });
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<{ used: number; quota: number } | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const res = await authFetch('/api/status');
      const data = await res.json();
      const latency = Date.now() - start;
      setDbLatency(latency);

      if (data.status) {
        const towers: TowerStatus[] = Object.entries(data.status).map(([bloco, s]: [string, any]) => ({
          bloco,
          total: s.total,
          concluidos: s.concluidos,
          percentual: s.percentual,
        }));
        towers.sort((a, b) => a.bloco.localeCompare(b.bloco));
        const totalFotos = towers.reduce((acc, t) => acc + t.total, 0);
        setStatus({ towers, totalFotos, lastUpdate: data.lastUpdate, apiLatency: latency });
      }
    } catch {
      setDbLatency(null);
    }
    setSyncStats(getQueueStats());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((est) => {
        setStorageEstimate({ used: est.usage || 0, quota: est.quota || 0 });
      });
    }
  }, [fetchStatus]);

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  function formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  const totalConcluidos = status?.towers.reduce((acc, t) => acc + t.concluidos, 0) || 0;
  const totalAptos = status?.towers.reduce((acc, t) => acc + t.total, 0) || 0;
  const percentualGeral = totalAptos > 0 ? Math.round((totalConcluidos / totalAptos) * 100) : 0;

  return (
    <main className="min-h-[100dvh] bg-base">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={spring}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => { haptic('light'); onVoltar(); }}
            aria-label="Voltar"
            className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">Status do Sistema</h1>
            <p className="text-xs text-content-tertiary">Informacoes em tempo real</p>
          </div>
          <button
            onClick={() => { haptic('light'); fetchStatus(); }}
            aria-label="Atualizar"
            className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <ArrowClockwise size={18} weight="bold" aria-hidden="true" />
          </button>
        </motion.div>

        {/* Connection Status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className={`rounded-2xl border p-4 mb-4 flex items-center gap-3 ${
            online
              ? 'bg-success/5 border-success/20 text-success'
              : 'bg-danger/5 border-danger/20 text-danger'
          }`}
        >
          {online ? <CloudCheck size={24} weight="bold" /> : <CloudSlash size={24} weight="bold" />}
          <div>
            <p className="font-semibold text-sm">{online ? 'Online' : 'Offline'}</p>
            <p className="text-xs opacity-70">
              {online ? 'Conectado ao servidor' : 'Funcionando sem conexao'}
              {pendentes > 0 && ` · ${pendentes} pendente${pendentes > 1 ? 's' : ''}`}
            </p>
          </div>
        </motion.div>

        {/* Cards Row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            className="bg-base-raised border border-base-border rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Database size={16} weight="bold" className="text-accent" />
              <span className="text-xs font-medium text-content-tertiary">Banco de Dados</span>
            </div>
            <p className="text-lg font-bold text-content">
              {dbLatency !== null ? `${dbLatency}ms` : '---'}
            </p>
            <p className="text-[10px] text-content-tertiary">Latencia da API</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.15 }}
            className="bg-base-raised border border-base-border rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <HardDrive size={16} weight="bold" className="text-accent" />
              <span className="text-xs font-medium text-content-tertiary">Armazenamento</span>
            </div>
            <p className="text-lg font-bold text-content">
              {storageEstimate ? formatBytes(storageEstimate.used) : '---'}
            </p>
            <p className="text-[10px] text-content-tertiary">
              {storageEstimate ? `de ${formatBytes(storageEstimate.quota)}` : 'Indisponivel'}
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 }}
            className="bg-base-raised border border-base-border rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Gear size={16} weight="bold" className="text-accent" />
              <span className="text-xs font-medium text-content-tertiary">Versao</span>
            </div>
            <p className="text-lg font-bold text-content">v{APP_VERSION}</p>
            <p className="text-[10px] text-content-tertiary">Vistoria Cyble App</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.25 }}
            className="bg-base-raised border border-base-border rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Info size={16} weight="bold" className="text-accent" />
              <span className="text-xs font-medium text-content-tertiary">Acesso</span>
            </div>
            <p className="text-lg font-bold text-content capitalize">{userRole || '---'}</p>
            <p className="text-[10px] text-content-tertiary">Nivel de permissao</p>
          </motion.div>
        </div>

        {/* Sync Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.3 }}
          className="bg-base-raised border border-base-border rounded-2xl p-4 mb-4"
        >
          <h3 className="text-sm font-semibold text-content mb-3">Fila de Sincronizacao</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-content">{syncStats.pending}</p>
              <p className="text-[10px] text-content-tertiary">Pendentes</p>
            </div>
            <div>
              <p className="text-lg font-bold text-success">{syncStats.success}</p>
              <p className="text-[10px] text-content-tertiary">Sincronizados</p>
            </div>
            <div>
              <p className="text-lg font-bold text-danger">{syncStats.failed}</p>
              <p className="text-[10px] text-content-tertiary">Falhas</p>
            </div>
          </div>
        </motion.div>

        {/* Overall Progress */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.35 }}
          className="bg-base-raised border border-base-border rounded-2xl p-4 mb-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-content">Progresso Geral</h3>
            <span className="text-xs font-mono text-accent">{percentualGeral}%</span>
          </div>
          <div className="w-full h-2 bg-base-overlay rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentualGeral}%` }}
              transition={{ ...spring, delay: 0.4 }}
              className="h-full bg-accent rounded-full"
            />
          </div>
          <p className="text-[10px] text-content-tertiary">
            {totalConcluidos} de {totalAptos} apartamentos concluidos
          </p>
        </motion.div>

        {/* Tower Status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.4 }}
          className="bg-base-raised border border-base-border rounded-2xl overflow-hidden mb-4"
        >
          <h3 className="text-sm font-semibold text-content p-4 pb-2">Por Torre</h3>
          <div className="divide-y divide-base-border">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div className="skeleton-resolve w-16 h-4 rounded-md" />
                  <div className="skeleton-resolve w-12 h-4 rounded-md" />
                </div>
              ))
            ) : status?.towers.map((t) => (
              <div key={t.bloco} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-content">{t.bloco}</span>
                  <span className="text-[10px] text-content-tertiary">
                    {t.concluidos}/{t.total}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-base-overlay rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${t.percentual}%`,
                        backgroundColor: t.percentual === 100 ? 'var(--color-success)' : 'var(--color-accent)',
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-content-tertiary w-8 text-right">
                    {t.percentual}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Last Update */}
        {status?.lastUpdate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-1.5 text-content-tertiary"
          >
            <Clock size={12} weight="bold" />
            <span className="text-[10px]">Atualizado em {formatTimestamp(status.lastUpdate)}</span>
          </motion.div>
        )}
      </div>
    </main>
  );
}
