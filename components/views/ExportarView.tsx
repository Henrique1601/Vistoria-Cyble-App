'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Download } from '@phosphor-icons/react';
import dynamic from 'next/dynamic';
import BottomNav from '@/components/BottomNav';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/api';
import { logAudit } from '@/lib/auditLog';
import { fotosMapKey, normalizeBloco } from '@/lib/utils';
import { ApartamentoStatus, FotoRecord, obterTodasFotos, marcarTodosDocsOK, desmarcarSincronizada, ultimasFotos } from '@/lib/db';
import { FotoOnline, EstatisticasPeriodo } from '@/components/EstatisticasPeriodo';
import { EstatisticasPorTorre } from '@/components/EstatisticasPorTorre';

const ExportSection = dynamic(
  () => import('@/components/ExportSection').then((m) => ({ default: m.ExportSection })),
  { ssr: false, loading: () => <div className="h-32 bg-base-raised rounded-2xl animate-pulse" /> }
);

const loadExport = () => import('@/lib/export');
const loadExportJSON = () => import('@/lib/export/json');

interface ExportarViewProps {
  blocos: string[];
  statusMerged: ApartamentoStatus[];
  status: ApartamentoStatus[];
  fotosOnline: FotoOnline[];
  lista: Record<string, string[]> | null;
  pin: string;
  onVoltar: () => void;
  onNavigate: (v: string) => void;
  onFotosRecentesUpdate: (fotos: FotoRecord[]) => void;
}

export function ExportarView({
  blocos,
  statusMerged,
  status,
  fotosOnline,
  lista,
  pin,
  onVoltar,
  onNavigate,
  onFotosRecentesUpdate,
}: ExportarViewProps) {
  const { toast } = useToast();
  const [torresExportacao, setTorresExportacao] = useState<Set<string>>(new Set());
  const [showEstatisticas, setShowEstatisticas] = useState(false);
  const [showEstatisticasTorre, setShowEstatisticasTorre] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [apenasPendentes, setApenasPendentes] = useState(false);
  const [compartilhando, setCompartilhando] = useState<'pdf' | 'xlsx' | 'report' | null>(null);
  const [exportandoZIP, setExportandoZIP] = useState(false);
  const [exportandoFotos, setExportandoFotos] = useState(false);
  const [showPDFOptions, setShowPDFOptions] = useState(false);
  const [pdfAccentColor, setPDFAccentColor] = useState<[number, number, number]>([232, 130, 58]);
  const [allFotos, setAllFotos] = useState<FotoRecord[]>([]);

  useEffect(() => {
    obterTodasFotos().then(setAllFotos);
  }, []);

  const statusExportacao = torresExportacao.size === 0
    ? statusMerged
    : statusMerged.filter((s) => torresExportacao.has(s.bloco));

  return (
    <>
      <main className="min-h-dvh bg-base pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-base-border">
            <button
              onClick={onVoltar}
              className="tactile-press w-10 h-10 rounded-xl bg-base-raised border border-base-border flex items-center justify-center text-content-secondary hover:text-content hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} weight="bold" />
            </button>
            <div className="flex items-center gap-2">
              <Download size={20} weight="duotone" className="text-accent" />
              <h1 className="text-xl font-semibold tracking-tight">Exportar</h1>
            </div>
          </div>

          <div className="px-4 pt-4">
            <ExportSection
              blocos={blocos}
              torresExportacao={torresExportacao}
              onTorresChange={setTorresExportacao}
              statusExportacao={statusExportacao}
              showEstatisticas={showEstatisticas}
              showEstatisticasTorre={showEstatisticasTorre}
              onToggleEstatisticas={() => setShowEstatisticas(!showEstatisticas)}
              onToggleEstatisticasTorre={() => setShowEstatisticasTorre(!showEstatisticasTorre)}
              dataInicio={dataInicio}
              dataFim={dataFim}
              apenasPendentes={apenasPendentes}
              onToggleApenasPendentes={() => setApenasPendentes(!apenasPendentes)}
              onExportCSV={async (s) => {
                const { exportarCSV } = await loadExport();
                exportarCSV(s);
              }}
              onExportPDF={async (s) => {
                const { exportarPDF } = await loadExport();
                exportarPDF(s, 'Vistoria Cyble');
              }}
              onExportXLSX={async (s) => {
                const { exportarXLSX } = await loadExport();
                exportarXLSX(s, 'Vistoria Cyble');
              }}
              onCompartilharPDF={async (s) => {
                setCompartilhando('pdf');
                const { compartilharPDF } = await loadExport();
                await compartilharPDF(s, 'Vistoria Cyble');
                setCompartilhando(null);
              }}
              onCompartilharXLSX={async (s) => {
                setCompartilhando('xlsx');
                const { compartilharXLSX } = await loadExport();
                await compartilharXLSX(s, 'Vistoria Cyble');
                setCompartilhando(null);
              }}
              onExportZIP={async (s) => {
                setExportandoZIP(true);
                try {
                  const { exportarZIP } = await loadExport();
                  await exportarZIP(s, 'Vistoria Cyble', { onProgress: () => {} });
                } finally {
                  setExportandoZIP(false);
                }
              }}
              onRelatorioPDFComFotos={async (s) => {
                setExportandoFotos(true);
                try {
                  const { relatorioPDFComFotos } = await loadExport();
                  await relatorioPDFComFotos(s, 'Vistoria Cyble', { onProgress: () => {} });
                } finally {
                  setExportandoFotos(false);
                }
              }}
              onExportHTML={async (s) => {
                const { gerarRelatorioHTML, downloadHTML } = await loadExport();
                const fotosMap = new Map<string, { fotoUrl: string; categoria: string }[]>();
                for (const f of fotosOnline) {
                  const key = fotosMapKey(f.bloco, f.apartamento);
                  const arr = fotosMap.get(key) ?? [];
                  arr.push({
                    fotoUrl: f.foto_url,
                    categoria: f.foto_url.includes('antes')
                      ? 'cyble_antes'
                      : f.foto_url.includes('depois')
                      ? 'cyble_depois'
                      : 'documento',
                  });
                  fotosMap.set(key, arr);
                }
                const html = gerarRelatorioHTML(s, fotosMap, torresExportacao.size > 0 ? torresExportacao : undefined);
                downloadHTML(html, `vistoria-cyble-${new Date().toISOString().slice(0, 10)}.html`);
                logAudit('export_html', `Relatorio HTML gerado (${s.length} aptos)`);
              }}
              onExportJSON={async (s) => {
                const { exportarJSON } = await loadExportJSON();
                exportarJSON(s, 'Vistoria Cyble');
                logAudit('export_json', `Export JSON gerado (${s.length} aptos)`);
              }}
              showPDFOptions={showPDFOptions}
              onTogglePDFOptions={() => setShowPDFOptions(!showPDFOptions)}
              pdfAccentColor={pdfAccentColor}
              onPDFColorChange={setPDFAccentColor}
              onShareReport={async (s) => {
                setCompartilhando('report');
                try {
                  const { gerarRelatorioHTML } = await loadExport();
                  const fotosMap = new Map<string, { fotoUrl: string; categoria: string }[]>();
                  for (const f of fotosOnline) {
                    const key = fotosMapKey(f.bloco, f.apartamento);
                    const arr = fotosMap.get(key) ?? [];
                    arr.push({
                      fotoUrl: f.foto_url,
                      categoria: f.foto_url.includes('antes')
                        ? 'cyble_antes'
                        : f.foto_url.includes('depois')
                        ? 'cyble_depois'
                        : 'documento',
                    });
                    fotosMap.set(key, arr);
                  }
                  const html = gerarRelatorioHTML(s, fotosMap, torresExportacao.size > 0 ? torresExportacao : undefined);
                  const res = await authFetch('/api/share-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ html, filename: `vistoria-${new Date().toISOString().slice(0, 10)}.html` }),
                  });
                  const data = await res.json();
                  if (data.ok && data.url) {
                    await navigator.clipboard.writeText(data.url);
                    toast('Link copiado para a area de transferencia', 'success');
                    logAudit('export_html', `Link compartilhado (${s.length} aptos)`);
                  } else {
                    toast('Erro ao gerar link: ' + (data.erro || 'desconhecido'), 'error');
                  }
                } catch {
                  toast('Erro ao compartilhar relatório', 'error');
                }
                setCompartilhando(null);
              }}
              compartilhando={compartilhando}
              exportandoZIP={exportandoZIP}
              exportandoFotos={exportandoFotos}
              fotos={allFotos}
              onMarcarDocsOK={async (bloco) => {
                const aptos = lista?.[bloco] || [];
                const snapshot = await obterTodasFotos();
                const snapshotDocs = snapshot.filter(
                  (f) => f.categoria === 'documento' && normalizeBloco(f.bloco) === normalizeBloco(bloco)
                );
                const count = await marcarTodosDocsOK(bloco, aptos);
                toast(`${count} documentos marcados como OK`, 'success', {
                  onUndo: async () => {
                    for (const doc of snapshotDocs) {
                      if (doc.id) await desmarcarSincronizada(doc.id);
                    }
                    ultimasFotos(10).then(onFotosRecentesUpdate);
                    obterTodasFotos().then(setAllFotos);
                    toast('Ação desfeita', 'info');
                  },
                  undoLabel: 'Desfazer',
                  duration: 8000,
                });
                ultimasFotos(10).then(onFotosRecentesUpdate);
                obterTodasFotos().then(setAllFotos);
              }}
              pin={pin}
            />

            {showEstatisticas && <EstatisticasPeriodo fotosOnline={fotosOnline} />}
            {showEstatisticasTorre && (
              <EstatisticasPorTorre status={status} fotosOnline={fotosOnline} lista={lista} />
            )}
          </div>
        </div>
      </main>
      <BottomNav active="exportar" onNavigate={onNavigate} />
    </>
  );
}
