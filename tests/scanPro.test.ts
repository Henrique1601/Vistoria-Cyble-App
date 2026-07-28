import { describe, it, expect, vi } from 'vitest';

// vi.hoisted runs BEFORE any module imports
vi.hoisted(() => {
  class MockOscillator {
    type = '';
    frequency = { value: 0 };
    connect = vi.fn();
    start = vi.fn();
    stop = vi.fn();
  }
  class MockGainNode {
    gain = { value: 0, exponentialRampToValueAtTime: vi.fn() };
    connect = vi.fn();
  }
  class MockAudioContext {
    state = 'running';
    currentTime = 0;
    destination = {};
    resume() { this.state = 'running'; }
    createOscillator() { return new MockOscillator(); }
    createGain() { return new MockGainNode(); }
  }
  // @ts-expect-error — mocking AudioContext for jsdom
  globalThis.AudioContext = MockAudioContext;
  // @ts-expect-error — mocking navigator.vibrate for jsdom
  globalThis.navigator.vibrate = vi.fn();
});

import {
  setAudioEnabled,
  setVibrationEnabled,
  isAudioEnabled,
  isVibrationEnabled,
  getEventLabel,
  playScanFeedback,
} from '@/lib/scanPro';

describe('Audio/Vibration toggles', () => {
  it('audio habilitado por padrao', () => {
    expect(isAudioEnabled()).toBe(true);
  });

  it('vibracao habilitada por padrao', () => {
    expect(isVibrationEnabled()).toBe(true);
  });

  it('desabilita e reabilita audio', () => {
    setAudioEnabled(false);
    expect(isAudioEnabled()).toBe(false);
    setAudioEnabled(true);
    expect(isAudioEnabled()).toBe(true);
  });

  it('desabilita e reabilita vibracao', () => {
    setVibrationEnabled(false);
    expect(isVibrationEnabled()).toBe(false);
    setVibrationEnabled(true);
    expect(isVibrationEnabled()).toBe(true);
  });
});

describe('getEventLabel', () => {
  it('retorna label correto para cada evento', () => {
    expect(getEventLabel('photo_captured')).toBe('Foto capturada');
    expect(getEventLabel('photo_synced')).toBe('Sincronizada');
    expect(getEventLabel('category_changed')).toBe('Categoria trocada');
    expect(getEventLabel('error')).toBe('Erro');
    expect(getEventLabel('complete')).toBe('Apartamento concluído');
    expect(getEventLabel('next_apto')).toBe('Próximo apartamento');
  });
});

describe('playScanFeedback', () => {
  it('nao lanca erro para eventos validos', () => {
    expect(() => playScanFeedback('photo_captured')).not.toThrow();
    expect(() => playScanFeedback('photo_synced')).not.toThrow();
    expect(() => playScanFeedback('category_changed')).not.toThrow();
    expect(() => playScanFeedback('error')).not.toThrow();
    expect(() => playScanFeedback('complete')).not.toThrow();
    expect(() => playScanFeedback('next_apto')).not.toThrow();
  });

  it('nao lanca erro mesmo com audio e vibracao desabilitados', () => {
    setAudioEnabled(false);
    setVibrationEnabled(false);
    expect(() => playScanFeedback('photo_captured')).not.toThrow();
    setAudioEnabled(true);
    setVibrationEnabled(true);
  });
});
