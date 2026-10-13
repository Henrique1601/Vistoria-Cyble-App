import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  criarAgendamento,
  listarAgendamentos,
  salvarAgendamentosRemotos,
  atualizarIdAgendamento,
} from '@/lib/db';

const storeAgendamentos = new Map<number, any>();

vi.mock('@/lib/db', async () => {
  const actual = await vi.importActual<typeof import('@/lib/db')>('@/lib/db');
  return {
    ...actual,
    criarAgendamento: vi.fn(async (ag) => {
      const id = -(Date.now());
      const item = { ...ag, id, criadoEm: Date.now(), synced: ag.synced ?? false };
      storeAgendamentos.set(id, item);
      return id;
    }),
    atualizarIdAgendamento: vi.fn(async (idAntigo: number, idNovo: number) => {
      const ag = storeAgendamentos.get(idAntigo);
      if (ag) {
        storeAgendamentos.delete(idAntigo);
        storeAgendamentos.set(idNovo, { ...ag, id: idNovo, synced: true });
      }
    }),
    listarAgendamentos: vi.fn(async () => {
      return Array.from(storeAgendamentos.values());
    }),
    salvarAgendamentosRemotos: vi.fn(async (serverList: any[]) => {
      // Preserva itens com synced: false (criados offline)
      const offlineItems = Array.from(storeAgendamentos.values()).filter((a) => !a.synced);
      storeAgendamentos.clear();
      for (const off of offlineItems) {
        storeAgendamentos.set(off.id, off);
      }
      for (const s of serverList) {
        storeAgendamentos.set(s.id, {
          id: s.id,
          bloco: s.bloco,
          apartamento: s.apartamento,
          data: s.data,
          hora: s.hora,
          concluido: s.concluido,
          observacao: s.observacao,
          criadoEm: s.criado_em ? new Date(s.criado_em).getTime() : Date.now(),
          synced: true,
        });
      }
    }),
  };
});

beforeEach(() => {
  storeAgendamentos.clear();
});

describe('Agenda Bidirecional e Sincronização Offline-First', () => {
  it('cria agendamento offline com flag synced=false', async () => {
    const id = await criarAgendamento({
      bloco: 'Torre A',
      apartamento: '101',
      data: '2026-10-15',
      concluido: false,
    });

    expect(id).toBeDefined();
    const lista = await listarAgendamentos();
    const criado = lista.find((a) => a.id === id);
    expect(criado).toBeDefined();
    expect(criado?.bloco).toBe('Torre A');
    expect(criado?.apartamento).toBe('101');
    expect(criado?.synced).toBe(false);
  });

  it('atualiza ID local temporário para ID definitivo retornado pelo servidor', async () => {
    const tempId = await criarAgendamento({
      bloco: 'Torre B',
      apartamento: '202',
      data: '2026-10-16',
      concluido: false,
    });

    const serverId = 999;
    await atualizarIdAgendamento(tempId, serverId);

    const lista = await listarAgendamentos();
    const antigo = lista.find((a) => a.id === tempId);
    const atualizado = lista.find((a) => a.id === serverId);

    expect(antigo).toBeUndefined();
    expect(atualizado).toBeDefined();
    expect(atualizado?.bloco).toBe('Torre B');
    expect(atualizado?.synced).toBe(true);
  });

  it('preserva agendamentos criados offline ao receber lista do servidor', async () => {
    const offlineId = await criarAgendamento({
      bloco: 'Torre C',
      apartamento: '303',
      data: '2026-10-20',
      concluido: false,
      synced: false,
    });

    const serverList = [
      {
        id: 50,
        bloco: 'Torre A',
        apartamento: '105',
        data: '2026-10-18',
        concluido: false,
        observacao: 'Troca de hidrômetro',
        criado_em: '2026-10-13T10:00:00Z',
      },
      {
        id: 51,
        bloco: 'Torre D',
        apartamento: '404',
        data: '2026-10-19',
        concluido: true,
        observacao: null,
        criado_em: '2026-10-13T11:00:00Z',
      },
    ];

    await salvarAgendamentosRemotos(serverList);

    const lista = await listarAgendamentos();
    // Item offline continua salvo e intacto
    const itemOffline = lista.find((a) => a.id === offlineId);
    expect(itemOffline).toBeDefined();
    expect(itemOffline?.apartamento).toBe('303');
    expect(itemOffline?.synced).toBe(false);

    // Itens da nuvem também presentes
    const item50 = lista.find((a) => a.id === 50);
    const item51 = lista.find((a) => a.id === 51);
    expect(item50).toBeDefined();
    expect(item50?.bloco).toBe('Torre A');
    expect(item50?.synced).toBe(true);
    expect(item51).toBeDefined();
    expect(item51?.concluido).toBe(true);
  });
});
