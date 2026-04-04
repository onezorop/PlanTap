import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import type { Task, NotificationConfig } from '../types';
import NotificationConfigModal from './NotificationConfigModal';

interface TaskModalProps {
  task: Task | null;
  phaseId: string;
  onClose: () => void;
}

export default function TaskModal({ task, phaseId, onClose }: TaskModalProps) {
  const { t } = useTranslation();
  const { addTask, updateTask } = useProjectStore();
  const isEditing = !!task;

  const [formData, setFormData] = useState({
    name: task?.name || '',
    assignee: task?.assignee || '',
    plannedHours: task?.plannedHours || 0,
    actualHours: task?.actualHours || 0,
    dueDate: task?.dueDate || '',
    status: task?.status || ('todo' as Task['status']),
    priority: task?.priority || ('medium' as Task['priority']),
    tags: task?.tags || [] as string[],
    notificationConfig: (task as any)?.notificationConfig || { enabled: false, advanceMinutes: 60, repeatIntervalMinutes: 0 } as NotificationConfig,
  });

  const [tagInput, setTagInput] = useState('');
  const [showNotificationConfig, setShowNotificationConfig] = useState(false);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData({ ...formData, tags: [...formData.tags, trimmed] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleNotificationConfigSave = (config: NotificationConfig) => {
    setFormData({ ...formData, notificationConfig: config });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.dueDate) {
      alert('请填写所有必填字段');
      return;
    }

    if (isEditing) {
      updateTask(task.id, formData);
    } else {
      addTask({ phaseId, ...formData });
    }
    onClose();
  };

  const getAdvanceLabel = (minutes: number) => {
    if (minutes < 60) return `${minutes} 分钟`;
    if (minutes < 1440) return `${minutes / 60} 小时`;
    return `${minutes / 1440} 天`;
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {isEditing ? t('task.edit') : t('task.new')}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('task.name')} *
              </label>
              <input
                type="text"
                className="input-notion"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('task.name')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('task.assignee')} *
              </label>
              <input
                type="text"
                className="input-notion"
                value={formData.assignee}
                onChange={(e) =>
                  setFormData({ ...formData, assignee: e.target.value })
                }
                placeholder={t('task.assignee')}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('task.plannedHours')}
                </label>
                <input
                  type="number"
                  min="0"
                  className="input-notion"
                  value={formData.plannedHours}
                  onChange={(e) =>
                    setFormData({ ...formData, plannedHours: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('task.actualHours')}
                </label>
                <input
                  type="number"
                  min="0"
                  className="input-notion"
                  value={formData.actualHours}
                  onChange={(e) =>
                    setFormData({ ...formData, actualHours: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('task.dueDate')} *
              </label>
              <input
                type="date"
                className="input-notion"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('task.status')} *
                </label>
                <select
                  className="select-notion w-full"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as Task['status'],
                    })
                  }
                >
                  <option value="todo">{t('task.todo')}</option>
                  <option value="doing">{t('task.doing')}</option>
                  <option value="done">{t('task.done')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('task.priority')}
                </label>
                <select
                  className="select-notion w-full"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as Task['priority'],
                    })
                  }
                >
                  <option value="low">{t('task.low')}</option>
                  <option value="medium">{t('task.medium')}</option>
                  <option value="high">{t('task.high')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('task.tags')}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <i className="fa-solid fa-times text-xs"></i>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-notion flex-1"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={t('task.tags')}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="btn-notion"
                >
                  {t('task.addTag', '添加')}
                </button>
              </div>
            </div>

            {/* Notification Config */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {t('notification.settings')}
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formData.notificationConfig.enabled
                      ? `${t('notification.advance') || '提前'} ${getAdvanceLabel(formData.notificationConfig.advanceMinutes)}`
                      : t('notification.disabled') || '未启用'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotificationConfig(true)}
                  className="btn-notion"
                >
                  <i className="fa-solid fa-bell mr-1"></i>
                  {formData.notificationConfig.enabled ? t('common.edit') : t('common.setup') || '设置'}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="submit" className="btn-notion-primary">
                {isEditing ? t('common.save') : t('common.create')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showNotificationConfig && (
        <NotificationConfigModal
          config={formData.notificationConfig}
          onSave={handleNotificationConfigSave}
          onClose={() => setShowNotificationConfig(false)}
        />
      )}
    </>
  );
}
