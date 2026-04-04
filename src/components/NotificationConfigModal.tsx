import { useState } from 'react';
import type { NotificationConfig } from '../types';

interface NotificationConfigModalProps {
  config: NotificationConfig;
  onSave: (config: NotificationConfig) => void;
  onClose: () => void;
}

export default function NotificationConfigModal({ config, onSave, onClose }: NotificationConfigModalProps) {
  const [formData, setFormData] = useState<NotificationConfig>({
    enabled: config.enabled ?? false,
    advanceMinutes: config.advanceMinutes ?? 60,
    repeatIntervalMinutes: config.repeatIntervalMinutes ?? 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const advanceOptions = [
    { value: 15, label: '15 分钟' },
    { value: 30, label: '30 分钟' },
    { value: 60, label: '1 小时' },
    { value: 120, label: '2 小时' },
    { value: 1440, label: '1 天' },
    { value: 2880, label: '2 天' },
    { value: 10080, label: '1 周' },
  ];

  const repeatOptions = [
    { value: 0, label: '不重复（仅通知一次）' },
    { value: 30, label: '每 30 分钟' },
    { value: 60, label: '每 1 小时' },
    { value: 240, label: '每 4 小时' },
    { value: 1440, label: '每天' },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">通知设置</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium text-gray-700">启用通知</span>
          </label>

          {formData.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  提前多久通知
                </label>
                <select
                  className="select-notion w-full"
                  value={formData.advanceMinutes}
                  onChange={(e) => setFormData({ ...formData, advanceMinutes: Number(e.target.value) })}
                >
                  {advanceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  在截止时间前 {advanceOptions.find((o) => o.value === formData.advanceMinutes)?.label} 发送通知
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  重复通知周期
                </label>
                <select
                  className="select-notion w-full"
                  value={formData.repeatIntervalMinutes}
                  onChange={(e) => setFormData({ ...formData, repeatIntervalMinutes: Number(e.target.value) })}
                >
                  {repeatOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {formData.repeatIntervalMinutes === 0
                    ? '将在截止时间到达时发送一次通知'
                    : `将每隔 ${repeatOptions.find((o) => o.value === formData.repeatIntervalMinutes)?.label} 重复通知`}
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-notion">
              取消
            </button>
            <button type="submit" className="btn-notion-primary">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
