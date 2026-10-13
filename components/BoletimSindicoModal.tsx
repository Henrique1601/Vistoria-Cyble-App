'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, ShareNetwork, Copy, Download, Check, Sparkle, ChatText, Image as ImageIcon, Buildings, Calendar } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@/lib/motion';
import { useToast } from '@/components/Toast';
import { haptic } from '@/lib/haptic';
import { type ApartamentoStatus, type FotoRecord, obterTodasFotos } from '@/lib/db';
import { calcularDadosBoletim, formatarTextoWhatsApp, renderizarCardImagemBoletim } from '@/lib/boletimDiario';

interface BoletimSindicoModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusList: ApartamentoStatus[];
  fotos?: FotoRecord[];
  nomeCondominio?: string;
}

export default function BoletimSindicoModal({
  isOpen,
  onClose,
  statusList,
  fotos,
  nomeCondominio = 'Condomínio',
}: BoletimSindicoModalProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<'whatsapp' | 'card'>('whatsapp');
  const [copiado, setCopiado] = useState(false);
  const [gerandoImagem, setGerandoImagem] = useState(false);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [fotosLocais, setFotosLocais] = useState<FotoRecord[]>(fotos || []);

  useEffect(() => {
    if (fotos && fotos.length > 0) {
      setFotosLocais(fotos);
    } else if (isOpen) {
      obterTodasFotos().then((f) => setFotosLocais(f)).catch(() => {});
    }
  }, [fotos, isOpen]);

  const dados = useMemo(() => {
    return calcularDadosBoletim(statusList, fotosLocais);
  }, [statusList, fotosLocais]);

  const textoWhatsApp = useMemo(() => {
    return formatarTextoWhatsApp(dados, nomeCondominio);
  }, [dados, nomeCondominio]);

  if (!isOpen) return null;

  async function handleCopiarTexto() {
    haptic('medium');
    try {
      await navigator.clipboard.writeText(textoWhatsApp);
      setCopiado(true);
      toast('Boletim copiado para a área de transferência!', 'success');
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast('Não foi possível copiar o texto', 'error');
    }
  }

  async function handleEnviarWhatsApp() {
    haptic('medium');
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Boletim de Vistoria - ${nomeCondominio}`,
          text: textoWhatsApp,
        });
        toast('Boletim compartilhado!', 'success');
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // fallback
        } else {
          return;
        }
      }
    }
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoWhatsApp)}`;
    window.open(url, '_blank');
  }

  async function handleGerarOuBaixarImagem() {
    setGerandoImagem(true);
    haptic('medium');
    try {
      const blob = await renderizarCardImagemBoletim(dados, nomeCondominio);
      const url = URL.createObjectURL(blob);
      setImagemUrl(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = `boletim-sindico-${dados.data.replace(/\//g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('Card de imagem baixado com sucesso!', 'success');
    } catch {
      toast('Erro ao gerar card de imagem', 'error');
    } finally {
      setGerandoImagem(false);
    }
  }

  async function handleCompartilharImagem() {
    setGerandoImagem(true);
    haptic('medium');
    try {
      const blob = await renderizarCardImagemBoletim(dados, nomeCondominio);
      const file = new File([blob], `boletim-${dados.data.replace(/\//g, '-')}.png`, { type: 'image/png' });

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Boletim Diário - ${nomeCondominio}`,
          text: `Boletim de produção e moradores ausentes • ${dados.data}`,
          files: [file],
        });
        toast('Card de imagem compartilhado!', 'success');
      } else {
        // Fallback: download
        await handleGerarOuBaixarImagem();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast('Compartilhamento não suportado neste navegador, baixando imagem...', 'info');
        await handleGerarOuBaixarImagem();
      }
    } finally {
      setGerandoImagem(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={spring}
          className="w-full sm:max-w-xl bg-base-card border border-base-border rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between pb-3 border-b border-base-border flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Sparkle size={22} weight="duotone" />
              </div>
              <div>
                <h3 className="text-base font-bold text-content flex items-center gap-2">
                  Boletim Diário do Síndico
                </h3>
                <p className="text-xs text-content-tertiary">
                  Resumo executivo de produção e moradores ausentes
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-content-tertiary hover:text-content hover:bg-base-overlay transition-colors"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Abas de Formato */}
          <div className="flex gap-2 pt-3 flex-shrink-0">
            <button
              onClick={() => {
                haptic('light');
                setTab('whatsapp');
              }}
              className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 border transition-all ${
                tab === 'whatsapp'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-sm'
                  : 'bg-base-raised/60 border-base-border/60 text-content-secondary hover:bg-base-raised'
              }`}
            >
              <ChatText size={16} weight="bold" />
              Texto WhatsApp
            </button>
            <button
              onClick={() => {
                haptic('light');
                setTab('card');
              }}
              className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 border transition-all ${
                tab === 'card'
                  ? 'bg-sky-500/10 border-sky-500/40 text-sky-400 shadow-sm'
                  : 'bg-base-raised/60 border-base-border/60 text-content-secondary hover:bg-base-raised'
              }`}
            >
              <ImageIcon size={16} weight="bold" />
              Card Visual (PNG)
            </button>
          </div>

          {/* Conteúdo */}
          <div className="overflow-y-auto py-3 space-y-3 flex-1 pr-1">
            {/* Métricas Rápidas no Topo */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-base-raised/70 border border-base-border/60 rounded-2xl">
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-content-tertiary block">Trocados Hoje</span>
                <span className="text-lg font-mono font-bold text-emerald-400">+{dados.trocadosHoje}</span>
              </div>
              <div className="text-center border-x border-base-border/50">
                <span className="text-[10px] uppercase font-bold text-content-tertiary block">Progresso Geral</span>
                <span className="text-lg font-mono font-bold text-sky-400">{dados.percentualGeral}%</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-content-tertiary block">Ausentes</span>
                <span className={`text-lg font-mono font-bold ${dados.ausentesHoje.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {dados.ausentesHoje.length}
                </span>
              </div>
            </div>

            {tab === 'whatsapp' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-content-tertiary px-1">
                  <span>Prévia da mensagem:</span>
                  <span>{textoWhatsApp.length} caracteres</span>
                </div>
                <div className="p-3.5 bg-black/40 border border-base-border rounded-2xl font-mono text-xs text-content-secondary leading-relaxed whitespace-pre-wrap select-all max-h-60 overflow-y-auto">
                  {textoWhatsApp}
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <div className="p-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-inner">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <ImageIcon size={26} weight="duotone" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Card em Alta Resolução (1080x1350)</h4>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                    Renderiza um card visual com gradiente premium, barras de progresso de cada torre e a lista de apartamentos ausentes.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé / Ações */}
          <div className="pt-3 border-t border-base-border flex items-center gap-2 flex-shrink-0">
            {tab === 'whatsapp' ? (
              <>
                <button
                  type="button"
                  onClick={handleCopiarTexto}
                  className="tactile-press py-2.5 px-3.5 rounded-xl border border-base-border text-content hover:bg-base-overlay text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiado ? <Check size={16} weight="bold" className="text-emerald-400" /> : <Copy size={16} weight="bold" />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>

                <button
                  type="button"
                  onClick={handleEnviarWhatsApp}
                  className="tactile-press flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <ShareNetwork size={16} weight="bold" />
                  Enviar no WhatsApp
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleGerarOuBaixarImagem}
                  disabled={gerandoImagem}
                  className="tactile-press flex-1 py-2.5 px-3.5 rounded-xl border border-base-border text-content hover:bg-base-overlay text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download size={16} weight="bold" />
                  {gerandoImagem ? 'Gerando...' : 'Baixar Imagem'}
                </button>

                <button
                  type="button"
                  onClick={handleCompartilharImagem}
                  disabled={gerandoImagem}
                  className="tactile-press flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all"
                >
                  <ShareNetwork size={16} weight="bold" />
                  {gerandoImagem ? 'Processando...' : 'Compartilhar Card'}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
