'use client';

import { Buildings, FileCsv, FilePdf, ShareNetwork, Download, ChartBar, Code, Calendar } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { spring } from '@/lib/motion';
import type { ApartamentoStatus } from '@/lib/db';

interface ExportSectionProps {
  blocos: string[];
  torresExportacao: Set<string>;
  onTorresChange: (updater: (prev: Set<string>) => Set<string>) => void;
  statusExportacao: ApartamentoStatus[];
  showEstatisticas: boolean;
  showEstatisticasTorre: boolean;
  onToggleEstatisticas: () => void;
  onToggleEstatisticasTorre: () => void;
  dataInicio?: string;
  dataFim?: string;
  onExportCSV: (status: ApartamentoStatus[]) => void;
  onExportPDF: (status: ApartamentoStatus[]) => void;
  onExportXLSX: (status: ApartamentoStatus[]) => void;
  onCompartilharPDF: (status: ApartamentoStatus[]) => void;
  onCompartilharXLSX: (status: ApartamentoStatus[]) => void;
  onExportZIP: (status: ApartamentoStatus[]) => void;
  onRelatorioPDFComFotos: (status: ApartamentoStatus[]) => void;
  onExportHTML: (status: ApartamentoStatus[]) => void;
  compartilhando: 'pdf' | 'xlsx' | null;
  exportandoZIP: boolean;
  exportandoFotos: boolean;
}

export function ExportSection({
  blocos,
  torresExportacao,
  onTorresChange,
  statusExportacao,
  showEstatisticas,
  showEstatisticasTorre,
  onToggleEstatisticas,
  onToggleEstatisticasTorre,
  dataInicio,
  dataFim,
  onExportCSV,
  onExportPDF,
  onExportXLSX,
  onCompartilharPDF,
  onCompartilharXLSX,
  onExportZIP,
  onRelatorioPDFComFotos,
  onExportHTML,
  compartilhando,
  exportandoZIP,
  exportandoFotos,
}: ExportSectionProps) {
  const disabled = statusExportacao.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.4 }}
      className="mb-4"
    >
      <div className="mb-3">
        <div className="flex gap-3">
          <button
            onClick={onToggleEstatisticas}
            className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <ChartBar size={13} weight="bold" aria-hidden="true" />
            {showEstatisticas ? 'Ocultar periodo' : 'Periodo'}
          </button>
          <button
            onClick={onToggleEstatisticasTorre}
            className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
          >
            <Buildings size={13} weight="bold" aria-hidden="true" />
            {showEstatisticasTorre ? 'Ocultar torres' : 'Por torre'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onTorresChange(() => new Set())}
            className={`tactile-press px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
              torresExportacao.size === 0
                ? 'bg-accent-dim border-accent text-accent'
                : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
            }`}
          >
            Todas
          </button>
          {blocos.map((b) => (
            <button
              key={b}
              onClick={() => {
                onTorresChange((prev) => {
                  const next = new Set(prev);
                  if (next.has(b)) next.delete(b); else next.add(b);
                  return next;
                });
              }}
              className={`tactile-press px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                torresExportacao.has(b)
                  ? 'bg-accent-dim border-accent text-accent'
                  : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {(dataInicio || dataFim) && (
        <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg">
          <Calendar size={12} weight="bold" className="text-accent" />
          <span className="text-[11px] text-accent font-medium">
            Periodo: {dataInicio || '...'} ate {dataFim || '...'}
          </span>
          <span className="text-[10px] text-accent/60 ml-1">
            ({statusExportacao.length} aptos)
          </span>
        </div>
      )}

      <div className="flex gap-3 mb-3">
        <button
          onClick={() => onExportCSV(statusExportacao)}
          disabled={disabled}
          aria-label="Exportar dados em CSV"
          className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <FileCsv size={16} weight="bold" aria-hidden="true" />
          CSV
        </button>
        <button
          onClick={() => onExportPDF(statusExportacao)}
          disabled={disabled}
          aria-label="Baixar relatorio em PDF"
          className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <FilePdf size={16} weight="bold" aria-hidden="true" />
          PDF
        </button>
        <button
          onClick={() => onExportXLSX(statusExportacao)}
          disabled={disabled}
          aria-label="Baixar planilha Excel XLSX"
          className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <FileCsv size={16} weight="bold" aria-hidden="true" />
          XLSX
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onCompartilharPDF(statusExportacao)}
          disabled={disabled || compartilhando !== null}
          aria-label="Compartilhar relatorio PDF"
          className="tactile-press flex-1 flex items-center justify-center gap-2 bg-accent-dim border border-accent/30 rounded-xl px-4 py-3 text-sm font-medium text-accent hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <ShareNetwork size={16} weight="bold" aria-hidden="true" />
          {compartilhando === 'pdf' ? 'Compartilhando\u2026' : 'Compartilhar PDF'}
        </button>
        <button
          onClick={() => onCompartilharXLSX(statusExportacao)}
          disabled={disabled || compartilhando !== null}
          aria-label="Compartilhar planilha XLSX"
          className="tactile-press flex-1 flex items-center justify-center gap-2 bg-accent-dim border border-accent/30 rounded-xl px-4 py-3 text-sm font-medium text-accent hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <ShareNetwork size={16} weight="bold" aria-hidden="true" />
          {compartilhando === 'xlsx' ? 'Compartilhando\u2026' : 'Compartilhar XLSX'}
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onExportZIP(statusExportacao)}
          disabled={disabled || exportandoZIP}
          aria-label="Baixar fotos como ZIP"
          className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <Download size={16} weight="bold" aria-hidden="true" />
          {exportandoZIP ? 'Compactando\u2026' : 'Fotos ZIP'}
        </button>
        <button
          onClick={() => onRelatorioPDFComFotos(statusExportacao)}
          disabled={disabled || exportandoFotos}
          aria-label="Baixar relatorio com fotos em PDF"
          className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <FilePdf size={16} weight="bold" aria-hidden="true" />
          {exportandoFotos ? 'Gerando\u2026' : 'PDF + Fotos'}
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onExportHTML(statusExportacao)}
          disabled={disabled}
          aria-label="Baixar relatorio HTML interativo"
          className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <Code size={16} weight="bold" aria-hidden="true" />
          HTML
        </button>
      </div>
    </motion.div>
  );
}
