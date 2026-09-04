export function normApto(a: string): string {
  return a.replace(/^0+/, '') || '0';
}

/** Return today's date as YYYY-MM-DD using local time (not UTC). */
export function hoje(): string {
  return formatarDataParaInput(new Date());
}

export function formatarDataParaInput(data: Date): string {
  const ano = data.getFullYear();
  const mes = (data.getMonth() + 1).toString().padStart(2, '0');
  const dia = data.getDate().toString().padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function formatarDataDisplay(dataStr: string): string {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function obterDataInicio(diasAtras: number): string {
  const data = new Date();
  data.setDate(data.getDate() - diasAtras);
  return formatarDataParaInput(data);
}

export function obterDataFim(): string {
  return formatarDataParaInput(new Date());
}

export function estaNoIntervalo(dataStr: string, inicio: string, fim: string): boolean {
  if (!dataStr) return false;
  if (inicio && dataStr < inicio) return false;
  if (fim && dataStr > fim) return false;
  return true;
}

export function obterPeriodoAtalho(atalho: 'hoje' | 'semana' | 'mes' | 'trimestre'): {
  inicio: string;
  fim: string;
} {
  const fim = obterDataFim();
  let inicio: string;

  switch (atalho) {
    case 'hoje':
      inicio = fim;
      break;
    case 'semana':
      inicio = obterDataInicio(7);
      break;
    case 'mes':
      inicio = obterDataInicio(30);
      break;
    case 'trimestre':
      inicio = obterDataInicio(90);
      break;
  }

  return { inicio, fim };
}

export function normalizeBloco(b: string): string {
  const letter = b.replace(/^Torre\s+/i, '').trim();
  if (letter.length === 1 && /^[A-H]$/i.test(letter)) {
    return `Torre ${letter.toUpperCase()}`;
  }
  return b;
}

/** Consistent map key for foto lookups: normalize both bloco and apartamento. */
export function fotosMapKey(bloco: string, apartamento: string): string {
  return `${normalizeBloco(bloco)}__${normApto(apartamento)}`;
}

export interface ApartamentoStatus {
  cybleAntesFeito: boolean;
  cybleDepoisFeito: boolean;
}

export function emAndamento(s: ApartamentoStatus): boolean {
  const temFoto = s.cybleAntesFeito || s.cybleDepoisFeito;
  const completo = s.cybleAntesFeito && s.cybleDepoisFeito;
  return temFoto && !completo;
}

/** Formata o nome do arquivo de foto para download no padrão: Torre_A_Apto_101_Documento.jpg */
export function formatarNomeFotoDownload(
  bloco: string,
  apartamento: string,
  categoria: string,
  extensao = 'jpg'
): string {
  const blocoNorm = normalizeBloco(bloco || 'Torre');
  const blocoFormatado = blocoNorm.trim().replace(/\s+/g, '_');

  const aptoLimpo = normApto(apartamento || '0').replace(/^apto[_\s-]*/i, '');
  const aptoFormatado = `Apto_${aptoLimpo}`;

  let catFormatada = 'Foto';
  const c = (categoria || '').toLowerCase().trim();
  if (c === 'cyble_antes' || c === 'cyble antes' || c === 'antes') {
    catFormatada = 'Cyble_Antes';
  } else if (c === 'cyble_depois' || c === 'cyble depois' || c === 'depois') {
    catFormatada = 'Cyble_Depois';
  } else if (c === 'documento' || c === 'doc') {
    catFormatada = 'Documento';
  } else {
    catFormatada = (categoria || 'Foto')
      .trim()
      .replace(/[\s-]+/g, '_')
      .replace(/^([a-z])/, (_, letter) => letter.toUpperCase());
  }

  const extLimpa = extensao.replace(/^\.+/, '');
  return `${blocoFormatado}_${aptoFormatado}_${catFormatada}.${extLimpa}`;
}
