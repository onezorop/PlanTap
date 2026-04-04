import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface RecycleBinProps {
  onClose: () => void;
}

export default function RecycleBin({ onClose }: RecycleBinProps) {
  const { t } = useTranslation();
  const [deletedProjects, setDeletedProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecycleBin = async () => {
    if (!window.electronAPI) return;
    try {
      const projects = await window.electronAPI.getRecycleBin();
      setDeletedProjects(projects);
    } catch (error) {
      console.error('Failed to load recycle bin:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecycleBin();
  }, []);

  const handleRestore = async (id: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.restoreProject(id);
    loadRecycleBin();
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm(t('recycleBin.deleteConfirm'))) return;
    if (!window.electronAPI) return;
    await window.electronAPI.permanentDeleteProject(id);
    loadRecycleBin();
  };

  const handleEmptyRecycleBin = async () => {
    if (!confirm(t('recycleBin.deleteConfirm'))) return;
    if (!window.electronAPI) return;
    await window.electronAPI.emptyRecycleBin();
    loadRecycleBin();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getDaysUntilExpiry = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, days);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('recycleBin.title')}</h2>
          <button onClick={onClose} className="btn-notion">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
            </div>
          ) : deletedProjects.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <i className="fa-solid fa-trash-can text-4xl mb-4"></i>
              <p>{t('recycleBin.empty')}</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleEmptyRecycleBin}
                  className="btn-notion text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <i className="fa-solid fa-trash-can mr-2"></i>
                  {t('common.delete')}
                </button>
              </div>

              <div className="space-y-2">
                {deletedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-folder text-yellow-500"></i>
                        <span className="font-medium">{project.name}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <span>{t('recycleBin.deletedAt')}: {formatDate(project.deletedAt)}</span>
                        <span className="mx-2">•</span>
                        <span className="text-orange-500">
                          {t('recycleBin.autoDelete')} ({getDaysUntilExpiry(project.deletedAt)} {t('common.days') || '天'})
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestore(project.id)}
                        className="btn-notion"
                        title={t('recycleBin.restore')}
                      >
                        <i className="fa-solid fa-rotate-left text-green-500"></i>
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(project.id)}
                        className="btn-notion hover:text-red-500"
                        title={t('recycleBin.delete')}
                      >
                        <i className="fa-solid fa-trash text-red-500"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button onClick={onClose} className="btn-notion">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
