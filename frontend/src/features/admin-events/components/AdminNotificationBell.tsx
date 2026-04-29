import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AdminNotification,
} from '../services/adminNotificationService';

function BellIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : '1.5'}
    >
      <path d="M15 18H5.8c-.7 0-1.1-.8-.7-1.3l1.1-1.4a4 4 0 0 0 .8-2.5V10a5 5 0 0 1 10 0v2.8c0 .9.3 1.8.8 2.5l1.1 1.4c.4.5 0 1.3-.7 1.3H15Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

interface AdminNotificationBellProps {
  onNavigateToPayments?: () => void;
}

export default function AdminNotificationBell({ onNavigateToPayments }: AdminNotificationBellProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Load notifications
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await getAdminNotifications(10);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tính toán vị trí dropdown khi mở
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'absolute',
        top: rect.bottom + window.scrollY + 8, // 8px margin
        left: rect.right - 320 + window.scrollX, // 320px là width của dropdown
        zIndex: 9999,
        minWidth: 320,
      });
    }
  }, [isOpen]);

  const handleNotificationClick = async (notification: AdminNotification) => {
    // Mark as read
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate based on notification type
    if (notification.type === 'payment_pending' || notification.type === 'payment_review') {
      onNavigateToPayments?.();
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_pending':
      case 'payment_review':
        return '💳';
      case 'event_alert':
        return '📅';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'payment_pending':
        return 'text-amber-600';
      case 'payment_review':
        return 'text-orange-600';
      case 'event_alert':
        return 'text-blue-600';
      case 'system':
        return 'text-slate-600';
      default:
        return 'text-slate-600';
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 hover:border-slate-400"
      >
        <BellIcon filled={unreadCount > 0} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div ref={notificationsRef} style={dropdownStyle} className="rounded-xl border border-slate-200 bg-white shadow-lg" >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-700">Thông báo admin</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                Đánh dấu đã xem
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto w-80">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-orange-500" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Không có thông báo nào
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {notifications.map(notification => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full px-4 py-3 text-left text-sm transition hover:bg-slate-50 ${
                      !notification.isRead ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${getNotificationColor(notification.type)}`}>
                          {notification.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {new Date(notification.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="mt-1 flex-shrink-0 h-2 w-2 rounded-full bg-orange-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-center">
              <button
                type="button"
                onClick={loadNotifications}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                Làm mới
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
