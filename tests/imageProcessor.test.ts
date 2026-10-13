import { describe, it, expect, vi } from 'vitest';
import {
  compararFotosSimilares,
  comprimirImagemComWorker,
  processarFotoCompleta,
} from '@/lib/imageProcessor';

vi.mock('@/lib/blurDetect', () => ({
  detectBlur: vi.fn(async () => ({
    isBlurry: false,
    isDark: false,
    brightness: 80,
    sharpness: 12,
  })),
}));

describe('compararFotosSimilares', () => {
  it('retorna 0 se os blobs possuírem razão de tamanho desproporcional (> 2.5)', async () => {
    const smallBlob = new Blob([new Uint8Array(100)], { type: 'image/jpeg' });
    const largeBlob = new Blob([new Uint8Array(5000)], { type: 'image/jpeg' });
    const similarity = await compararFotosSimilares(smallBlob, largeBlob);
    expect(similarity).toBe(0);
  });

  it('retorna 0 se os blobs possuírem razão de tamanho desproporcional (< 0.4)', async () => {
    const largeBlob = new Blob([new Uint8Array(10000)], { type: 'image/jpeg' });
    const smallBlob = new Blob([new Uint8Array(100)], { type: 'image/jpeg' });
    const similarity = await compararFotosSimilares(largeBlob, smallBlob);
    expect(similarity).toBe(0);
  });

  it('executa sem exceções para blobs de imagem', async () => {
    const blob1 = new Blob([new Uint8Array([255, 216, 255, 224])], { type: 'image/jpeg' });
    const blob2 = new Blob([new Uint8Array([255, 216, 255, 224])], { type: 'image/jpeg' });
    const similarity = await compararFotosSimilares(blob1, blob2);
    expect(typeof similarity).toBe('number');
    expect(similarity).toBeGreaterThanOrEqual(0);
    expect(similarity).toBeLessThanOrEqual(100);
  });
});

describe('comprimirImagemComWorker & processarFotoCompleta', () => {
  it('comprimirImagemComWorker executa fallback graciosamente quando Worker não está no ambiente', async () => {
    const dummyFile = new File([new Uint8Array([255, 216, 255, 224])], 'teste.jpg', { type: 'image/jpeg' });
    const mockFallback = vi.fn(async () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }));

    const result = await comprimirImagemComWorker(dummyFile, mockFallback);
    expect(mockFallback).toHaveBeenCalledTimes(1);
    expect(result).toBeInstanceOf(Blob);
    expect(result.size).toBe(3);
  });

  it('processarFotoCompleta executa fallback e retorna { blob, blur }', async () => {
    const dummyFile = new File([new Uint8Array([255, 216, 255, 224])], 'teste.jpg', { type: 'image/jpeg' });
    const mockFallback = vi.fn(async () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }));

    const result = await processarFotoCompleta(dummyFile, mockFallback);
    expect(mockFallback).toHaveBeenCalledTimes(1);
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blur).toBeDefined();
    expect(typeof result.blur.isBlurry).toBe('boolean');
    expect(result.blur.sharpness).toBe(12);
  });
});
