import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTema,
  setTema,
  getQualidadeFoto,
  setQualidadeFoto,
  getScanMode,
  setScanMode,
  getDiasAlerta,
  setDiasAlerta,
  getItensPagina,
  setItensPagina,
  getSalvarEm,
  setSalvarEm,
  getBackupIntervalo,
  setBackupIntervalo,
  getModoCompacto,
  setModoCompacto,
  getAltoContraste,
  setAltoContraste,
  getFavoritos,
  toggleFavorito,
  isFavorito,
} from '@/lib/settings';

beforeEach(() => {
  localStorage.clear();
});

describe('Tema', () => {
  it('retorna "auto" por padrao', () => {
    expect(getTema()).toBe('auto');
  });

  it('salva e recupera tema', () => {
    setTema('dark');
    expect(getTema()).toBe('dark');
    setTema('light');
    expect(getTema()).toBe('light');
  });
});

describe('Qualidade da foto', () => {
  it('retorna "90" por padrao', () => {
    expect(getQualidadeFoto()).toBe('90');
  });

  it('salva e recupera qualidade', () => {
    setQualidadeFoto('100');
    expect(getQualidadeFoto()).toBe('100');
    setQualidadeFoto('50');
    expect(getQualidadeFoto()).toBe('50');
  });
});

describe('ScanMode', () => {
  it('retorna false por padrao', () => {
    expect(getScanMode()).toBe(false);
  });

  it('salva e recupera booleano', () => {
    setScanMode(true);
    expect(getScanMode()).toBe(true);
    setScanMode(false);
    expect(getScanMode()).toBe(false);
  });
});

describe('Dias de alerta', () => {
  it('retorna 7 por padrao', () => {
    expect(getDiasAlerta()).toBe(7);
  });

  it('salva e recupera numero', () => {
    setDiasAlerta(14);
    expect(getDiasAlerta()).toBe(14);
  });
});

describe('Itens por pagina', () => {
  it('retorna 20 por padrao', () => {
    expect(getItensPagina()).toBe(20);
  });

  it('salva e recupera numero', () => {
    setItensPagina(50);
    expect(getItensPagina()).toBe(50);
  });
});

describe('Backup automatico', () => {
  it('retorna ambos por padrao', () => {
    expect(getSalvarEm()).toBe('ambos');
  });

  it('salva e recupera localizacao', () => {
    setSalvarEm('dispositivo');
    expect(getSalvarEm()).toBe('dispositivo');
  });
});

describe('Backup intervalo', () => {
  it('retorna 30 por padrao', () => {
    expect(getBackupIntervalo()).toBe(30);
  });

  it('salva e recupera intervalo', () => {
    setBackupIntervalo(360);
    expect(getBackupIntervalo()).toBe(360);
  });
});

describe('Modo compacto', () => {
  it('retorna false por padrao', () => {
    expect(getModoCompacto()).toBe(false);
  });

  it('salva e recupera booleano', () => {
    setModoCompacto(true);
    expect(getModoCompacto()).toBe(true);
  });
});

describe('Alto contraste', () => {
  it('retorna false por padrao', () => {
    expect(getAltoContraste()).toBe(false);
  });

  it('salva e recupera booleano', () => {
    setAltoContraste(true);
    expect(getAltoContraste()).toBe(true);
  });
});

describe('Favoritos', () => {
  it('retorna Set vazio por padrao', () => {
    expect(getFavoritos().size).toBe(0);
  });

  it('toggleFavorito adiciona favorito', () => {
    const result = toggleFavorito('Torre A', '42');
    expect(result).toBe(true);
    expect(isFavorito('Torre A', '42')).toBe(true);
  });

  it('toggleFavorito remove favorito existente', () => {
    toggleFavorito('Torre A', '42');
    const result = toggleFavorito('Torre A', '42');
    expect(result).toBe(false);
    expect(isFavorito('Torre A', '42')).toBe(false);
  });

  it('favoritos sao por bloco + apartamento', () => {
    toggleFavorito('Torre A', '42');
    expect(isFavorito('Torre A', '42')).toBe(true);
    expect(isFavorito('Torre B', '42')).toBe(false);
    expect(isFavorito('Torre A', '43')).toBe(false);
  });

  it('multiplos favoritos funcionam', () => {
    toggleFavorito('Torre A', '42');
    toggleFavorito('Torre B', '10');
    toggleFavorito('Torre A', '99');
    expect(getFavoritos().size).toBe(3);
    expect(isFavorito('Torre A', '42')).toBe(true);
    expect(isFavorito('Torre B', '10')).toBe(true);
    expect(isFavorito('Torre A', '99')).toBe(true);
  });

  it('persiste no localStorage', () => {
    toggleFavorito('Torre A', '42');
    const raw = localStorage.getItem('vistoria_favoritos');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).toContain('Torre A__42');
  });
});
