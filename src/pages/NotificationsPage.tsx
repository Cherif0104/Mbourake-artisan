import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, ArrowLeft, CheckCheck, Check, Briefcase, FileText, AlertTriangle,
  X, CreditCard, Shield, MessageSquare, Trash2
} from 'lucide-react';
import { useNotifications, type Notification } from '../hooks/useNotifications';
import { LoadingOverlay } from '../components/LoadingOverlay';

const NOTIFICATION_ICONS: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  new_project: { icon: <Briefcase size={20} />, color: 'text-blue-600', bg: 'bg-blue-100' },
  new_quote: { icon: <FileText size={20} />, color: 'text-purple-600', bg: 'bg-purple-100' },
  quote_accepted: { icon: <Check size={20} />, color: 'text-green-600', bg: 'bg-green-100' },
  quote_rejected: { icon: <X size={20} />, color: 'text-red-600', bg: 'bg-red-100' },
  project_completed: { icon: <Check size={20} />, color: 'text-green-600', bg: 'bg-green-100' },
  payment_received: { icon: <CreditCard size={20} />, color: 'text-green-600', bg: 'bg-green-100' },
  verification_approved: { icon: <Shield size={20} />, color: 'text-blue-600', bg: 'bg-blue-100' },
  verification_rejected: { icon: <Shield size={20} />, color: 'text-red-600', bg: 'bg-red-100' },
  new_message: { icon: <MessageSquare size={20} />, color: 'text-brand-600', bg: 'bg-brand-100' },
  quote_revision_requested: { icon: <AlertTriangle size={20} />, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  quote_revision_responded: { icon: <FileText size={20} />, color: 'text-blue-600', bg: 'bg-blue-100' },
  system: { icon: <Bell size={20} />, color: 'text-gray-600', bg: 'bg-gray-100' },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getNotificationTarget(notification: Notification): string {
  const { type, data } = notification;
  if (type === 'new_message' && data?.project_id) return `/chat/${data.project_id}`;
  if (type === 'new_quote' && data?.project_id) return data?.chat_enabled ? `/chat/${data.project_id}` : `/projects/${data.project_id}#devis`;
  if (type === 'quote_revision_requested' && data?.project_id && data?.revision_id) return `/projects/${data.project_id}?revision=${data.revision_id}`;
  if (type === 'quote_revision_requested') return '/revisions';
  if (type === 'project_completed' && data?.project_id) return `/projects/${data.project_id}#suivi`;
  if (data?.project_id && ['new_project', 'quote_accepted', 'quote_rejected', 'quote_revision_responded', 'system', 'dispute_raised'].includes(type)) {
    if (type === 'system' && data?.kind === 'quote_revision_requested' && data?.revision_id) return `/projects/${data.project_id}?revision=${data.revision_id}`;
    return `/projects/${data.project_id}#devis`;
  }
  if (['payment_received', 'verification_approved', 'verification_rejected'].includes(type)) return '/dashboard';
  return '/dashboard';
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, loading } = useNotifications();

  const handleClick = (notification: Notification) => {
    markAsRead(notification.id);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    navigate(getNotificationTarget(notification));
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-30 shadow-sm border-b border-gray-100/50">
        <div className="max-w-lg mx-auto px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                aria-label="Retour"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-black text-gray-900">Notifications</h1>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-sm text-brand-600 font-bold hover:underline flex items-center gap-1"
              >
                <CheckCheck size={16} />
                Tout lire
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Bell size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">Aucune notification</p>
            <p className="text-sm text-gray-400 mt-1">Vos alertes apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const iconConfig = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.system;
              return (
                <div
                  key={notification.id}
                  className={`bg-white rounded-2xl border overflow-hidden transition-colors ${
                    !notification.is_read ? 'border-brand-200 bg-brand-50/30' : 'border-gray-100'
                  }`}
                >
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => handleClick(notification)}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconConfig.bg} ${iconConfig.color}`}>
                      {iconConfig.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-bold text-gray-900 ${!notification.is_read ? '' : 'text-gray-700'}`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="w-2.5 h-2.5 bg-brand-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      {notification.message && (
                        <p className="text-sm text-gray-500 mt-0.5 truncate max-w-full">{notification.message}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2 font-medium">{formatRelativeTime(notification.created_at)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
