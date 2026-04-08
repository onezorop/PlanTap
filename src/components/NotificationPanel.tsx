import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { InAppNotification } from '../types';

interface NotificationPanelProps {
  onClose: () => void;
  onUnreadCountChange?: () => void;
}

export default function NotificationPanel({ onUnreadCountChange }: NotificationPanelProps) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  useEffect(() => {
    loadNotifications();

    // Listen for new notifications
    if (window.electronAPI) {
      window.electronAPI.onNewNotification(() => {
        loadNotifications();
      });
    }
  }, []);

  const loadNotifications = async () => {
    if (window.electronAPI) {
      const notifs = await window.electronAPI.getInAppNotifications();
      setNotifications(notifs);
    }
  };

  const handleMarkRead = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.markNotificationRead(id);
      loadNotifications();
      onUnreadCountChange?.();
    }
  };

  const handleMarkAllRead = async () => {
    if (window.electronAPI) {
      await window.electronAPI.markAllNotificationsRead();
      loadNotifications();
      onUnreadCountChange?.();
    }
  };

  const handleClear = async () => {
    if (window.electronAPI) {
      await window.electronAPI.clearNotifications();
      loadNotifications();
      onUnreadCountChange?.();
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task':
        return 'fa-solid fa-check-square text-blue-500';
      case 'phase':
        return 'fa-solid fa-layer-group text-yellow-500';
      default:
        return 'fa-solid fa-bell text-gray-500';
    }
  };

  const formatTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">通知</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleMarkAllRead} className="text-xs text-gray-500 hover:text-gray-700">
            全部已读
          </button>
          <button onClick={handleClear} className="text-xs text-gray-500 hover:text-gray-700">
            清空
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <i className="fa-solid fa-bell-slash text-2xl mb-2"></i>
            <p className="text-sm">{t('notification.noNotifications')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notif.read ? 'bg-blue-50/50' : ''
                }`}
                onClick={() => handleMarkRead(notif.id)}
              >
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    !notif.read ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <i className={`${getTypeIcon(notif.type)} text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{notif.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatTime(notif.createdAt)}</p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
