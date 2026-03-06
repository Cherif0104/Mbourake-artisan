import { useEffect } from 'react';
import { useToastContext } from '../contexts/ToastContext';
import { NEW_NOTIFICATION_EVENT } from '../hooks/useNotifications';
import type { Notification } from '../hooks/useNotifications';

/**
 * Écoute les nouvelles notifications (temps réel) et affiche un toast + vibration
 * pour un comportement type appli native, sans avoir à ouvrir la cloche.
 */
export function NotificationRealtimeToaster() {
  const { info } = useToastContext();

  useEffect(() => {
    const handle = (e: Event) => {
      const notification = (e as CustomEvent<Notification>).detail;
      if (!notification?.title) return;
      const text = notification.message
        ? `${notification.title}\n${notification.message}`
        : notification.title;
      info(text, 6000);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(200);
      }
    };

    window.addEventListener(NEW_NOTIFICATION_EVENT, handle);
    return () => window.removeEventListener(NEW_NOTIFICATION_EVENT, handle);
  }, [info]);

  return null;
}
