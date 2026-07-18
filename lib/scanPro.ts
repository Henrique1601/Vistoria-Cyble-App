import { haptic } from './haptic';

type ScanEvent = 'photo_captured' | 'photo_synced' | 'category_changed' | 'error' | 'complete' | 'next_apto';

const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function ensureAudioCtx() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  if (!audioCtx) return;
  ensureAudioCtx();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playChord(freqs: number[], duration: number, type: OscillatorType = 'sine', volume = 0.1) {
  freqs.forEach((f, i) => {
    setTimeout(() => playTone(f, duration, type, volume), i * 60);
  });
}

const PATTERNS: Record<ScanEvent, { vibrate: number[]; sound: () => void }> = {
  photo_captured: {
    vibrate: [30],
    sound: () => playTone(880, 0.1, 'sine', 0.12),
  },
  photo_synced: {
    vibrate: [20, 30, 20],
    sound: () => playChord([523, 659], 0.15, 'sine', 0.08),
  },
  category_changed: {
    vibrate: [15],
    sound: () => playTone(660, 0.06, 'triangle', 0.1),
  },
  error: {
    vibrate: [80, 50, 80],
    sound: () => {
      playTone(200, 0.15, 'sawtooth', 0.12);
      setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.1), 100);
    },
  },
  complete: {
    vibrate: [30, 50, 30, 50, 30],
    sound: () => {
      playChord([523, 659, 784], 0.2, 'sine', 0.1);
      setTimeout(() => playChord([659, 784, 1047], 0.3, 'sine', 0.1), 200);
    },
  },
  next_apto: {
    vibrate: [20, 40, 20],
    sound: () => {
      playTone(523, 0.08, 'sine', 0.1);
      setTimeout(() => playTone(784, 0.12, 'sine', 0.1), 80);
    },
  },
};

let audioEnabled = true;
let vibrationEnabled = true;

export function setAudioEnabled(enabled: boolean) {
  audioEnabled = enabled;
}

export function setVibrationEnabled(enabled: boolean) {
  vibrationEnabled = enabled;
}

export function isAudioEnabled() {
  return audioEnabled;
}

export function isVibrationEnabled() {
  return vibrationEnabled;
}

export function playScanFeedback(event: ScanEvent) {
  const pattern = PATTERNS[event];
  if (!pattern) return;

  if (vibrationEnabled && navigator.vibrate) {
    navigator.vibrate(pattern.vibrate);
  }

  if (audioEnabled) {
    pattern.sound();
  }
}

export function getEventLabel(event: ScanEvent): string {
  const labels: Record<ScanEvent, string> = {
    photo_captured: 'Foto capturada',
    photo_synced: 'Sincronizada',
    category_changed: 'Categoria trocada',
    error: 'Erro',
    complete: 'Apartamento concluído',
    next_apto: 'Próximo apartamento',
  };
  return labels[event];
}
