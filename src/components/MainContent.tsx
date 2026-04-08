import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import PhaseSection from './PhaseSection';
import ProjectModal from './ProjectModal';
import type { Project } from '../types';

export default function MainContent() {
  const { t } = useTranslation();
  const { projects, selectedProjectId } = useProjectStore();
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  if (!selectedProject) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <i className="fa-solid fa-hand-point-left text-5xl mb-4"></i>
          <p className="text-lg">{t('main.selectProject')}</p>
          <p className="text-sm mt-2">{t('main.orCreateNew')}</p>
          <button
            onClick={() => setShowProjectModal(true)}
            className="btn-notion-primary mt-4"
          >
            <i className="fa-solid fa-plus mr-2" />
            {t('project.new')}
          </button>
        </div>
        {showProjectModal && (
          <ProjectModal
            project={null}
            onClose={() => setShowProjectModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Project Header */}
      <div className="card-notion p-3 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">
              {selectedProject.name}
            </h2>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>
                <i className="fa-solid fa-calendar mr-2" />
                {selectedProject.startDate} ~ {selectedProject.endDate}
              </span>
              <span>
                <i className="fa-solid fa-percent mr-2" />
                {t('project.progress')} {selectedProject.progress}%
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingProject(selectedProject);
              setShowProjectModal(true);
            }}
            className="btn-notion"
          >
            <i className="fa-solid fa-pen-to-square mr-2" />
            {t('project.edit')}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${selectedProject.progress}%` }}
          />
        </div>
      </div>

      {/* Phases */}
      <PhaseSection projectId={selectedProject.id} />

      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => {
            setShowProjectModal(false);
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}
