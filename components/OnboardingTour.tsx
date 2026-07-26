'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Buildings, Camera, FunnelSimple, Download, GearSix, Bell } from '@phosphor-icons/react';
import { spring } from '@/lib/motion';
import { haptic } from '@/lib/haptic';

const TUTORIAL_KEY = 'vistoria_tutorial_v2';

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  position: 'center' | 'top' | 'bottom';
  highlight?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Bem-vindo ao Vistoria Cyble',
    description: 'App para registrar fotos da troca de Cyble em apartamentos, organizados por torre.',
    icon: <Buildings size={32} weight="duotone" />,
    position: 'center',
  },
  {
    title: 'Selecionar Torre',
    description: 'Toque numa torre para ver todos os apartamentos. As bolinhas mostram o progresso.',
    icon: <Buildings size={24} weight="duotone" />,
    position: 'top',
    highlight: 'tower-grid',
  },
  {
    title: 'Capturar Fotos',
    description: 'Selecione um apto e tire fotos: Cyble Antes, Depois e Documentos. Mantenha a camara aberta para captura rapida.',
    icon: <Camera size={24} weight="duotone" />,
    position: 'center',
  },
  {
    title: 'Filtros e Busca',
    description: 'Use a barra de busca para encontrar apartamentos. Filtre por status: Pendente, Andamento ou Concluido.',
    icon: <FunnelSimple size={24} weight="duotone" />,
    position: 'top',
    highlight: 'filters',
  },
  {
    title: 'Exportar Relatorios',
    description: 'Exporte dados em CSV, PDF, XLSX, ZIP com fotos ou gere um link compartilhavel.',
    icon: <Download size={24} weight="duotone" />,
    position: 'center',
  },
  {
    title: 'Configuracoes',
    description: 'Altere tema, qualidade das fotos, backup automatico e mais opcoes.',
    icon: <GearSix size={24} weight="duotone" />,
    position: 'center',
  },
  {
    title: 'Notificacoes',
    description: 'Ative as notificacoes para saber quando o sync terminar ou quando houver backup automatico.',
    icon: <Bell size={24} weight="duotone" />,
    position: 'center',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  function handleNext() {
    haptic('light');
    if (isLast) {
      onComplete();
    } else {
      setStep(step + 1);
    }
  }

  function handleSkip() {
    haptic('light');
    onComplete();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-base/95 backdrop-blur-sm flex items-center justify-center px-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={spring}
          className="w-full max-w-sm"
        >
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-6">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'bg-accent w-6' : i < step ? 'bg-accent/50 w-3' : 'bg-base-border w-3'
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <motion.div
            key={step}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ ...spring, delay: 0.05 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              {current.icon}
            </div>
            <h2 className="text-lg font-semibold text-content mb-2">{current.title}</h2>
            <p className="text-sm text-content-tertiary leading-relaxed">{current.description}</p>
          </motion.div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="tactile-press flex-1 py-3 rounded-xl text-sm font-medium text-content-tertiary hover:text-content border border-base-border transition-colors"
            >
              Pular tour
            </button>
            <button
              onClick={handleNext}
              className="tactile-press flex-1 py-3 rounded-xl text-sm font-semibold bg-accent text-base hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
            >
              {isLast ? 'Comecar' : 'Proximo'}
              {!isLast && <ArrowRight size={14} weight="bold" />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function shouldShowTutorial(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(TUTORIAL_KEY) !== 'shown';
  } catch { return false; }
}

export function markTutorialDone() {
  try { localStorage.setItem(TUTORIAL_KEY, 'shown'); } catch {}
}
