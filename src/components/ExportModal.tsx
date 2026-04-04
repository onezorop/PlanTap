import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import type { Phase, Task } from '../types';

interface ExportModalProps {
  onClose: () => void;
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const { t } = useTranslation();
  const { projects, phases, tasks } = useProjectStore();
  const [format, setFormat] = useState<'json' | 'excel'>('json');
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set(projects.map(p => p.id)));
  const [isExporting, setIsExporting] = useState(false);

  const toggleProject = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const toggleAll = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map(p => p.id)));
    }
  };

  const getProjectPhases = (projectId: string): Phase[] => {
    return phases.filter(p => p.projectId === projectId);
  };

  const getPhaseTasks = (phaseId: string): Task[] => {
    return tasks.filter(t => t.phaseId === phaseId);
  };

  const exportData = async () => {
    if (selectedProjects.size === 0) return;

    setIsExporting(true);

    try {
      const exportProjects = projects
        .filter(p => selectedProjects.has(p.id))
        .map(project => ({
          ...project,
          phases: getProjectPhases(project.id).map(phase => ({
            ...phase,
            tasks: getPhaseTasks(phase.id),
          })),
        }));

      let blob: Blob;
      let filename: string;

      if (format === 'json') {
        const jsonContent = JSON.stringify({ projects: exportProjects }, null, 2);
        blob = new Blob([jsonContent], { type: 'application/json' });
        filename = `projects-export-${new Date().toISOString().split('T')[0]}.json`;
      } else {
        // Excel export using SheetJS
        const XLSX = await import('xlsx');

        // Flatten data for Excel
        const flatData: any[] = [];
        exportProjects.forEach(project => {
          flatData.push({
            '项目名称': project.name,
            '开始日期': project.startDate,
            '结束日期': project.endDate,
            '进度': project.progress,
            '阶段名称': '',
            '阶段状态': '',
            '任务名称': '',
            '任务负责人': '',
            '计划工时': '',
            '实际工时': '',
            '截止日期': '',
            '任务状态': '',
            '优先级': '',
          });

          project.phases?.forEach(phase => {
            if (phase.tasks && phase.tasks.length > 0) {
              phase.tasks.forEach(task => {
                flatData.push({
                  '项目名称': project.name,
                  '开始日期': project.startDate,
                  '结束日期': project.endDate,
                  '进度': project.progress,
                  '阶段名称': phase.name,
                  '阶段状态': phase.status,
                  '任务名称': task.name,
                  '任务负责人': task.assignee,
                  '计划工时': task.plannedHours,
                  '实际工时': task.actualHours,
                  '截止日期': task.dueDate,
                  '任务状态': task.status,
                  '优先级': task.priority,
                });
              });
            } else {
              flatData.push({
                '项目名称': project.name,
                '开始日期': project.startDate,
                '结束日期': project.endDate,
                '进度': project.progress,
                '阶段名称': phase.name,
                '阶段状态': phase.status,
                '任务名称': '',
                '任务负责人': '',
                '计划工时': '',
                '实际工时': '',
                '截止日期': '',
                '任务状态': '',
                '优先级': '',
              });
            }
          });
        });

        const worksheet = XLSX.utils.json_to_sheet(flatData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        filename = `projects-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      }

      // Download file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('export.title')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('export.format')}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={format === 'json'}
                  onChange={() => setFormat('json')}
                  className="text-blue-500"
                />
                <span>JSON</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={format === 'excel'}
                  onChange={() => setFormat('excel')}
                  className="text-blue-500"
                />
                <span>Excel (.xlsx)</span>
              </label>
            </div>
          </div>

          {/* Project Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('export.selectProjects')}
              </label>
              <button
                onClick={toggleAll}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                {selectedProjects.size === projects.length ? t('export.deselectAll') : t('export.selectAll')}
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {projects.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {t('sidebar.noProjects')}
                </div>
              ) : (
                projects.map(project => (
                  <label
                    key={project.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.has(project.id)}
                      onChange={() => toggleProject(project.id)}
                      className="rounded text-blue-500"
                    />
                    <i className="fa-solid fa-folder text-yellow-500"></i>
                    <span className="flex-1 truncate">{project.name}</span>
                    <span className="text-xs text-gray-400">
                      {getProjectPhases(project.id).length} {t('phase.plural') || 'phases'}
                    </span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {selectedProjects.size} / {projects.length} {t('export.projectsSelected')}
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={exportData}
            disabled={selectedProjects.size === 0 || isExporting}
            className="btn-notion-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? t('export.exporting') : t('export.export')}
          </button>
        </div>
      </div>
    </div>
  );
}
