'use client';

import { Buildings, FileCsv, FilePdf, ShareNetwork, Download, ChartBar, Code, Calendar, FunnelSimple, FileJs, PaintBrush, CheckCircle } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { spring } from '@/lib/motion';
import type { ApartamentoStatus } from '@/lib/db';
import { statusApto } from '@/lib/export/utils';
import PeriodReport from '@/components/PeriodReport';
import type { FotoRecord } from '@/lib/db';

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
  apenasPendentes?: boolean;
  onToggleApenasPendentes?: () => void;
  onExportCSV: (status: ApartamentoStatus[]) => void;
  onExportPDF: (status: ApartamentoStatus[]) => void;
  onExportXLSX: (status: ApartamentoStatus[]) => void;
  onCompartilharPDF: (status: ApartamentoStatus[]) => void;
  onCompartilharXLSX: (status: ApartamentoStatus[]) => void;
  onExportZIP: (status: ApartamentoStatus[]) => void;
  onRelatorioPDFComFotos: (status: ApartamentoStatus[]) => void;
  onExportHTML: (status: ApartamentoStatus[]) => void;
  onExportJSON: (status: ApartamentoStatus[]) => void;
  onShareReport: (status: ApartamentoStatus[]) => Promise<void>;
  compartilhando: 'pdf' | 'xlsx' | 'report' | null;
  exportandoZIP: boolean;
  exportandoFotos: boolean;
  showPDFOptions?: boolean;
  onTogglePDFOptions?: () => void;
  pdfAccentColor?: [number, number, number];
  onPDFColorChange?: (color: [number, number, number]) => void;
  fotos?: FotoRecord[];
  onMarcarDocsOK?: (bloco: string) => void;
  pin?: string;
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
  apenasPendentes = false,
  onToggleApenasPendentes,
  onExportCSV,
  onExportPDF,
  onExportXLSX,
  onCompartilharPDF,
  onCompartilharXLSX,
  onExportZIP,
  onRelatorioPDFComFotos,
  onExportHTML,
  onExportJSON,
  onShareReport,
  compartilhando,
  exportandoZIP,
  exportandoFotos,
  showPDFOptions = false,
  onTogglePDFOptions,
  pdfAccentColor = [232, 130, 58],
  onPDFColorChange,
  fotos = [],
  onMarcarDocsOK,
  pin = '',
}: ExportSectionProps) {
  const effectiveStatus = apenasPendentes
    ? statusExportacao.filter((s) => statusApto(s) !== 'Concluido')
    : statusExportacao;
  const disabled = effectiveStatus.length === 0;

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
          {onToggleApenasPendentes && (
            <button
              onClick={onToggleApenasPendentes}
              className={`tactile-press px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ml-auto ${
                apenasPendentes
                  ? 'bg-danger-dim border-danger text-danger'
                  : 'bg-base-raised border-base-border text-content-tertiary hover:text-content'
              }`}
            >
              <FunnelSimple size={11} weight="bold" className="inline mr-1 -mt-0.5" />
              Pendentes
            </button>
          )}
        </div>
      </div>

      {(dataInicio || dataFim) && (
        <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg">
          <Calendar size={12} weight="bold" className="text-accent" />
          <span className="text-[11px] text-accent font-medium">
            Periodo: {dataInicio || '...'} ate {dataFim || '...'}
          </span>
          <span className="text-[10px] text-accent/60 ml-1">
            ({effectiveStatus.length} aptos)
          </span>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex gap-3">
          <button
            onClick={() => onExportCSV(effectiveStatus)}
            disabled={disabled}
            aria-label="Exportar dados em CSV"
            className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <FileCsv size={16} weight="bold" aria-hidden="true" />
            CSV
          </button>
          <button
            onClick={() => onExportPDF(effectiveStatus)}
            disabled={disabled}
            aria-label="Baixar relatorio em PDF"
            className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <FilePdf size={16} weight="bold" aria-hidden="true" />
            PDF
          </button>
          <button
            onClick={() => onExportXLSX(effectiveStatus)}
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
            onClick={() => onCompartilharPDF(effectiveStatus)}
            disabled={disabled || compartilhando !== null}
            aria-label="Compartilhar relatorio PDF"
            className="tactile-press flex-1 flex items-center justify-center gap-2 bg-accent-dim border border-accent/30 rounded-xl px-4 py-3 text-sm font-medium text-accent hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <ShareNetwork size={16} weight="bold" aria-hidden="true" />
            {compartilhando === 'pdf' ? 'Compartilhando\u2026' : 'Compartilhar PDF'}
          </button>
          <button
            onClick={() => onCompartilharXLSX(effectiveStatus)}
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
            onClick={() => onExportZIP(effectiveStatus)}
            disabled={disabled || exportandoZIP}
            aria-label="Baixar fotos como ZIP"
            className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <Download size={16} weight="bold" aria-hidden="true" />
            {exportandoZIP ? 'Compactando\u2026' : 'Fotos ZIP'}
          </button>
          <button
            onClick={() => onRelatorioPDFComFotos(effectiveStatus)}
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
            onClick={() => onExportHTML(effectiveStatus)}
            disabled={disabled}
            aria-label="Baixar relatorio HTML interativo"
            className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <Code size={16} weight="bold" aria-hidden="true" />
            HTML
          </button>
          <button
            onClick={() => onExportJSON(effectiveStatus)}
            disabled={disabled}
            aria-label="Exportar dados em JSON"
            className="tactile-press flex-1 flex items-center justify-center gap-2 bg-base-raised border border-base-border rounded-xl px-4 py-3 text-sm font-medium text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <FileJs size={16} weight="bold" aria-hidden="true" />
            JSON
          </button>
          <button
            onClick={() => onShareReport(effectiveStatus)}
            disabled={disabled || compartilhando !== null}
            aria-label="Compartilhar relatorio como link"
            className="tactile-press flex-1 flex items-center justify-center gap-2 bg-accent-dim border border-accent/30 rounded-xl px-4 py-3 text-sm font-medium text-accent hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <ShareNetwork size={16} weight="bold" aria-hidden="true" />
            {compartilhando === 'report' ? 'Gerando link\u2026' : 'Compartilhar Link'}
          </button>
        </div>

        {/* PDF Customization */}
        {onTogglePDFOptions && (
          <div className="mt-2">
            <button
              onClick={onTogglePDFOptions}
              className="tactile-press flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
            >
              <PaintBrush size={12} weight="bold" aria-hidden="true" />
              {showPDFOptions ? 'Ocultar opcoes PDF' : 'Personalizar PDF'}
            </button>
            {showPDFOptions && onPDFColorChange && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-2 p-3 bg-base-raised border border-base-border rounded-xl space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-content-tertiary">Cor de destaque:</span>
                  <div className="flex gap-1.5">
                    {[
                      { color: [232, 130, 58] as [number, number, number], label: 'Laranja' },
                      { color: [52, 211, 153] as [number, number, number], label: 'Verde' },
                      { color: [96, 165, 250] as [number, number, number], label: 'Azul' },
                      { color: [244, 114, 182] as [number, number, number], label: 'Rosa' },
                      { color: [167, 139, 250] as [number, number, number], label: 'Roxo' },
                    ].map(({ color, label }) => (
                      <button
                        key={label}
                        onClick={() => onPDFColorChange(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          JSON.stringify(pdfAccentColor) === JSON.stringify(color) ? 'border-white scale-110' : 'border-base-border'
                        }`}
                        style={{ backgroundColor: `rgb(${color.join(',')})` }}
                        title={label}
                        aria-label={`Cor ${label}`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Relatório por Período */}
      <div className="mt-3">
        <PeriodReport fotos={fotos} onExport={() => {}} pin={pin} />
      </div>

      {/* Marcar todos docs como OK */}
      {onMarcarDocsOK && torresExportacao.size > 0 && (
        <div className="mt-2">
          <button
            onClick={() => { for (const t of torresExportacao) onMarcarDocsOK(t); }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-colors w-full"
          >
            <CheckCircle size={20} />
            <span className="text-sm font-semibold">Marcar docs como OK ({torresExportacao.size} torre{torresExportacao.size > 1 ? 's' : ''})</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}
