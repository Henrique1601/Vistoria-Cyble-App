import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportarFotosDoDiaZIP } from '@/lib/export/zip';

// Mock JSZip
const mockFileFn = vi.fn();
const mockGenerateAsync = vi.fn(async () => new Blob(['dummy zip content'], { type: 'application/zip' }));

vi.mock('jszip', () => {
  return {
    default: class MockJSZip {
      file = mockFileFn;
      generateAsync = mockGenerateAsync;
    },
  };
});

// Mock api
vi.mock('@/lib/api', () => ({
  authFetch: vi.fn(async () => ({
    ok: true,
    json: async () => ({ fotos: [] }),
  })),
}));

// Mock utils shareFile
vi.mock('@/lib/export/utils', () => ({
  normApto: (a: string) => a.replace(/^0+/, '') || '0',
  shareFile: vi.fn(async () => true),
}));

// Mock db
const mockObterTodasFotos = vi.fn();
vi.mock('@/lib/db', () => ({
  obterTodasFotos: () => mockObterTodasFotos(),
  fotosDoApartamento: vi.fn(async () => []),
}));

describe('exportarFotosDoDiaZIP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna count: 0 se não houver fotos para a data especificada', async () => {
    mockObterTodasFotos.mockResolvedValueOnce([
      {
        bloco: 'Torre A',
        apartamento: '101',
        categoria: 'cyble_antes',
        timestamp: new Date('2026-01-01T10:00:00').getTime(),
        blob: new Blob(['fake']),
      },
    ]);

    const result = await exportarFotosDoDiaZIP('2026-10-26');
    expect(result.count).toBe(0);
    expect(mockFileFn).not.toHaveBeenCalled();
  });

  it('agrupa e adiciona fotos do dia em pastas Torre/Apto no ZIP', async () => {
    const dataAlvo = '2026-10-26';
    const timestampHoje = new Date('2026-10-26T14:30:00').getTime();

    mockObterTodasFotos.mockResolvedValueOnce([
      {
        bloco: 'Torre A',
        apartamento: '101',
        categoria: 'cyble_antes',
        timestamp: timestampHoje,
        blob: new Blob(['foto-antes-bytes'], { type: 'image/jpeg' }),
      },
      {
        bloco: 'Torre A',
        apartamento: '101',
        categoria: 'cyble_depois',
        timestamp: timestampHoje + 1000,
        blob: new Blob(['foto-depois-bytes'], { type: 'image/jpeg' }),
      },
      {
        bloco: 'Torre B',
        apartamento: '202',
        categoria: 'documento',
        timestamp: timestampHoje + 2000,
        blob: new Blob(['foto-doc-bytes'], { type: 'image/jpeg' }),
      },
    ]);

    const result = await exportarFotosDoDiaZIP(dataAlvo);
    expect(result.count).toBe(3);
    expect(result.filename).toBe('vistoria-fotos-dia-2026-10-26.zip');
    expect(mockFileFn).toHaveBeenCalledTimes(3);

    // Verifica estrutura de diretórios
    const chamadas = mockFileFn.mock.calls.map((c) => c[0]);
    expect(chamadas.some((path: string) => path.startsWith('Torre A/101/cyble_antes_'))).toBe(true);
    expect(chamadas.some((path: string) => path.startsWith('Torre A/101/cyble_depois_'))).toBe(true);
    expect(chamadas.some((path: string) => path.startsWith('Torre B/202/documento_'))).toBe(true);
  });
});
