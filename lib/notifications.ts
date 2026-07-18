export interface Notificacao {
  id: string;
  tipo: 'sync' | 'backup' | 'update' | 'storage' | 'error' | 'success';
  titulo: string;
  mensagem: string;
  timestamp: number;
  lida: boolean;
  acaoLabel?: string;
  onAcao?: () => void;
}

type Listener = () => void;

let notifications: Notificacao[] = [];
const listeners: Set<Listener> = new Set();
let idCounter = 0;

function emit() {
  listeners.forEach((fn) => fn());
}

export function addNotification(n: Omit<Notificacao, 'id' | 'timestamp' | 'lida'>): string {
  const id = `n_${++idCounter}_${Date.now()}`;
  const entry: Notificacao = { ...n, id, timestamp: Date.now(), lida: false };
  notifications = [entry, ...notifications].slice(0, 50);
  emit();
  return id;
}

export function markAsRead(id: string) {
  notifications = notifications.map((n) => (n.id === id ? { ...n, lida: true } : n));
  emit();
}

export function markAllAsRead() {
  notifications = notifications.map((n) => ({ ...n, lida: true }));
  emit();
}

export function clearAll() {
  notifications = [];
  emit();
}

export function removeNotification(id: string) {
  notifications = notifications.filter((n) => n.id !== id);
  emit();
}

export function getNotifications(): Notificacao[] {
  return notifications;
}

export function getUnreadCount(): number {
  return notifications.filter((n) => !n.lida).length;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function autoDismiss(id: string, ms: number) {
  setTimeout(() => removeNotification(id), ms);
}
