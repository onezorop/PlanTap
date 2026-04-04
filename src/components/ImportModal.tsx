import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import DuplicateNameModal from './DuplicateNameModal';

interface ImportModalProps {
  onClose: () => void;
}

interface PendingImport {
  data: any;
  name: string;
}

export default function ImportModal({ onClose }: ImportModalProps) {
  const { t } = useTranslation();
  const { projects, addProject, addPhase, addTask, setSelectedProjectId } = useProjectStore();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<PendingImport | null>(null);
  const [format, setFormat] = useState<'json' | 'excel'>('json');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImportRef = useRef<PendingImport | null>(null);

  const fileAccept = format === 'json' ? '.json' : '.xlsx,.xls';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError('');

    try {
      const content = await file.text();
      let data;

      if (format === 'json') {
        data = JSON.parse(content);
      } else {
        // Use SheetJS for Excel parsing
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(content, { type: 'string' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      }

      // Import the data
      await importData(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const importData = async (data: any, skipDuplicateCheck = false) => {
    // Support different data formats
    let projectsData = [];

    if (Array.isArray(data)) {
      // Direct array of projects
      projectsData = data;
    } else if (data.projects) {
      // Object with projects key
      projectsData = data.projects;
    } else {
      throw new Error('数据格式不正确');
    }

    for (const projectData of projectsData) {
      const projectName = projectData.name || '未命名项目';

      // Check for duplicate name
      if (!skipDuplicateCheck) {
        const existing = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
        if (existing) {
          pendingImportRef.current = { data: projectData, name: projectName };
          setDuplicateWarning({ data: projectData, name: projectName });
          return; // Wait for user decision
        }
      }

      await importSingleProject(projectData);
    }
  };

  const importSingleProject = async (projectData: any) => {
    const projectId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const project = {
      id: projectId,
      name: projectData.name || '未命名项目',
      startDate: projectData.startDate || new Date().toISOString().split('T')[0],
      endDate: projectData.endDate || new Date().toISOString().split('T')[0],
      progress: projectData.progress || 0,
    };

    await addProject(project);
    setSelectedProjectId(project.id);

    // Import phases
    const phases = projectData.phases || [];
    for (const phaseData of phases) {
      const phaseId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const phase = {
        id: phaseId,
        projectId: project.id,
        name: phaseData.name || '未命名阶段',
        startDate: phaseData.startDate || project.startDate,
        endDate: phaseData.endDate || project.endDate,
        actualEndDate: phaseData.actualEndDate,
        status: phaseData.status || 'todo',
      };

      await addPhase(phase);

      // Import tasks
      const tasks = phaseData.tasks || [];
      for (const taskData of tasks) {
        const task = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          phaseId: phase.id,
          name: taskData.name || '未命名任务',
          assignee: taskData.assignee || '',
          plannedHours: taskData.plannedHours || 0,
          actualHours: taskData.actualHours || 0,
          dueDate: taskData.dueDate || phase.endDate,
          status: taskData.status || 'todo',
          priority: taskData.priority || 'medium',
          tags: taskData.tags || [],
          notificationConfig: taskData.notificationConfig || { enabled: false, advanceMinutes: 60, repeatIntervalMinutes: 0 },
        };

        await addTask(task);
      }
    }
  };

  const handleDuplicateCreateAnyway = async () => {
    if (pendingImportRef.current) {
      await importSingleProject(pendingImportRef.current.data);
      pendingImportRef.current = null;
      setDuplicateWarning(null);
      // Continue importing remaining projects
      // Note: This simplified version only handles one pending import at a time
    }
  };

  const handleDuplicateSkip = () => {
    pendingImportRef.current = null;
    setDuplicateWarning(null);
  };

  return (
    <>
      {duplicateWarning && (
        <DuplicateNameModal
          name={duplicateWarning.name}
          onCreateAnyway={handleDuplicateCreateAnyway}
          onUpdate={() => {
            // For import, we just skip the duplicate
            handleDuplicateSkip();
          }}
          onCancel={handleDuplicateSkip}
        />
      )}

      <div className="modal-overlay">
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('import.title')}</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('import.format')}
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importFormat"
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
                    name="importFormat"
                    value="excel"
                    checked={format === 'excel'}
                    onChange={() => setFormat('excel')}
                    className="text-blue-500"
                  />
                  <span>Excel (.xlsx, .xls)</span>
                </label>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={fileAccept}
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="btn-notion-primary w-full"
            >
              {importing ? t('import.importing') : t('import.selectFile')}
            </button>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('import.dataFormat')}</h3>
                <div className="relative group">
                  <i className="fa-solid fa-circle-exclamation text-yellow-500 cursor-help"></i>
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs p-3 rounded-lg shadow-lg w-80 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700">
                      <pre className="text-xs leading-relaxed whitespace-pre-wrap">{`{
  "projects": [
    {
      "name": "项目名称",
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "progress": 50,
      "phases": [
        {
          "name": "阶段名称",
          "startDate": "2025-01-01",
          "endDate": "2025-06-30",
          "status": "doing",
          "tasks": [
            {
              "name": "任务名称",
              "assignee": "负责人",
              "plannedHours": 8,
              "actualHours": 4,
              "dueDate": "2025-03-01",
              "status": "doing",
              "priority": "high",
              "tags": ["标签1", "标签2"]
            }
          ]
        }
      ]
    }
  ]
}`}</pre>
                    </div>
                    <div className="absolute left-4 top-full w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
