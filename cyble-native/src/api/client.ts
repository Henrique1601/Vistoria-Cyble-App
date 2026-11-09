import { API_BASE_URL } from '../constants/theme';
import { FotoLocal, BuildingConfig, TowerStats } from '../types';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async validatePin(pin: string): Promise<{ ok: boolean; role?: 'admin' | 'viewer'; error?: string }> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-pin': pin,
        },
        body: JSON.stringify({ pin }),
      });

      if (!resp.ok) {
        return { ok: false, error: 'PIN inválido ou conexão indisponível' };
      }

      const data = await resp.json();
      return { ok: true, role: data.role || 'viewer' };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Falha na conexão' };
    }
  }

  async fetchStatus(pin: string): Promise<Record<string, TowerStats>> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/status`, {
        method: 'GET',
        headers: { 'x-app-pin': pin },
      });
      if (!resp.ok) return {};
      const data = await resp.json();
      return data.status || {};
    } catch {
      return {};
    }
  }

  async fetchConcluidos(pin: string): Promise<Record<string, string[]>> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/concluidos`, {
        method: 'GET',
        headers: { 'x-app-pin': pin },
      });
      if (!resp.ok) return {};
      return await resp.json();
    } catch {
      return {};
    }
  }

  async fetchBuildingConfig(pin: string): Promise<BuildingConfig | null> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/building-config`, {
        method: 'GET',
        headers: { 'x-app-pin': pin },
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    }
  }

  async uploadFoto(foto: FotoLocal, pin: string): Promise<{ ok: boolean; url?: string; error?: string }> {
    try {
      const formData = new FormData();

      const filename = `${foto.categoria}-${foto.timestamp}.jpg`;
      formData.append('file', {
        uri: foto.uri,
        name: filename,
        type: 'image/jpeg',
      } as any);

      formData.append('bloco', foto.bloco);
      formData.append('apartamento', foto.apartamento);
      formData.append('categoria', foto.categoria);
      formData.append('timestamp', String(foto.timestamp));
      formData.append('provedor_nuvem', 'blob');

      const resp = await fetch(`${this.baseUrl}/api/upload`, {
        method: 'POST',
        headers: {
          'x-app-pin': pin,
        },
        body: formData,
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return { ok: false, error: `Upload falhou (${resp.status}): ${errText}` };
      }

      const resData = await resp.json();
      return { ok: true, url: resData.url };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Erro de rede no upload' };
    }
  }

  async marcarConcluido(bloco: string, apartamento: string, pin: string): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-pin': pin,
        },
        body: JSON.stringify({ bloco, apartamento, concluido: true }),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async desmarcarConcluido(bloco: string, apartamento: string, pin: string): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/status`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-app-pin': pin,
        },
        body: JSON.stringify({ bloco, apartamento }),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }
}

export const api = new ApiClient();
