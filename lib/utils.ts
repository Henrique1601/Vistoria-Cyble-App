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
