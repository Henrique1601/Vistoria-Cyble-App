'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, FileText } from '@phosphor-icons/react';
import type { FotoRecord } from '@/lib/db';
import { statusApto } from '@/lib/export/utils';
import { normalizeBloco, normApto } from '@/lib/utils';
import { spring } from '@/lib/motion';
import { exportarPDF } from '@/lib/export/pdf';

interface PeriodReportProps {
  fotos: FotoRecord[];
  onExport: () => void;
  pin: string;
}

export default function PeriodReport({ fotos, onExport, pin }: PeriodReportProps) {
  const [show, setShow] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const stats = useMemo(() => {
    if (!dataInicio || !dataFim) return null;

    const inicio = new Date(dataInicio).getTime();
    const fim = new Date(dataFim + 'T23:59:59').getTime();

    const fotosPeriodo = fotos.filter((f) => f.timestamp >= inicio && f.timestamp <= fim);
    const aptosUnicos = new Set(fotosPeriodo.map((f) => `${normalizeBloco(f.bloco)}-${normApto(f.apartamento)}`));
    const blocos = new Set(fotosPeriodo.map((f) => normalizeBloco(f.bloco)));

    const categorias: Record<string, number> = {};
    for (const f of fotosPeriodo) {
      categorias[f.categoria] = (categorias[f.categoria] || 0) + 1;
    }

    const statusMap: Record<string, number> = { Concluido: 0, 'Em andamento': 0, Pendente: 0 };
    for (const key of aptosUnicos) {
      const [bloco, apto] = key.split('-');
      const fotosApto = fotosPeriodo.filter((f) => normalizeBloco(f.bloco) === bloco && normApto(f.apartamento) === apto);
      const st = statusApto({
        bloco, apartamento: apto,
        cybleAntesFeito: fotosApto.some((f) => f.categoria === 'cyble_antes'),
        cybleDepoisFeito: fotosApto.some((f) => f.categoria === 'cyble_depois'),
        qtdDocumentos: fotosApto.filter((f) => f.categoria === 'documento').length,
        qtdFotos: fotosApto.length,
      });
      statusMap[st] = (statusMap[st] || 0) + 1;
    }

    return {
      totalFotos: fotosPeriodo.length,
      totalAptos: aptosUnicos.size,
      totalBlocos: blocos.size,
      categorias,
      statusMap,
      periodo: `${new Date(dataInicio).toLocaleDateString('pt-BR')} — ${new Date(dataFim).toLocaleDateString('pt-BR')}`,
    };
  }, [fotos, dataInicio, dataFim]);

  const handleExportPDF = async () => {
    if (!dataInicio || !dataFim) return;

    const inicio = new Date(dataInicio).getTime();
    const fim = new Date(dataFim + 'T23:59:59').getTime();
    const fotosPeriodo = fotos.filter((f) => f.timestamp >= inicio && f.timestamp <= fim);
    const aptosUnicos = new Set(fotosPeriodo.map((f) => `${normalizeBloco(f.bloco)}-${normApto(f.apartamento)}`));

    const aptosStatus = Array.from(aptosUnicos).map((key) => {
      const [b, a] = key.split('-');
      const fotosApto = fotosPeriodo.filter((f) => normalizeBloco(f.bloco) === b && normApto(f.apartamento) === a);
      return {
        bloco: b,
        apartamento: a,
        cybleAntesFeito: fotosApto.some((f) => f.categoria === 'cyble_antes'),
        cybleDepoisFeito: fotosApto.some((f) => f.categoria === 'cyble_depois'),
        qtdDocumentos: fotosApto.filter((f) => f.categoria === 'documento').length,
        qtdFotos: fotosApto.length,
      };
    });

    const periodo = `${new Date(dataInicio).toLocaleDateString('pt-BR')} — ${new Date(dataFim).toLocaleDateString('pt-BR')}`;
    await exportarPDF(
      aptosStatus,
      `Relatório ${periodo}`,
      { titulo: `Relatório por Período`, subtitulo: periodo, showTimestamp: true }
    );
    onExport();
  };

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition-colors w-full"
      >
        <Calendar size={20} />
        <span className="text-sm font-semibold">Relatório por Período</span>
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShow(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={spring}
              className="glass rounded-2xl p-5 w-full max-w-md space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-content">Relatório por Período</h2>
                <button onClick={() => setShow(false)} className="p-1 rounded-full hover:bg-base-surface">
                  <X size={20} className="text-content-tertiary" />
                </button>
              </div>

              <div className="flex gap-3">
                <label className="flex-1 space-y-1">
                  <span className="text-xs text-content-secondary">Data Início</span>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-base-surface border border-base-border text-content text-sm"
                  />
                </label>
                <label className="flex-1 space-y-1">
                  <span className="text-xs text-content-secondary">Data Fim</span>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-base-surface border border-base-border text-content text-sm"
                  />
                </label>
              </div>

              {stats && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-base-surface">
                      <div className="text-lg font-bold text-accent">{stats.totalFotos}</div>
                      <div className="text-[10px] text-content-tertiary">Fotos</div>
                    </div>
                    <div className="p-2 rounded-lg bg-base-surface">
                      <div className="text-lg font-bold text-success">{stats.totalAptos}</div>
                      <div className="text-[10px] text-content-tertiary">Apartamentos</div>
                    </div>
                    <div className="p-2 rounded-lg bg-base-surface">
                      <div className="text-lg font-bold text-warn">{stats.totalBlocos}</div>
                      <div className="text-[10px] text-content-tertiary">Torres</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-base-surface space-y-2">
                    <div className="text-xs font-semibold text-content-secondary">Por Status</div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-success">{stats.statusMap['Concluido'] || 0} Concluídos</span>
                      <span className="text-warn">{stats.statusMap['Em andamento'] || 0} Em andamento</span>
                      <span className="text-danger">{stats.statusMap['Pendente'] || 0} Pendentes</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-base-surface space-y-2">
                    <div className="text-xs font-semibold text-content-secondary">Por Categoria</div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {Object.entries(stats.categorias).map(([cat, count]) => (
                        <span key={cat} className="px-2 py-1 rounded-full bg-base-tertiary/50 text-content-secondary">
                          {cat.replace(/_/g, ' ')}: {count}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleExportPDF}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-white font-semibold hover:opacity-90 transition-opacity"
                  >
                    <FileText size={18} />
                    Exportar PDF
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
