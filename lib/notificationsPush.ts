import { addNotification } from './notifications';

function getPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showBrowserNotification(titulo: string, mensagem: string, opts?: NotificationOptions) {
  if (getPermission() !== 'granted') {
    // Fallback to in-app notification
    addNotification({ tipo: 'success', titulo, mensagem });
    return;
  }

  try {
    const n = new Notification(titulo, {
      body: mensagem,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'vistoria-cyble',
      renotify: true,
      ...opts,
    } as NotificationOptions);

    n.onclick = () => {
      window.focus();
      n.close();
    };

    setTimeout(() => n.close(), 8000);
  } catch {
    addNotification({ tipo: 'success', titulo, mensagem });
  }
}

export function notifySyncComplete(pendentes: number, enviados: number) {
  showBrowserNotification(
    'Sincronizacao concluida',
    `${enviados} foto(s) enviada(s) com sucesso${pendentes > 0 ? `. ${pendentes} pendente(s)` : ''}`
  );
}

export function notifyBackupComplete() {
  showBrowserNotification(
    'Backup automatico',
    'Backup realizado com sucesso'
  );
}

export function notifyPrazoApto(apartamento: string, bloco: string, diasRestantes: number) {
  showBrowserNotification(
    'Apto com prazo proximo',
    `${bloco} ${apartamento} — ${diasRestantes} dia(s) restante(s)`,
    { tag: `prazo-${bloco}-${apartamento}` }
  );
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}
