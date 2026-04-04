import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import TaskModal from './TaskModal';
import type { Task } from '../types';

interface TaskSectionProps {
  phaseId: string;
}

export default function TaskSection({ phaseId }: TaskSectionProps) {
  const { t } = useTranslation();
  const { getTasksByPhase, deleteTask } = useProjectStore();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const tasks = getTasksByPhase(phaseId);

  const handleDeleteTask = (taskId: string) => {
    if (confirm(t('task.deleteConfirm'))) {
      deleteTask(taskId);
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    const styles = {
      todo: 'bg-gray-100 text-gray-600',
      doing: 'bg-blue-100 text-blue-600',
      done: 'bg-green-100 text-green-600',
    };
    const labels = { todo: t('task.todo'), doing: t('task.doing'), done: t('task.done') };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPriorityBadge = (priority: Task['priority']) => {
    const styles = {
      low: 'bg-gray-100 text-gray-500',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-600',
    };
    const labels = { low: t('task.low'), medium: t('task.medium'), high: t('task.high') };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-600">
          <i className="fa-solid fa-list-check mr-2" />
          {t('task.list')} ({tasks.length})
        </h4>
        <button
          onClick={() => {
            setEditingTask(null);
            setShowTaskModal(true);
          }}
          className="btn-notion text-xs"
        >
          <i className="fa-solid fa-plus mr-1" />
          {t('task.create')}
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center text-gray-400 py-4 text-sm">
          {t('task.empty')}
        </div>
      ) : (
        <table className="table-notion">
          <thead>
            <tr>
              <th>{t('task.name')}</th>
              <th>{t('task.assignee')}</th>
              <th>{t('task.plannedHours')}/{t('task.actualHours')}</th>
              <th>{t('task.dueDate')}</th>
              <th>{t('task.priority')}</th>
              <th>{t('task.tags')}</th>
              <th>{t('task.status')}</th>
              <th>{t('common.edit')}</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td className="font-medium">{task.name}</td>
                <td className="text-gray-500">{task.assignee}</td>
                <td className="text-gray-500">
                  {task.plannedHours}h / {task.actualHours}h
                </td>
                <td className="text-gray-500">{task.dueDate}</td>
                <td>{getPriorityBadge(task.priority)}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {task.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                    {task.tags.length > 2 && (
                      <span className="text-xs text-gray-400">
                        +{task.tags.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td>{getStatusBadge(task.status)}</td>
                <td>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingTask(task);
                        setShowTaskModal(true);
                      }}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
                      title={t('common.edit')}
                    >
                      <i className="fa-solid fa-pen-to-square text-sm"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 hover:bg-gray-200 rounded text-red-400"
                      title={t('common.delete')}
                    >
                      <i className="fa-solid fa-trash text-sm"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showTaskModal && (
        <TaskModal
          task={editingTask}
          phaseId={phaseId}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}
