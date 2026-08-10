const DEFAULTS = {
  tema: 'auto' as 'dark' | 'light' | 'auto',
  qualidadeFoto: '90' as '50' | '75' | '90' | '100',
  salvarEm: 'ambos' as 'nuvem' | 'dispositivo' | 'ambos',
  scanMode: false,
  diasAlerta: 7,
  itensPagina: 20,
  backupIntervalo: 30 as 30 | 60 | 360 | 1440,
  modoCompacto: false,
  altoContraste: false,
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
  return get<'50' | '75' | '90' | '100'>('qualidade_foto', DEFAULTS.qualidadeFoto);
}

export function setQualidadeFoto(q: '50' | '75' | '90' | '100') {
  set('qualidade_foto', q);
}

export function getSalvarEm() {
  return get<'nuvem' | 'dispositivo' | 'ambos'>('salvar_em', DEFAULTS.salvarEm);
}

export function setSalvarEm(v: 'nuvem' | 'dispositivo' | 'ambos') {
  set('salvar_em', v);
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

export function getBackupIntervalo() {
  return Number(get('backup_intervalo', String(DEFAULTS.backupIntervalo))) as 30 | 60 | 360 | 1440;
}

export function setBackupIntervalo(n: 30 | 60 | 360 | 1440) {
  set('backup_intervalo', String(n));
}

export function getModoCompacto() {
  return get('modo_compacto', String(DEFAULTS.modoCompacto)) === 'true';
}

export function setModoCompacto(v: boolean) {
  set('modo_compacto', String(v));
}

export function getAltoContraste() {
  return get('alto_contraste', String(DEFAULTS.altoContraste)) === 'true';
}

export function setAltoContraste(v: boolean) {
  set('alto_contraste', String(v));
}

export function getFavoritos(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('vistoria_favoritos');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

export function toggleFavorito(bloco: string, apto: string): boolean {
  const key = `${bloco}__${apto}`;
  const favs = getFavoritos();
  if (favs.has(key)) { favs.delete(key); } else { favs.add(key); }
  try { localStorage.setItem('vistoria_favoritos', JSON.stringify([...favs])); } catch {}
  return favs.has(key);
}

export function isFavorito(bloco: string, apto: string): boolean {
  const key = `${bloco}__${apto}`;
  return getFavoritos().has(key);
}
