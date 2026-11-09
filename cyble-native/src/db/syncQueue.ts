import { Storage } from './storage';
import { api } from '../api/client';
import { FotoLocal } from '../types';

type SyncListener = (pendingCount: number, isSyncing: boolean) => void;

class SyncQueueManager {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(pendingCount: number) {
    this.listeners.forEach(fn => fn(pendingCount, this.isSyncing));
  }

  async getPendingCount(): Promise<number> {
    const fotos = await Storage.getFotos();
    return fotos.filter(f => f.status === 'pendente' || f.status === 'erro').length;
  }

  async startSync(): Promise<void> {
    if (this.isSyncing) return;

    const session = await Storage.getSession();
    if (!session || !session.pin || session.role !== 'admin') {
      // Somente admin realiza upload
      return;
    }

    this.isSyncing = true;
    let pending = await this.getPendingCount();
    this.notify(pending);

    try {
      const fotos = await Storage.getFotos();
      const fila = fotos.filter(f => f.status === 'pendente' || f.status === 'erro');

      for (const foto of fila) {
        await Storage.updateFotoStatus(foto.id, 'enviando');

        const res = await api.uploadFoto(foto, session.pin);
        if (res.ok && res.url) {
          await Storage.updateFotoStatus(foto.id, 'enviado', res.url);
        } else {
          await Storage.updateFotoStatus(foto.id, 'erro', undefined, res.error || 'Erro no envio');
        }

        pending = await this.getPendingCount();
        this.notify(pending);
      }
    } finally {
      this.isSyncing = false;
      pending = await this.getPendingCount();
      this.notify(pending);
    }
  }
}

export const syncQueue = new SyncQueueManager();
