import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockConfigStore = new Map<string, unknown>();

vi.mock('idb', () => ({
  openDB: vi.fn(async () => ({
    get: vi.fn(async (_store: string, key: string) => mockConfigStore.get(key)),
    put: vi.fn(async (_store: string, val: unknown, key: string) => {
      mockConfigStore.set(key, val);
    }),
    delete: vi.fn(async (_store: string, key: string) => {
      mockConfigStore.delete(key);
    }),
  })),
}));

describe('carregarConcluidos, syncConcluidosToAPI e trocas', () => {
  beforeEach(() => {
    mockConfigStore.clear();
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('nao chama /api/concluidos quando nao ha vistoria_pin no sessionStorage', async () => {
    mockConfigStore.set('concluidos', { 'Torre A': ['101'] });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const { carregarConcluidos } = await import('@/lib/db');
    const result = await carregarConcluidos();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ 'Torre A': ['101'] });
  });

  it('deduplica chamadas simultaneas a /api/concluidos durante o boot', async () => {
    sessionStorage.setItem('vistoria_pin', '4821');
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ 'Torre A': ['101', '102'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { carregarConcluidos } = await import('@/lib/db');
    const [r1, r2] = await Promise.all([carregarConcluidos(), carregarConcluidos()]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(r1).toEqual({ 'Torre A': ['101', '102'] });
    expect(r2).toEqual({ 'Torre A': ['101', '102'] });
  });

  it('nao envia POST /api/concluidos quando usuario esta em modo viewer', async () => {
    sessionStorage.setItem('vistoria_pin', '1234');
    localStorage.setItem('vistoria_role', 'viewer');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const { salvarConcluidos } = await import('@/lib/db');
    await salvarConcluidos({ 'Torre B': ['201'] });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockConfigStore.get('concluidos')).toEqual({ 'Torre B': ['201'] });
  });

  it('registra, carrega com cache e remove troca normalizando bloco e apto', async () => {
    const { registrarTroca, carregarTrocas, removerTroca } = await import('@/lib/db');

    await registrarTroca('a', '0101', { data: '2026-11-24', por: 'Henrique' });
    const trocas1 = await carregarTrocas();
    expect(trocas1['Torre A__101']).toEqual({ data: '2026-11-24', por: 'Henrique' });

    // Segunda leitura deve retornar o mesmo cache
    const trocas2 = await carregarTrocas();
    expect(trocas2).toEqual(trocas1);

    await removerTroca('Torre A', '101');
    const trocas3 = await carregarTrocas();
    expect(trocas3['Torre A__101']).toBeUndefined();
  });
});
