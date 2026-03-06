import { useNotificationsContext } from '../contexts/NotificationsContext';

// Réexport pour compatibilité
export type { Notification } from '../contexts/NotificationsContext';
export { NEW_NOTIFICATION_EVENT } from '../contexts/NotificationsContext';

/**
 * Hook notifications : lit le context global (NotificationsProvider).
 * Les notifications sont mises à jour en temps réel sur toute l’app (client et artisan),
 * avec son et toast, sans rafraîchir la page.
 */
export function useNotifications() {
  return useNotificationsContext();
}
