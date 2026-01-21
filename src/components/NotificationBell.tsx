import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, X, Check, CheckCheck, Briefcase, FileText, AlertTriangle,
  RotateCcw, CreditCard, Shield, MessageSquare, ChevronRight,
  Trash2
} from 'lucide-react';
import { useNotifications, type Notification } from '../hooks/useNotifications';

// Icon mapping for notification types
const NOTIFICATION_ICONS: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  new_project: { icon: <Briefcase size={16} />, color: 'text-blue-600', bg: 'bg-blue-100' },
  new_quote: { icon: <FileText size={16} />, color: 'text-purple-600', bg: 'bg-purple-100' },
  quote_accepted: { icon: <Check size={16} />, color: 'text-green-600', bg: 'bg-green-100' },
  quote_rejected: { icon: <X size={16} />, color: 'text-red-600', bg: 'bg-red-100' },
  project_completed: { icon: <Check size={16} />, color: 'text-green-600', bg: 'bg-green-100' },
  payment_received: { icon: <CreditCard size={16} />, color: 'text-green-600', bg: 'bg-green-100' },
  verification_approved: { icon: <Shield size={16} />, color: 'text-blue-600', bg: 'bg-blue-100' },
  verification_rejected: { icon: <Shield size={16} />, color: 'text-red-600', bg: 'bg-red-100' },
  new_message: { icon: <MessageSquare size={16} />, color: 'text-brand-600', bg: 'bg-brand-100' },
  quote_revision_requested: { icon: <AlertTriangle size={16} />, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  quote_revision_responded: { icon: <FileText size={16} />, color: 'text-blue-600', bg: 'bg-blue-100' },
  system: { icon: <Bell size={16} />, color: 'text-gray-600', bg: 'bg-gray-100' },
};

// Format relative time
const formatRelativeTime = (dateString: string): string => {
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
};

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    const { data } = notification;
    
    // Forcer le scroll en haut avant la navigation
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    switch (notification.type) {
      case 'new_project':
      case 'quote_accepted':
      case 'quote_rejected':
      case 'project_completed':
        if (data?.project_id) {
          navigate(`/projects/${data.project_id}`);
        }
        break;
      case 'quote_revision_requested':
        // Rediriger vers la page du projet avec le paramètre de révision
        if (data?.project_id && data?.revision_id) {
          navigate(`/projects/${data.project_id}?revision=${data.revision_id}`);
        } else if (data?.project_id) {
          navigate(`/projects/${data.project_id}`);
        }
        break;
      case 'quote_revision_responded':
        // Rediriger vers la page du projet pour voir la réponse
        if (data?.project_id) {
          navigate(`/projects/${data.project_id}`);
        }
        break;
      case 'new_quote':
        if (data?.project_id) {
          // Si le chat est explicitement activé, ouvrir directement la conversation
          if (data?.chat_enabled) {
            navigate(`/chat/${data.project_id}`);
          } else {
            navigate(`/projects/${data.project_id}`);
          }
        }
        break;
      case 'payment_received':
        navigate('/dashboard');
        break;
      case 'verification_approved':
      case 'verification_rejected':
        navigate('/dashboard');
        break;
      case 'new_message':
        if (data?.project_id) {
          navigate(`/chat/${data.project_id}`);
        }
        break;
      default:
        navigate('/dashboard');
    }
    
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
          isOpen 
            ? 'bg-brand-500 text-white' 
            : 'bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-500'
        }`}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllAsRead()}
                className="text-xs text-brand-500 font-bold hover:underline flex items-center gap-1"
              >
                <CheckCheck size={14} />
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={32} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium text-sm">Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.slice(0, 20).map((notification) => {
                  const iconConfig = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.system;
                  
                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                        !notification.is_read ? 'bg-brand-50/30' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconConfig.bg} ${iconConfig.color}`}>
                        {iconConfig.icon}
                      </div>
                      
                      {/* Content */}
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-bold text-gray-900 ${!notification.is_read ? '' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        {notification.message && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1 font-medium">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <button 
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="w-full text-center text-xs text-brand-500 font-bold hover:underline flex items-center justify-center gap-1"
              >
                Voir toutes les notifications
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
