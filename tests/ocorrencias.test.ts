import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  salvarOcorrencia,
  carregarOcorrencias,
  removerOcorrencia,
  type OcorrenciaApto,
} from '@/lib/db';

const storeConfig = new Map<string, any>();

vi.mock('@/lib/db', async () => {
  const actual = await vi.importActual<typeof import('@/lib/db')>('@/lib/db');
  return {
    ...actual,
    carregarOcorrencias: vi.fn(async () => {
      return storeConfig.get('ocorrencias') ?? {};
    }),
    salvarOcorrencia: vi.fn(async (oc: OcorrenciaApto) => {
      const data = storeConfig.get('ocorrencias') ?? {};
      const bNorm = oc.bloco.trim().toUpperCase();
      const aNorm = oc.apartamento.trim().toUpperCase();
      if (!data[bNorm]) data[bNorm] = {};
      data[bNorm][aNorm] = {
        ...oc,
        bloco: bNorm,
        apartamento: aNorm,
      };
      storeConfig.set('ocorrencias', { ...data });
    }),
    removerOcorrencia: vi.fn(async (bloco: string, apartamento: string) => {
      const data = storeConfig.get('ocorrencias') ?? {};
      const bNorm = bloco.trim().toUpperCase();
      const aNorm = apartamento.trim().toUpperCase();
      if (data[bNorm] && data[bNorm][aNorm]) {
        delete data[bNorm][aNorm];
        storeConfig.set('ocorrencias', { ...data });
      }
    }),
  };
});

beforeEach(() => {
  storeConfig.clear();
});

describe('Gestão de Ausentes & Ocorrências de Acesso', () => {
  it('inicia com mapa de ocorrências vazio', async () => {
    const ocorrencias = await carregarOcorrencias();
    expect(ocorrencias).toEqual({});
  });

  it('salva ocorrência de morador ausente corretamente', async () => {
    const nova: OcorrenciaApto = {
      bloco: 'Torre A',
      apartamento: '102',
      motivo: 'morador_ausente',
      motivoLabel: 'Morador Ausente / Não Atende',
      observacao: 'Interfone sem resposta',
      timestamp: Date.now(),
      resolvido: false,
    };

    await salvarOcorrencia(nova);
    const ocorrencias = await carregarOcorrencias();

    expect(ocorrencias['TORRE A']).toBeDefined();
    expect(ocorrencias['TORRE A']['102']).toBeDefined();
    expect(ocorrencias['TORRE A']['102'].motivo).toBe('morador_ausente');
    expect(ocorrencias['TORRE A']['102'].motivoLabel).toBe('Morador Ausente / Não Atende');
    expect(ocorrencias['TORRE A']['102'].observacao).toBe('Interfone sem resposta');
  });

  it('permite atualizar a observação de uma ocorrência existente', async () => {
    const oc1: OcorrenciaApto = {
      bloco: 'Torre B',
      apartamento: '204',
      motivo: 'interfone_sem_resposta',
      motivoLabel: 'Interfone Sem Resposta',
      timestamp: Date.now(),
      resolvido: false,
    };
    await salvarOcorrencia(oc1);

    const oc2: OcorrenciaApto = {
      ...oc1,
      observacao: 'Tentado novamente às 14h com a portaria',
    };
    await salvarOcorrencia(oc2);

    const ocorrencias = await carregarOcorrencias();
    expect(ocorrencias['TORRE B']['204'].observacao).toBe('Tentado novamente às 14h com a portaria');
  });

  it('remove ocorrência após resolução ou cancelamento', async () => {
    const oc: OcorrenciaApto = {
      bloco: 'Torre C',
      apartamento: '301',
      motivo: 'porta_fechada',
      motivoLabel: 'Porta/Armário Trancado',
      timestamp: Date.now(),
      resolvido: false,
    };
    await salvarOcorrencia(oc);

    let ocorrencias = await carregarOcorrencias();
    expect(ocorrencias['TORRE C']['301']).toBeDefined();

    await removerOcorrencia('Torre C', '301');
    ocorrencias = await carregarOcorrencias();
    expect(ocorrencias['TORRE C']?.['301']).toBeUndefined();
  });
});
