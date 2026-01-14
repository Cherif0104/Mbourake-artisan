import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  user_id: string;
  type: 'new_project' | 'new_quote' | 'quote_accepted' | 'quote_rejected' | 'revision_requested' | 'project_completed' | 'payment_received' | 'verification_approved' | 'verification_rejected' | 'new_message' | 'system';
  title: string;
  message: string | null;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

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

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [user]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [user]);

  // Delete a notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [user]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications_realtime')
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
          
          // Play notification sound (optional)
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
}
