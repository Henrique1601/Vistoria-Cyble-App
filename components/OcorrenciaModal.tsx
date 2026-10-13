'use client';

import { useState, useEffect } from 'react';
import { X, Check, Warning, ChatCircleDots, ShareNetwork, Trash, Door, BellSlash, Lock, Prohibit } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@/lib/motion';
import { useToast } from '@/components/Toast';
import { haptic } from '@/lib/haptic';
import { salvarOcorrencia, removerOcorrencia, type OcorrenciaApto, type MotivoAusente } from '@/lib/db';

interface OcorrenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  bloco: string;
  apartamento: string;
  ocorrenciaExistente?: OcorrenciaApto;
  onSalvo: () => void;
}

const MOTIVOS: { key: MotivoAusente; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    key: 'morador_ausente',
    label: 'Morador Ausente / Não Atende',
    icon: <Door size={20} weight="duotone" className="text-amber-400" />,
    desc: 'Campainha ou porta batida sem resposta no apartamento',
  },
  {
    key: 'interfone_sem_resposta',
    label: 'Interfone Sem Resposta',
    icon: <BellSlash size={20} weight="duotone" className="text-blue-400" />,
    desc: 'Portaria/técnico interfonou e ninguém atendeu',
  },
  {
    key: 'porta_fechada',
    label: 'Porta/Armário Trancado',
    icon: <Lock size={20} weight="duotone" className="text-purple-400" />,
    desc: 'Sem chave para o shaft interno ou porta de serviço trancada',
  },
  {
    key: 'acesso_recusado',
    label: 'Acesso Recusado pelo Morador',
    icon: <Prohibit size={20} weight="duotone" className="text-rose-400" />,
    desc: 'Morador estava presente mas não autorizou a entrada',
  },
  {
    key: 'outro',
    label: 'Outro Impedimento',
    icon: <Warning size={20} weight="duotone" className="text-orange-400" />,
    desc: 'Animal solto, reforma interna ou situação de risco',
  },
];

export default function OcorrenciaModal({
  isOpen,
  onClose,
  bloco,
  apartamento,
  ocorrenciaExistente,
  onSalvo,
}: OcorrenciaModalProps) {
  const { toast } = useToast();
  const [motivo, setMotivo] = useState<MotivoAusente>(ocorrenciaExistente?.motivo || 'morador_ausente');
  const [observacao, setObservacao] = useState(ocorrenciaExistente?.observacao || '');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (ocorrenciaExistente) {
      setMotivo(ocorrenciaExistente.motivo);
      setObservacao(ocorrenciaExistente.observacao || '');
    } else {
      setMotivo('morador_ausente');
      setObservacao('');
    }
  }, [ocorrenciaExistente, isOpen]);

  if (!isOpen) return null;

  const motivoObj = MOTIVOS.find((m) => m.key === motivo) || MOTIVOS[0];

  function gerarMensagemWhatsApp() {
    const agora = new Date();
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dataFormatada = agora.toLocaleDateString('pt-BR');

    let texto = `*AVISO DE AUSÊNCIA — VISTORIA CYBLE/GÁS*\n`;
    texto += `📍 *Torre:* ${bloco} — *Apto:* ${apartamento}\n`;
    texto += `⏰ *Horário:* ${dataFormatada} às ${horaFormatada}\n`;
    texto += `🚪 *Situação:* ${motivoObj.label}\n`;
    if (observacao.trim()) {
      texto += `📝 *Observação:* ${observacao.trim()}\n`;
    }
    texto += `\n⚠️ *Atenção:* O medidor é interno ao apartamento e o técnico está no local sem acesso. Favor interfonar/acionar o morador ou agendar retorno.`;
    return texto;
  }

  async function handleAvisarWhatsApp() {
    haptic('medium');
    const msg = gerarMensagemWhatsApp();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Ausência ${bloco} - Apto ${apartamento}`,
          text: msg,
        });
        toast('Mensagem compartilhada!', 'success');
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // fallback
        } else {
          return;
        }
      }
    }
    // Fallback: abre direto o link do WhatsApp
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  async function handleSalvar() {
    setSalvando(true);
    haptic('success');
    try {
      await salvarOcorrencia({
        bloco,
        apartamento,
        motivo,
        motivoLabel: motivoObj.label,
        timestamp: Date.now(),
        observacao: observacao.trim() || undefined,
        resolvido: false,
      });
      toast(`Ocorrência de ausência registrada para o Apto ${apartamento}`, 'success');
      onSalvo();
      onClose();
    } catch {
      toast('Erro ao salvar ocorrência', 'error');
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover() {
    setSalvando(true);
    haptic('light');
    try {
      await removerOcorrencia(bloco, apartamento);
      toast(`Ocorrência removida do Apto ${apartamento}`, 'info');
      onSalvo();
      onClose();
    } catch {
      toast('Erro ao remover ocorrência', 'error');
    } finally {
      setSalvando(false);
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
          className="w-full sm:max-w-lg bg-base-card border border-base-border rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between pb-3 border-b border-base-border flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Door size={22} weight="duotone" />
              </div>
              <div>
                <h3 className="text-base font-bold text-content flex items-center gap-2">
                  Impedimento / Ausente
                  <span className="badge-mono-pill px-2 py-0.5 text-xs text-accent">
                    {bloco} • Apto {apartamento}
                  </span>
                </h3>
                <p className="text-xs text-content-tertiary">
                  Medidor interno ao apartamento sem acesso
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

          {/* Conteúdo com Scroll */}
          <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1">
            {/* Seletor de Motivos */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-content-tertiary">
                Motivo do Impedimento
              </label>
              <div className="grid grid-cols-1 gap-2">
                {MOTIVOS.map((m) => {
                  const isSelected = motivo === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        haptic('light');
                        setMotivo(m.key);
                      }}
                      className={`tactile-press flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                          : 'bg-base-raised/60 border-base-border/60 hover:bg-base-raised'
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">{m.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-amber-400' : 'text-content'}`}>
                            {m.label}
                          </span>
                          {isSelected && <Check size={16} weight="bold" className="text-amber-400 flex-shrink-0 ml-1" />}
                        </div>
                        <p className="text-xs text-content-tertiary mt-0.5 leading-snug">{m.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observação Adicional */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-content-tertiary flex items-center gap-1.5">
                <ChatCircleDots size={14} />
                Observação (Opcional)
              </label>
              <input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Vizinho avisou que chega às 16h, cachorro bravo, etc."
                className="w-full px-3.5 py-2.5 rounded-xl bg-base-raised border border-base-border text-sm text-content placeholder:text-content-tertiary focus:border-accent focus:outline-none transition-colors"
                maxLength={120}
              />
            </div>

            {/* Botão de Disparo Portaria / WhatsApp */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <ShareNetwork size={16} weight="bold" />
                  Acionar Zelador / Portaria
                </div>
                <span className="text-[10px] text-emerald-400/80 font-mono">WhatsApp</span>
              </div>
              <p className="text-xs text-content-secondary leading-relaxed">
                Envia na hora uma mensagem pré-formatada para a portaria/grupo interfonar para o morador ou agendar a repescagem.
              </p>
              <button
                type="button"
                onClick={handleAvisarWhatsApp}
                className="tactile-press w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <ShareNetwork size={15} weight="bold" />
                Avisar Portaria no WhatsApp
              </button>
            </div>
          </div>

          {/* Rodapé / Ações */}
          <div className="pt-3 border-t border-base-border flex items-center gap-2.5 flex-shrink-0">
            {ocorrenciaExistente && (
              <button
                type="button"
                onClick={handleRemover}
                disabled={salvando}
                className="tactile-press py-2.5 px-3 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Remover ocorrência"
              >
                <Trash size={15} weight="bold" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="tactile-press flex-1 py-2.5 px-4 rounded-xl border border-base-border text-content-secondary hover:bg-base-overlay text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              className="tactile-press flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Check size={16} weight="bold" />
              {salvando ? 'Salvando...' : 'Salvar Ausente'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
