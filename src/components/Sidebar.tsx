import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import ProjectModal from './ProjectModal';
import ImportModal from './ImportModal';
import ExportModal from './ExportModal';
import ConfirmModal from './ConfirmModal';
import type { Project } from '../types';

export default function Sidebar() {
  const { t } = useTranslation();
  const {
    projects,
    phases,
    selectedProjectId,
    setSelectedProjectId,
    deleteProject,
    refreshData,
  } = useProjectStore();

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [deletedProjects, setDeletedProjects] = useState<Project[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'project' | 'phase' | 'task' | 'permanent' | 'empty'; id?: string; name?: string } | null>(null);

  const toggleExpanded = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleDeleteProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ type: 'project', id: project.id, name: project.name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'project' && deleteConfirm.id) {
      deleteProject(deleteConfirm.id);
    } else if (deleteConfirm.type === 'permanent' && deleteConfirm.id) {
      if (window.electronAPI) {
        await window.electronAPI.permanentDeleteProject(deleteConfirm.id);
        loadRecycleBin();
      }
    } else if (deleteConfirm.type === 'empty') {
      if (window.electronAPI) {
        await window.electronAPI.emptyRecycleBin();
        loadRecycleBin();
      }
    }
    setDeleteConfirm(null);
  };

  const loadRecycleBin = async () => {
    if (!window.electronAPI) return;
    const projects = await window.electronAPI.getRecycleBin();
    setDeletedProjects(projects);
  };

  const handleRestore = async (id: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.restoreProject(id);
    await refreshData();
    loadRecycleBin();
  };

  const handlePermanentDelete = (id: string) => {
    setDeleteConfirm({ type: 'permanent', id });
  };

  const handleEmptyRecycleBin = () => {
    setDeleteConfirm({ type: 'empty' });
  };

  const getProjectPhases = (projectId: string) =>
    phases.filter((p) => p.projectId === projectId);

  const getDaysUntilExpiry = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, days);
  };

  return (
    <>
      <aside className="w-[280px] bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4 m-4 mr-0 h-[calc(100vh-32px)] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('app.name')}</h1>
          <div className="flex gap-1">
            <button
              onClick={() => {
                setEditingProject(null);
                setShowProjectModal(true);
              }}
              className="btn-notion"
              title={t('sidebar.newProject')}
            >
              <i className="fa-solid fa-plus"></i>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-notion"
              title={t('sidebar.import')}
            >
              <i className="fa-solid fa-file-import"></i>
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="btn-notion"
              title={t('export.title')}
            >
              <i className="fa-solid fa-file-export"></i>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {projects.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-500 py-8">
              <i className="fa-solid fa-folder-open text-3xl mb-2"></i>
              <p className="text-sm">{t('sidebar.noProjects')}</p>
              <button
                onClick={() => setShowProjectModal(true)}
                className="btn-notion-primary mt-2"
              >
                {t('sidebar.createFirst')}
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {projects.map((project) => {
                const projectPhases = getProjectPhases(project.id);
                const isExpanded = expandedProjects.has(project.id);
                const isSelected = selectedProjectId === project.id;

                return (
                  <div key={project.id} className="group">
                    <div
                      className={`sidebar-item ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        toggleExpanded(project.id);
                      }}
                    >
                      <i
                        className={`fa-solid fa-chevron-right text-xs transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                      <i className="fa-solid fa-folder text-yellow-500"></i>
                      <span className="flex-1 truncate">{project.name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => handleEditProject(project, e)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          title={t('common.edit')}
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button
                          onClick={(e) => handleDeleteProject(project, e)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-red-500"
                          title={t('common.delete')}
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    </div>

                    {isExpanded && projectPhases.length > 0 && (
                      <div className="ml-6 mt-1 space-y-1">
                        {projectPhases.map((phase) => (
                          <div
                            key={phase.id}
                            className="sidebar-item text-sm pl-4"
                          >
                            <i
                              className={`fa-solid ${
                                phase.status === 'done'
                                  ? 'fa-check-circle text-green-500'
                                  : phase.status === 'doing'
                                  ? 'fa-circle-notch text-blue-500 animate-spin'
                                  : 'fa-circle text-gray-300 dark:text-gray-600'
                              }`}
                            />
                            <span className="truncate">{phase.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recycle Bin Button */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              loadRecycleBin();
              setShowRecycleBin(true);
            }}
            className="w-full btn-notion flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-trash-can"></i>
            <span>{t('header.recycleBin')}</span>
          </button>
        </div>
      </aside>

      {/* Recycle Bin Drawer */}
      {showRecycleBin && (
        <div className="modal-overlay">
          <div
            className="absolute left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <i className="fa-solid fa-trash-can"></i>
                {t('recycleBin.title')}
              </h2>
              <button onClick={() => setShowRecycleBin(false)} className="btn-notion">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {deletedProjects.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                  <i className="fa-solid fa-trash-can text-3xl mb-2"></i>
                  <p className="text-sm">{t('recycleBin.empty')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deletedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <i className="fa-solid fa-folder text-yellow-500"></i>
                        <span className="font-medium truncate">{project.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {t('recycleBin.autoDelete')} ({getDaysUntilExpiry(project.deletedAt!)} {t('common.days') || '天'})
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestore(project.id)}
                          className="btn-notion text-sm flex-1"
                        >
                          <i className="fa-solid fa-rotate-left mr-1"></i>
                          {t('recycleBin.restore')}
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(project.id)}
                          className="btn-notion text-sm text-red-500 hover:text-red-600"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}

                  {deletedProjects.length > 1 && (
                    <button
                      onClick={handleEmptyRecycleBin}
                      className="w-full btn-notion text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 mt-4"
                    >
                      <i className="fa-solid fa-trash-can mr-2"></i>
                      {t('common.delete')} All
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => {
            setShowProjectModal(false);
            setEditingProject(null);
          }}
        />
      )}

      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} />
      )}

      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}

      {deleteConfirm && (
        <ConfirmModal
          title={deleteConfirm.type === 'project' ? t('project.delete') : deleteConfirm.type === 'permanent' ? t('recycleBin.delete') : t('common.confirm')}
          message={deleteConfirm.type === 'project' ? t('project.deleteConfirm') : t('recycleBin.deleteConfirm')}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </>
  );
}
