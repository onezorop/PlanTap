import { useState, useEffect } from 'react';
import type { NotificationSettings } from '../types';

interface NotificationSettingsProps {
  onClose: () => void;
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    inApp: { enabled: true },
    system: { enabled: true },
    email: { enabled: false, smtpHost: '', smtpPort: 587, smtpUser: '', smtpPassword: '', fromEmail: '' },
    dingtalk: { enabled: false, webhookUrl: '', secret: '' },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (window.electronAPI) {
      const s = await window.electronAPI.getNotificationSettings();
      setSettings(s);
    }
  };

  const handleSave = async () => {
    if (window.electronAPI) {
      setSaving(true);
      await window.electronAPI.updateNotificationSettings(settings);
      setSaving(false);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">通知设置</h2>
          <button onClick={onClose} className="btn-notion">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* In-App Notifications */}
          <div className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <i className="fa-solid fa-bell text-gray-600"></i>
              <h3 className="font-medium">应用内通知</h3>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.inApp.enabled}
                onChange={(e) => setSettings({ ...settings, inApp: { ...settings.inApp, enabled: e.target.checked } })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-600">启用应用内通知</span>
            </label>
          </div>

          {/* Email Notifications */}
          <div className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <i className="fa-solid fa-envelope text-gray-600"></i>
              <h3 className="font-medium">邮件通知</h3>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={settings.email.enabled}
                onChange={(e) => setSettings({ ...settings, email: { ...settings.email, enabled: e.target.checked } })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-600">启用邮件通知</span>
            </label>

            {settings.email.enabled && (
              <div className="space-y-3 pl-7">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">SMTP 服务器</label>
                  <input
                    type="text"
                    className="input-notion"
                    value={settings.email.smtpHost}
                    onChange={(e) => setSettings({ ...settings, email: { ...settings.email, smtpHost: e.target.value } })}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">端口</label>
                  <input
                    type="number"
                    className="input-notion"
                    value={settings.email.smtpPort}
                    onChange={(e) => setSettings({ ...settings, email: { ...settings.email, smtpPort: Number(e.target.value) } })}
                    placeholder="587"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">发件人邮箱</label>
                  <input
                    type="email"
                    className="input-notion"
                    value={settings.email.fromEmail}
                    onChange={(e) => setSettings({ ...settings, email: { ...settings.email, fromEmail: e.target.value } })}
                    placeholder="noreply@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">用户名</label>
                  <input
                    type="text"
                    className="input-notion"
                    value={settings.email.smtpUser}
                    onChange={(e) => setSettings({ ...settings, email: { ...settings.email, smtpUser: e.target.value } })}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">密码</label>
                  <input
                    type="password"
                    className="input-notion"
                    value={settings.email.smtpPassword}
                    onChange={(e) => setSettings({ ...settings, email: { ...settings.email, smtpPassword: e.target.value } })}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}
          </div>

          {/* DingTalk Notifications */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <i className="fa-brands fa-docker text-gray-600"></i>
              <h3 className="font-medium">钉钉通知</h3>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={settings.dingtalk.enabled}
                onChange={(e) => setSettings({ ...settings, dingtalk: { ...settings.dingtalk, enabled: e.target.checked } })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-600">启用钉钉通知</span>
            </label>

            {settings.dingtalk.enabled && (
              <div className="space-y-3 pl-7">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Webhook URL</label>
                  <input
                    type="text"
                    className="input-notion"
                    value={settings.dingtalk.webhookUrl}
                    onChange={(e) => setSettings({ ...settings, dingtalk: { ...settings.dingtalk, webhookUrl: e.target.value } })}
                    placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">加签密钥 (Secret)</label>
                  <input
                    type="text"
                    className="input-notion"
                    value={settings.dingtalk.secret}
                    onChange={(e) => setSettings({ ...settings, dingtalk: { ...settings.dingtalk, secret: e.target.value } })}
                    placeholder="SECxxxxxxxx"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-notion">取消</button>
          <button onClick={handleSave} disabled={saving} className="btn-notion-primary">
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}
