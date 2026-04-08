import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import DuplicateNameModal from './DuplicateNameModal';
import type { Project } from '../types';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

export default function ProjectModal({ project, onClose }: ProjectModalProps) {
  const { t } = useTranslation();
  const { projects, addProject, updateProject, setSelectedProjectId } = useProjectStore();
  const isEditing = !!project;

  const [duplicateWarning, setDuplicateWarning] = useState<{ name: string; existingProject: Project } | null>(null);
  const [formData, setFormData] = useState({
    name: project?.name || '',
    startDate: project?.startDate || '',
    endDate: project?.endDate || '',
    progress: project?.progress || 0,
    status: (project?.status || 'todo') as 'todo' | 'doing' | 'done',
  });

  // Update form data when project changes
  useEffect(() => {
    setFormData({
      name: project?.name || '',
      startDate: project?.startDate || '',
      endDate: project?.endDate || '',
      progress: project?.progress || 0,
      status: (project?.status || 'todo') as 'todo' | 'doing' | 'done',
    });
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate || !formData.endDate) {
      alert('请填写所有必填字段');
      return;
    }

    // Check for duplicate name when creating new project
    if (!isEditing) {
      const existing = projects.find(p => p.name.toLowerCase() === formData.name.toLowerCase());
      if (existing) {
        setDuplicateWarning({ name: formData.name, existingProject: existing });
        return;
      }
    }

    if (isEditing) {
      updateProject(project.id, formData);
      onClose();
    } else {
      // Generate id and create project, then select it
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newProject = { ...formData, id };
      await addProject(newProject);
      setSelectedProjectId(id);
      onClose();
    }
  };

  const handleCreateAnyway = async () => {
    if (!duplicateWarning) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newProject = { ...formData, id };
    await addProject(newProject);
    setSelectedProjectId(id);
    setDuplicateWarning(null);
    onClose();
  };

  const handleUpdateExisting = () => {
    if (!duplicateWarning) return;
    updateProject(duplicateWarning.existingProject.id, formData);
    setDuplicateWarning(null);
    onClose();
  };

  return (
    <>
      {duplicateWarning && (
        <DuplicateNameModal
          name={duplicateWarning.name}
          onCreateAnyway={handleCreateAnyway}
          onUpdate={handleUpdateExisting}
          onCancel={() => setDuplicateWarning(null)}
        />
      )}

      <div className="modal-overlay">
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {isEditing ? t('project.edit') : t('project.new')}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('project.name')} *
              </label>
              <input
                type="text"
                className="input-notion"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('project.name')}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('project.startDate')} *
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
                  {t('project.endDate')} *
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
                {t('project.progress')} ({formData.progress}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) =>
                  setFormData({ ...formData, progress: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('project.status')}
              </label>
              <select
                className="input-notion"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as 'todo' | 'doing' | 'done' })
                }
              >
                <option value="todo">{t('project.todo')}</option>
                <option value="doing">{t('project.doing')}</option>
                <option value="done">{t('project.done')}</option>
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
    </>
  );
}
