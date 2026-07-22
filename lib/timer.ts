/**
 * Timer de escaneamento — calcula tempo gasto por apto e por torre.
 *
 * Este modulo esta disponivel para uso futuro, mas nao e importado
 * em nenhum componente no momento.
 */

export interface TempoRegistro {
  apto: string;
  inicio: number;
  fim: number;
}

export function calcularTempoApo(registros: TempoRegistro[], apto: string): number {
  const relevantes = registros.filter((r) => r.apto === apto);
  if (relevantes.length === 0) return 0;
  return relevantes.reduce((acc, r) => acc + (r.fim - r.inicio), 0);
}

export function calcularTempoPorTorre(registros: TempoRegistro[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of registros) {
    map.set(r.apto, (map.get(r.apto) ?? 0) + (r.fim - r.inicio));
  }
  return map;
}

export function formatarTempo(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seg = Math.floor(ms / 1000);
  if (seg < 60) return `${seg}s`;
  const min = Math.floor(seg / 60);
  const segRest = seg % 60;
  return `${min}m ${segRest}s`;
}
