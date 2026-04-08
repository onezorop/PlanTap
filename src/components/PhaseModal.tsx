import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import type { Phase } from '../types';

interface PhaseModalProps {
  phase: Phase | null;
  projectId: string;
  onClose: () => void;
}

export default function PhaseModal({ phase, projectId, onClose }: PhaseModalProps) {
  const { t } = useTranslation();
  const { addPhase, updatePhase } = useProjectStore();
  const isEditing = !!phase;

  const [formData, setFormData] = useState({
    name: phase?.name || '',
    startDate: phase?.startDate || '',
    endDate: phase?.endDate || '',
    actualEndDate: phase?.actualEndDate || '',
    status: phase?.status || ('todo' as Phase['status']),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate || !formData.endDate) {
      alert('请填写所有必填字段');
      return;
    }

    const data = {
      name: formData.name,
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: formData.status,
      ...(formData.actualEndDate && { actualEndDate: formData.actualEndDate }),
    };

    if (isEditing) {
      updatePhase(phase.id, data);
    } else {
      addPhase({ projectId, ...data });
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEditing ? t('phase.edit') : t('phase.new')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('phase.name')} *
            </label>
            <input
              type="text"
              className="input-notion"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('phase.name')}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('phase.startDate')} *
              </label>
              <input
                type="date"
                className="input-notion"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('phase.endDate')} *
              </label>
              <input
                type="date"
                className="input-notion"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('phase.status')} *
            </label>
            <select
              className="select-notion w-full"
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as Phase['status'],
                })
              }
            >
              <option value="todo">{t('phase.todo')}</option>
              <option value="doing">{t('phase.doing')}</option>
              <option value="done">{t('phase.done')}</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="submit" className="btn-notion-primary">
              {isEditing ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
