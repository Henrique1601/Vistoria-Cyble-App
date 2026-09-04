import { describe, it, expect } from 'vitest';
import {
  normApto,
  normalizeBloco,
  fotosMapKey,
  emAndamento,
  formatarDataParaInput,
  formatarDataDisplay,
  estaNoIntervalo,
  obterPeriodoAtalho,
  formatarNomeFotoDownload,
} from '@/lib/utils';

describe('normApto', () => {
  it('remove zeros a esquerda', () => {
    expect(normApto('042')).toBe('42');
    expect(normApto('007')).toBe('7');
    expect(normApto('101')).toBe('101');
  });

  it('retorna "0" para string vazia', () => {
    expect(normApto('')).toBe('0');
  });

  it('nao remove zeros do meio', () => {
    expect(normApto('101')).toBe('101');
    expect(normApto('200')).toBe('200');
  });

  it('lida com "0" puro', () => {
    expect(normApto('0')).toBe('0');
  });
});

describe('normalizeBloco', () => {
  it('normaliza letra simples para "Torre X"', () => {
    expect(normalizeBloco('A')).toBe('Torre A');
    expect(normalizeBloco('b')).toBe('Torre B');
    expect(normalizeBloco('H')).toBe('Torre H');
  });

  it('normaliza "Torre X" (case insensitive)', () => {
    expect(normalizeBloco('torre a')).toBe('Torre A');
    expect(normalizeBloco('Torre C')).toBe('Torre C');
    expect(normalizeBloco('TORRE F')).toBe('Torre F');
  });

  it('normaliza "Torre X" com espaco', () => {
    expect(normalizeBloco('Torre A')).toBe('Torre A');
    expect(normalizeBloco('torre b')).toBe('Torre B');
  });

  it('retorna original para blocos fora de A-H', () => {
    expect(normalizeBloco('Bloco 1')).toBe('Bloco 1');
    expect(normalizeBloco('Torre X')).toBe('Torre X');
    expect(normalizeBloco('Principal')).toBe('Principal');
  });
});

describe('fotosMapKey', () => {
  it('combina bloco e apartamento normalizados', () => {
    expect(fotosMapKey('A', '42')).toBe('Torre A__42');
    expect(fotosMapKey('torre b', '007')).toBe('Torre B__7');
    expect(fotosMapKey('Torre C', '101')).toBe('Torre C__101');
  });

  it('normaliza ambos os lados', () => {
    expect(fotosMapKey('a', '042')).toBe('Torre A__42');
    expect(fotosMapKey('TORRE D', '001')).toBe('Torre D__1');
  });
});

describe('emAndamento', () => {
  it('retorna false se nada foi feito', () => {
    expect(emAndamento({ cybleAntesFeito: false, cybleDepoisFeito: false })).toBe(false);
  });

  it('retorna true se so antes foi feito', () => {
    expect(emAndamento({ cybleAntesFeito: true, cybleDepoisFeito: false })).toBe(true);
  });

  it('retorna true se so depois foi feito', () => {
    expect(emAndamento({ cybleAntesFeito: false, cybleDepoisFeito: true })).toBe(true);
  });

  it('retorna false se ambos foram feitos (concluido)', () => {
    expect(emAndamento({ cybleAntesFeito: true, cybleDepoisFeito: true })).toBe(false);
  });
});

describe('formatarDataParaInput', () => {
  it('formata data para YYYY-MM-DD', () => {
    const data = new Date(2026, 0, 15); // 15 de janeiro de 2026
    expect(formatarDataParaInput(data)).toBe('2026-01-15');
  });

  it('adiciona zeros a esquerda', () => {
    const data = new Date(2026, 2, 5); // 5 de marco de 2026
    expect(formatarDataParaInput(data)).toBe('2026-03-05');
  });
});

describe('formatarDataDisplay', () => {
  it('converte YYYY-MM-DD para DD/MM/YYYY', () => {
    expect(formatarDataDisplay('2026-01-15')).toBe('15/01/2026');
  });

  it('retorna vazio para string vazia', () => {
    expect(formatarDataDisplay('')).toBe('');
  });
});

describe('estaNoIntervalo', () => {
  it('retorna true se data esta no intervalo', () => {
    expect(estaNoIntervalo('2026-01-15', '2026-01-10', '2026-01-20')).toBe(true);
  });

  it('retorna false se data antes do inicio', () => {
    expect(estaNoIntervalo('2026-01-05', '2026-01-10', '2026-01-20')).toBe(false);
  });

  it('retorna false se data depois do fim', () => {
    expect(estaNoIntervalo('2026-01-25', '2026-01-10', '2026-01-20')).toBe(false);
  });

  it('retorna false para string vazia', () => {
    expect(estaNoIntervalo('', '2026-01-10', '2026-01-20')).toBe(false);
  });

  it('ignora inicio vazio', () => {
    expect(estaNoIntervalo('2026-01-05', '', '2026-01-20')).toBe(true);
  });

  it('ignora fim vazio', () => {
    expect(estaNoIntervalo('2026-01-25', '2026-01-10', '')).toBe(true);
  });
});

describe('obterPeriodoAtalho', () => {
  it('retorna hoje', () => {
    const { inicio, fim } = obterPeriodoAtalho('hoje');
    expect(inicio).toBe(fim);
  });

  it('retorna periodo da semana', () => {
    const { inicio, fim } = obterPeriodoAtalho('semana');
    expect(inicio <= fim).toBe(true);
  });

  it('retorna periodo do mes', () => {
    const { inicio, fim } = obterPeriodoAtalho('mes');
    expect(inicio <= fim).toBe(true);
  });

  it('retorna periodo do trimestre', () => {
    const { inicio, fim } = obterPeriodoAtalho('trimestre');
    expect(inicio <= fim).toBe(true);
  });
});

describe('formatarNomeFotoDownload', () => {
  it('formata corretamente para Cyble Antes', () => {
    expect(formatarNomeFotoDownload('Torre A', '101', 'cyble_antes')).toBe('Torre_A_Apto_101_Cyble_Antes.jpg');
    expect(formatarNomeFotoDownload('A', '101', 'cyble_antes')).toBe('Torre_A_Apto_101_Cyble_Antes.jpg');
    expect(formatarNomeFotoDownload('torre a', '0101', 'cyble antes')).toBe('Torre_A_Apto_101_Cyble_Antes.jpg');
  });

  it('formata corretamente para Cyble Depois', () => {
    expect(formatarNomeFotoDownload('Torre B', '202', 'cyble_depois')).toBe('Torre_B_Apto_202_Cyble_Depois.jpg');
    expect(formatarNomeFotoDownload('b', '0202', 'depois')).toBe('Torre_B_Apto_202_Cyble_Depois.jpg');
  });

  it('formata corretamente para Documento', () => {
    expect(formatarNomeFotoDownload('Torre C', '303', 'documento')).toBe('Torre_C_Apto_303_Documento.jpg');
    expect(formatarNomeFotoDownload('Torre C', 'Apto 303', 'documento')).toBe('Torre_C_Apto_303_Documento.jpg');
    expect(formatarNomeFotoDownload('c', '303', 'doc')).toBe('Torre_C_Apto_303_Documento.jpg');
  });

  it('suporta outras extensoes e blocos', () => {
    expect(formatarNomeFotoDownload('Bloco 1', '404', 'documento', 'png')).toBe('Bloco_1_Apto_404_Documento.png');
  });
});
