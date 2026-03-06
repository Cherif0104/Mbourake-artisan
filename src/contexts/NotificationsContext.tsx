import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

/** Joue un son de notification : .mp3 si dispo, sinon beep Web Audio. */
function playNotificationSound() {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.35;
    audio.play().catch(() => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        o.start(ctx.currentTime);
        o.stop(ctx.currentTime + 0.15);
      } catch { /* fallback ignoré */ }
    });
  } catch {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.15);
    } catch { /* ignoré */ }
  }
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'new_project' | 'new_quote' | 'quote_accepted' | 'quote_rejected' | 'project_completed' | 'payment_received' | 'verification_approved' | 'verification_rejected' | 'new_message' | 'quote_revision_requested' | 'quote_revision_responded' | 'dispute_raised' | 'system';
  title: string;
  message: string | null;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

/** Événement émis à chaque nouvelle notification (toast + vibration). */
export const NEW_NOTIFICATION_EVENT = 'mbourake-new-notification';

export interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  unreadMessageCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsReadForProject: (projectId: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const defaultValue: NotificationsContextValue = {
  notifications: [],
  unreadCount: 0,
  unreadMessageCount: 0,
  loading: false,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  markAsReadForProject: async () => {},
  deleteNotification: async () => {},
  refresh: async () => {},
};

const NotificationsContext = createContext<NotificationsContextValue>(defaultValue);

/**
 * Provider global : garde un abonnement Realtime actif tant que l'utilisateur est connecté.
 * Ainsi les notifications arrivent en temps réel sur toutes les pages (client et artisan),
 * avec son et toast, sans avoir à rafraîchir.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
      setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [user]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return;
    try {
      await supabase.from('notifications').delete().eq('id', notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [user]);

  const markAsReadForProject = useCallback(async (projectId: string) => {
    if (!user) return;
    const toMark = notifications.filter(
      n => !n.is_read && n.type === 'new_message' && n.data?.project_id === projectId
    );
    if (toMark.length === 0) return;
    try {
      await Promise.all(toMark.map(n => supabase.from('notifications').update({ is_read: true }).eq('id', n.id)));
      const ids = new Set(toMark.map(n => n.id));
      setNotifications(prev => prev.map(n => (ids.has(n.id) ? { ...n, is_read: true } : n)));
      setUnreadCount(c => Math.max(0, c - toMark.length));
    } catch (err) {
      console.error('Error marking notifications as read for project:', err);
    }
  }, [user, notifications]);

  // Abonnement Realtime : actif sur toute l’app dès que l’utilisateur est connecté (instantané, sans refresh)
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchNotifications();

    const channelName = `notifications_${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          playNotificationSound();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(NEW_NOTIFICATION_EVENT, { detail: newNotification }));
          }
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(200);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          const oldRow = payload.old as { is_read?: boolean } | undefined;
          setNotifications(prev => prev.map(n => (n.id === updated.id ? { ...n, ...updated } : n)));
          if (updated.is_read && !oldRow?.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          } else if (!updated.is_read && oldRow?.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' && err) {
          console.warn('[Notifications] Realtime channel error, will retry on next mount:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  // Titre de l’onglet avec badge
  useEffect(() => {
    const base = 'Mbourake';
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${base}`;
    } else {
      document.title = base;
    }
    return () => {
      document.title = base;
    };
  }, [unreadCount]);

  const unreadMessageCount = notifications.filter(n => !n.is_read && n.type === 'new_message').length;

  const value: NotificationsContextValue = {
    notifications,
    unreadCount,
    unreadMessageCount,
    loading,
    markAsRead,
    markAllAsRead,
    markAsReadForProject,
    deleteNotification,
    refresh: fetchNotifications,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext(): NotificationsContextValue {
  return useContext(NotificationsContext);
}
