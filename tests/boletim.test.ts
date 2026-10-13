import { describe, it, expect } from 'vitest';
import { calcularDadosBoletim, formatarTextoWhatsApp } from '@/lib/boletimDiario';
import type { ApartamentoStatus, FotoRecord } from '@/lib/db';

describe('Boletim Diário do Síndico em 1 Clique', () => {
  const agora = Date.now();

  const mockStatus: ApartamentoStatus[] = [
    {
      bloco: 'Torre A',
      apartamento: '101',
      cybleAntesFeito: true,
      cybleDepoisFeito: true,
      qtdFotos: 2,
      qtdDocumentos: 0,
      notas: [],
      isConcluido: true,
    },
    {
      bloco: 'Torre A',
      apartamento: '102',
      cybleAntesFeito: false,
      cybleDepoisFeito: false,
      qtdFotos: 0,
      qtdDocumentos: 0,
      notas: [],
      isConcluido: false,
      ocorrencia: {
        bloco: 'Torre A',
        apartamento: '102',
        motivo: 'morador_ausente',
        motivoLabel: 'Morador Ausente / Não Atende',
        observacao: 'Tentado interfonar 2x',
        timestamp: agora - 1000 * 60 * 30, // 30 min atrás
        resolvido: false,
      },
    },
    {
      bloco: 'Torre B',
      apartamento: '201',
      cybleAntesFeito: true,
      cybleDepoisFeito: true,
      qtdFotos: 2,
      qtdDocumentos: 0,
      notas: [],
      isConcluido: true,
    },
    {
      bloco: 'Torre B',
      apartamento: '202',
      cybleAntesFeito: false,
      cybleDepoisFeito: false,
      qtdFotos: 0,
      qtdDocumentos: 0,
      notas: [],
      isConcluido: false,
    },
  ];

  const mockFotos: FotoRecord[] = [
    {
      id: 1,
      bloco: 'Torre A',
      apartamento: '101',
      categoria: 'cyble_depois',
      blob: new Blob(['mock']),
      timestamp: agora - 1000 * 60 * 60, // 1h atrás (hoje)
      synced: true,
    },
  ];

  it('calcula métricas diárias corretamente', () => {
    const dados = calcularDadosBoletim(mockStatus, mockFotos);

    expect(dados.totalCondominio).toBe(4);
    expect(dados.concluidosTotal).toBe(2);
    expect(dados.trocadosHoje).toBe(1);
    expect(dados.percentualGeral).toBe(50);
    expect(dados.ausentesHoje).toHaveLength(1);
    expect(dados.ausentesHoje[0].apartamento).toBe('102');
    expect(dados.ausentesHoje[0].motivo).toBe('Morador Ausente / Não Atende');
    expect(dados.ausentesHoje[0].observacao).toBe('Tentado interfonar 2x');
  });

  it('calcula progresso por torre adequadamente', () => {
    const dados = calcularDadosBoletim(mockStatus, mockFotos);

    const torreA = dados.progressoPorTorre.find((t) => t.bloco === 'Torre A');
    expect(torreA).toBeDefined();
    expect(torreA?.total).toBe(2);
    expect(torreA?.concluidos).toBe(1);
    expect(torreA?.percentual).toBe(50);
    expect(torreA?.trocadosHoje).toBe(1);
  });

  it('formata texto executivo pronto para WhatsApp', () => {
    const dados = calcularDadosBoletim(mockStatus, mockFotos);
    const texto = formatarTextoWhatsApp(dados, 'Residencial Flores');

    expect(texto).toContain('BOLETIM DIÁRIO — RESIDENCIAL FLORES');
    expect(texto).toContain('Trocados hoje:* 1 medidores');
    expect(texto).toContain('Total Concluído:* 2 de 4 (50%)');
    expect(texto).toContain('MORADORES AUSENTES / SEM ACESSO (1)');
    expect(texto).toContain('Torre A - Apto 102:* Morador Ausente / Não Atende');
    expect(texto).toContain('Tentado interfonar 2x');
  });
});
