const DEFAULTS = {
  tema: 'auto' as 'dark' | 'light' | 'auto',
  qualidadeFoto: '75' as '50' | '75' | '90',
  scanMode: false,
  diasAlerta: 7,
  itensPagina: 20,
};

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(`vistoria_${key}`);
    if (v === null) return fallback;
    return v as T;
  } catch {
    return fallback;
  }
}

function set(key: string, value: string) {
  try {
    localStorage.setItem(`vistoria_${key}`, value);
  } catch { /* quota exceeded */ }
}

export function getTema() {
  return get<'dark' | 'light' | 'auto'>('tema', DEFAULTS.tema);
}

export function setTema(tema: 'dark' | 'light' | 'auto') {
  set('tema', tema);
}

export function getQualidadeFoto() {
  return get<'50' | '75' | '90'>('qualidade_foto', DEFAULTS.qualidadeFoto);
}

export function setQualidadeFoto(q: '50' | '75' | '90') {
  set('qualidade_foto', q);
}

export function getScanMode() {
  return get('scan_mode', String(DEFAULTS.scanMode)) === 'true';
}

export function setScanMode(v: boolean) {
  set('scan_mode', String(v));
}

export function getDiasAlerta() {
  return Number(get('dias_alerta', String(DEFAULTS.diasAlerta)));
}

export function setDiasAlerta(d: number) {
  set('dias_alerta', String(d));
}

export function getItensPagina() {
  return Number(get('itens_pagina', String(DEFAULTS.itensPagina)));
}

export function setItensPagina(n: number) {
  set('itens_pagina', String(n));
}
