import AsyncStorage from '@react-native-async-storage/async-storage';
import { FotoLocal, AuthSession, BuildingConfig } from '../types';

const KEYS = {
  SESSION: '@cyble_auth_session',
  FOTOS: '@cyble_fotos_locais',
  CONCLUIDOS: '@cyble_concluidos_locais',
  BUILDING_CONFIG: '@cyble_building_config',
  SERVER_URL: '@cyble_server_url',
};

export const Storage = {
  // --- Auth Session ---
  async getSession(): Promise<AuthSession | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SESSION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async setSession(session: AuthSession): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SESSION, JSON.stringify(session));
    } catch (err) {
      console.error('Failed to set session', err);
    }
  },

  async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.SESSION);
    } catch (err) {
      console.error('Failed to clear session', err);
    }
  },

  // --- Fotos Locais ---
  async getFotos(): Promise<FotoLocal[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.FOTOS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveFoto(foto: FotoLocal): Promise<void> {
    try {
      const fotos = await Storage.getFotos();
      const existingIdx = fotos.findIndex(f => f.id === foto.id);
      if (existingIdx >= 0) {
        fotos[existingIdx] = foto;
      } else {
        fotos.unshift(foto);
      }
      await AsyncStorage.setItem(KEYS.FOTOS, JSON.stringify(fotos));
    } catch (err) {
      console.error('Failed to save foto', err);
    }
  },

  async updateFotoStatus(id: string, status: FotoLocal['status'], cloudUrl?: string, erro?: string): Promise<void> {
    try {
      const fotos = await Storage.getFotos();
      const item = fotos.find(f => f.id === id);
      if (item) {
        item.status = status;
        if (cloudUrl) item.cloudUrl = cloudUrl;
        if (erro) item.erro = erro;
        await AsyncStorage.setItem(KEYS.FOTOS, JSON.stringify(fotos));
      }
    } catch (err) {
      console.error('Failed to update foto status', err);
    }
  },

  // --- Concluidos ---
  async getConcluidos(): Promise<Record<string, string[]>> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CONCLUIDOS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  async setConcluidos(concluidos: Record<string, string[]>): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CONCLUIDOS, JSON.stringify(concluidos));
    } catch (err) {
      console.error('Failed to set concluidos', err);
    }
  },

  async addConcluido(bloco: string, apartamento: string): Promise<void> {
    try {
      const concluidos = await Storage.getConcluidos();
      if (!concluidos[bloco]) concluidos[bloco] = [];
      if (!concluidos[bloco].includes(apartamento)) {
        concluidos[bloco].push(apartamento);
        await Storage.setConcluidos(concluidos);
      }
    } catch (err) {
      console.error('Failed to add concluido', err);
    }
  },

  async removeConcluido(bloco: string, apartamento: string): Promise<void> {
    try {
      const concluidos = await Storage.getConcluidos();
      if (concluidos[bloco]) {
        concluidos[bloco] = concluidos[bloco].filter(a => a !== apartamento);
        await Storage.setConcluidos(concluidos);
      }
    } catch (err) {
      console.error('Failed to remove concluido', err);
    }
  },

  // --- Building Config ---
  async getBuildingConfig(): Promise<BuildingConfig> {
    try {
      const data = await AsyncStorage.getItem(KEYS.BUILDING_CONFIG);
      if (data) return JSON.parse(data);
    } catch {}

    // Configuração padrão idêntica ao PWA caso offline sem cache prévio
    return {
      torres: ['Torre A', 'Torre B', 'Torre C', 'Torre D', 'Torre E', 'Torre F', 'Torre G', 'Torre H'],
      andares: 16,
      aptosPorAndar: 8,
    };
  },

  async setBuildingConfig(config: BuildingConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.BUILDING_CONFIG, JSON.stringify(config));
    } catch (err) {
      console.error('Failed to set building config', err);
    }
  },
};
