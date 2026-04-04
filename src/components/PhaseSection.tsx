import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import PhaseModal from './PhaseModal';
import TaskSection from './TaskSection';
import type { Phase } from '../types';

interface PhaseSectionProps {
  projectId: string;
}

export default function PhaseSection({ projectId }: PhaseSectionProps) {
  const { t } = useTranslation();
  const { getPhasesByProject, deletePhase } = useProjectStore();
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  const phases = getPhasesByProject(projectId);

  const toggleExpanded = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  const handleEditPhase = (phase: Phase, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPhase(phase);
    setShowPhaseModal(true);
  };

  const handleDeletePhase = (phaseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t('phase.deleteConfirm'))) {
      deletePhase(phaseId);
    }
  };

  const getStatusBadge = (status: Phase['status']) => {
    const styles = {
      todo: 'bg-gray-100 text-gray-600',
      doing: 'bg-blue-100 text-blue-600',
      done: 'bg-green-100 text-green-600',
    };
    const labels = { todo: t('phase.todo'), doing: t('phase.doing'), done: t('phase.done') };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="card-notion">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">
          <i className="fa-solid fa-layer-group mr-2" />
          {t('phase.list')}
        </h3>
        <button
          onClick={() => {
            setEditingPhase(null);
            setShowPhaseModal(true);
          }}
          className="btn-notion"
        >
          <i className="fa-solid fa-plus mr-1" />
          {t('phase.create')}
        </button>
      </div>

      {phases.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <i className="fa-solid fa-inbox text-3xl mb-2"></i>
          <p>{t('phase.empty')}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {phases.map((phase) => (
            <div key={phase.id}>
              <div
                className="p-4 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => toggleExpanded(phase.id)}
              >
                <i
                  className={`fa-solid fa-chevron-right text-xs transition-transform ${
                    expandedPhases.has(phase.id) ? 'rotate-90' : ''
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{phase.name}</span>
                    {getStatusBadge(phase.status)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {phase.startDate} ~ {phase.endDate}
                    {phase.actualEndDate && ` (实际完成: ${phase.actualEndDate})`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => handleEditPhase(phase, e)}
                    className="p-2 hover:bg-gray-200 rounded text-gray-500"
                    title={t('common.edit')}
                  >
                    <i className="fa-solid fa-pen-to-square text-sm"></i>
                  </button>
                  <button
                    onClick={(e) => handleDeletePhase(phase.id, e)}
                    className="p-2 hover:bg-gray-200 rounded text-red-400"
                    title={t('common.delete')}
                  >
                    <i className="fa-solid fa-trash text-sm"></i>
                  </button>
                </div>
              </div>

              {expandedPhases.has(phase.id) && (
                <div className="bg-gray-50 p-4">
                  <TaskSection phaseId={phase.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showPhaseModal && (
        <PhaseModal
          phase={editingPhase}
          projectId={projectId}
          onClose={() => {
            setShowPhaseModal(false);
            setEditingPhase(null);
          }}
        />
      )}
    </div>
  );
}
