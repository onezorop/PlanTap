import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import type { ViewMode, InAppNotification } from '../types';
import NotificationPanel from './NotificationPanel';
import Settings from './Settings';

export default function Header() {
  const { t } = useTranslation();
  const { viewMode, setViewMode } = useProjectStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadUnreadCount();

    if (window.electronAPI) {
      window.electronAPI.onNewNotification(() => {
        loadUnreadCount();
      });
    }

    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    if (window.electronAPI) {
      const notifications = await window.electronAPI.getInAppNotifications();
      setUnreadCount(notifications.filter((n: InAppNotification) => !n.read).length);
    }
  };

  const tabs: { mode: ViewMode; label: string; icon: string }[] = [
    { mode: 'list', label: t('header.listView'), icon: 'fa-solid fa-list' },
    { mode: 'gantt', label: t('header.ganttView'), icon: 'fa-solid fa-chart-gantt' },
  ];

  return (
    <>
      <header className="h-14 px-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {tabs.map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <i className={`${icon} mr-2`} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="btn-notion relative"
            >
              <i className="fa-solid fa-bell"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <NotificationPanel onClose={() => setShowNotifications(false)} />
            )}
          </div>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="btn-notion"
            title={t('header.settings')}
          >
            <i className="fa-solid fa-gear"></i>
          </button>
        </div>
      </header>

      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
