import { describe, it, expect } from 'vitest';
import { compararFotosSimilares } from '@/lib/imageProcessor';

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
