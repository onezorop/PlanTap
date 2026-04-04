import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore';
import type { NotificationSettings } from '../types';
import AISettings from './AISettings';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, language, setLanguage } = useSettingsStore();

  // App Settings State
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [currentLanguage, setCurrentLanguage] = useState(language);

  // Notification Settings State
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    inApp: { enabled: true },
    system: { enabled: true },
    email: { enabled: false, smtpHost: '', smtpPort: 587, smtpUser: '', smtpPassword: '', fromEmail: '' },
    dingtalk: { enabled: false, webhookUrl: '', secret: '' },
  });
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    if (window.electronAPI) {
      const settings = await window.electronAPI.getNotificationSettings();
      setNotifSettings(settings);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setCurrentTheme(newTheme);
    setTheme(newTheme);
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  const handleLanguageChange = (newLang: 'zh' | 'en' | 'fr' | 'ja') => {
    setCurrentLanguage(newLang);
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
  };

  const handleClose = async () => {
    // Save settings before closing
    if (window.electronAPI) {
      await window.electronAPI.updateNotificationSettings(notifSettings);
    }
    onClose();
  };

  const handleTestNotification = async () => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.sendTestNotification();
      setTestStatus({ type: 'success', message: t('notification.test') + ' OK!' });
    } catch (error) {
      setTestStatus({ type: 'error', message: String(error) });
    }
    setTimeout(() => setTestStatus({ type: '', message: '' }), 3000);
  };

  const handleTestDingtalk = async () => {
    if (!window.electronAPI) return;
    try {
      // Save current settings before testing (in case user enabled but didn't close modal)
      await window.electronAPI.updateNotificationSettings(notifSettings);
      const result = await window.electronAPI.sendTestDingTalkNotification();
      if (result.success) {
        setTestStatus({ type: 'success', message: result.message || 'OK!' });
      } else {
        setTestStatus({ type: 'error', message: result.error || 'Error' });
      }
    } catch (error) {
      setTestStatus({ type: 'error', message: String(error) });
    }
    setTimeout(() => setTestStatus({ type: '', message: '' }), 5000);
  };

  const languages = [
    { code: 'zh', label: '简体中文' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'ja', label: '日本語' },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-lg font-semibold">{t('header.settings')}</h2>
          <button onClick={handleClose} className="btn-notion">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Theme Settings */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <i className="fa-solid fa-palette text-blue-500"></i>
              {t('theme.title')}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex-1 py-2 px-4 rounded-md border transition-colors ${
                  currentTheme === 'light'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <i className="fa-solid fa-sun mr-2"></i>
                {t('theme.light')}
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex-1 py-2 px-4 rounded-md border transition-colors ${
                  currentTheme === 'dark'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <i className="fa-solid fa-moon mr-2"></i>
                {t('theme.dark')}
              </button>
              <button
                onClick={() => handleThemeChange('system')}
                className={`flex-1 py-2 px-4 rounded-md border transition-colors ${
                  currentTheme === 'system'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <i className="fa-solid fa-desktop mr-2"></i>
                {t('theme.system')}
              </button>
            </div>
          </div>

          {/* Language Settings */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <i className="fa-solid fa-globe text-blue-500"></i>
              {t('language.title')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code as any)}
                  className={`py-2 px-4 rounded-md border transition-colors ${
                    currentLanguage === lang.code
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* Notification Settings */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <i className="fa-solid fa-bell text-blue-500"></i>
              {t('notification.settings')}
            </h3>

            {/* Notification type checkboxes - stacked */}
            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2 cursor-pointer p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  checked={notifSettings.inApp.enabled}
                  onChange={(e) => setNotifSettings({ ...notifSettings, inApp: { ...notifSettings.inApp, enabled: e.target.checked } })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span>应用内通知</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  checked={notifSettings.system?.enabled}
                  onChange={(e) => setNotifSettings({ ...notifSettings, system: { ...notifSettings.system, enabled: e.target.checked } })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span>系统通知</span>
              </label>
            </div>

            <label className="flex items-center gap-2 cursor-pointer p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
              <input
                type="checkbox"
                checked={notifSettings.dingtalk.enabled}
                onChange={(e) => setNotifSettings({ ...notifSettings, dingtalk: { ...notifSettings.dingtalk, enabled: e.target.checked } })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span>{t('notification.dingtalk')}</span>
            </label>

            {/* DingTalk config */}
            {notifSettings.dingtalk.enabled && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-3 space-y-2">
                <input
                  type="text"
                  placeholder="Webhook URL"
                  value={notifSettings.dingtalk.webhookUrl}
                  onChange={(e) => setNotifSettings({ ...notifSettings, dingtalk: { ...notifSettings.dingtalk, webhookUrl: e.target.value } })}
                  className="input-notion w-full"
                />
                <input
                  type="text"
                  placeholder="Secret (可选)"
                  value={notifSettings.dingtalk.secret}
                  onChange={(e) => setNotifSettings({ ...notifSettings, dingtalk: { ...notifSettings.dingtalk, secret: e.target.value } })}
                  className="input-notion w-full"
                />
                <button
                  onClick={handleTestDingtalk}
                  className="btn-notion text-sm"
                >
                  <i className="fa-solid fa-paper-plane mr-2"></i>
                  {t('notification.testDingtalk')}
                </button>
              </div>
            )}

            {/* Email */}
            <div className="mt-3">
              <label className="flex items-center gap-2 cursor-pointer p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  checked={notifSettings.email.enabled}
                  onChange={(e) => setNotifSettings({ ...notifSettings, email: { ...notifSettings.email, enabled: e.target.checked } })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span>{t('notification.email')}</span>
              </label>
              {notifSettings.email.enabled && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mt-2 space-y-2">
                  <input
                    type="text"
                    placeholder="SMTP Host"
                    value={notifSettings.email.smtpHost}
                    onChange={(e) => setNotifSettings({ ...notifSettings, email: { ...notifSettings.email, smtpHost: e.target.value } })}
                    className="input-notion w-full"
                  />
                  <input
                    type="number"
                    placeholder="Port"
                    value={notifSettings.email.smtpPort}
                    onChange={(e) => setNotifSettings({ ...notifSettings, email: { ...notifSettings.email, smtpPort: parseInt(e.target.value) || 587 } })}
                    className="input-notion w-full"
                  />
                  <input
                    type="text"
                    placeholder="Username"
                    value={notifSettings.email.smtpUser}
                    onChange={(e) => setNotifSettings({ ...notifSettings, email: { ...notifSettings.email, smtpUser: e.target.value } })}
                    className="input-notion w-full"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={notifSettings.email.smtpPassword}
                    onChange={(e) => setNotifSettings({ ...notifSettings, email: { ...notifSettings.email, smtpPassword: e.target.value } })}
                    className="input-notion w-full"
                  />
                  <input
                    type="email"
                    placeholder="From Email"
                    value={notifSettings.email.fromEmail}
                    onChange={(e) => setNotifSettings({ ...notifSettings, email: { ...notifSettings.email, fromEmail: e.target.value } })}
                    className="input-notion w-full"
                  />
                </div>
              )}
            </div>

            {/* Test notification */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleTestNotification}
                className="btn-notion"
              >
                <i className="fa-solid fa-bell mr-2"></i>
                {t('notification.test')}
              </button>
              {testStatus.message && (
                <span className={`text-sm ${testStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                  {testStatus.message}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* AI Settings */}
          <AISettings />
        </div>
      </div>
    </div>
  );
}
