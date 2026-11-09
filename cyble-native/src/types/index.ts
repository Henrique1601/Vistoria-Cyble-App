export type FotoCategoria = 'cyble_antes' | 'cyble_depois' | 'documento';

export type FotoStatus = 'pendente' | 'enviando' | 'enviado' | 'erro';

export interface FotoLocal {
  id: string;
  uri: string;
  bloco: string;
  apartamento: string;
  categoria: FotoCategoria;
  timestamp: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  status: FotoStatus;
  cloudUrl?: string;
  erro?: string;
}

export interface ApartamentoItem {
  numero: string;
  bloco: string;
  concluido: boolean;
  fotosCount: number;
  hasAntes: boolean;
  hasDepois: boolean;
  hasDoc: boolean;
}

export interface BuildingConfig {
  torres: string[];
  andares: number;
  aptosPorAndar: number;
  lista?: Record<string, string[]>;
}

export interface AuthSession {
  pin: string;
  role: 'admin' | 'viewer';
  authenticated: boolean;
}

export interface TowerStats {
  total: number;
  concluidos: number;
  percentual: number;
  timestamp: number;
}
