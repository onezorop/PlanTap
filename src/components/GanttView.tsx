import { useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import type { Phase, Task } from '../types';

export default function GanttView() {
  const { t } = useTranslation();
  const { projects, phases, tasks } = useProjectStore();
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const { minDate, dayWidth, totalDays, headerMonths } = useMemo(() => {
    if (projects.length === 0) {
      const today = new Date();
      return {
        minDate: today,
        maxDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        dayWidth: 30,
        totalDays: 30,
        headerMonths: [],
      };
    }

    const dates = projects.flatMap((p) => [
      new Date(p.startDate),
      new Date(p.endDate),
    ]);
    phases.forEach((p) => {
      dates.push(new Date(p.startDate), new Date(p.endDate));
    });
    tasks.forEach((t) => dates.push(new Date(t.dueDate)));

    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Add padding
    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 14);

    const dayWidth = 30;
    const totalDays = Math.ceil(
      (max.getTime() - min.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Generate month headers
    const headerMonths: { label: string; days: number; startDay: number }[] = [];
    const current = new Date(min);
    current.setDate(1);
    while (current <= max) {
      const month = current.getMonth();
      const year = current.getFullYear();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startDay = Math.max(
        0,
        Math.ceil((min.getTime() - current.getTime()) / (24 * 60 * 60 * 1000))
      );
      headerMonths.push({
        label: `${year}年${month + 1}月`,
        days: Math.min(daysInMonth - current.getDate() + 1, totalDays - startDay),
        startDay,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return { minDate: min, maxDate: max, dayWidth, totalDays, headerMonths };
  }, [projects, phases, tasks]);

  // Sync vertical scroll
  useEffect(() => {
    const rightEl = rightRef.current;
    const leftEl = leftRef.current;
    if (!rightEl || !leftEl) return;

    const syncScroll = () => {
      leftEl.scrollTop = rightEl.scrollTop;
    };
    rightEl.addEventListener('scroll', syncScroll);
    return () => rightEl.removeEventListener('scroll', syncScroll);
  }, []);

  const getDateX = (date: string) => {
    const d = new Date(date);
    const days = Math.ceil((d.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000));
    return days * dayWidth;
  };

  const getPhaseWidth = (phase: Phase) => {
    const start = new Date(phase.startDate);
    const end = new Date(phase.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(days * dayWidth, dayWidth);
  };

  const getTaskWidth = (task: Task) => {
    const planned = task.plannedHours / 8; // Assume 8h per day
    return Math.max(planned * dayWidth, dayWidth);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return '#22c55e';
      case 'doing':
        return '#3b82f6';
      default:
        return '#d1d5db';
    }
  };

  if (projects.length === 0) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="text-center" style={{ color: 'var(--text-tertiary)' }}>
          <i className="fa-solid fa-chart-gantt text-5xl mb-4"></i>
          <p className="text-lg">{t('gantt.noProject')}</p>
          <p className="text-sm mt-2">{t('gantt.hint')}</p>
        </div>
      </div>
    );
  }

  const nameColWidth = 192;
  const timelineWidth = totalDays * dayWidth;
  const headerHeight = 48;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-100 dark:border-[var(--border-color)] flex-shrink-0">
        <h3 className="font-semibold text-gray-700 dark:text-[var(--text-primary)]">
          <i className="fa-solid fa-chart-gantt mr-2" />
          {t('gantt.title')}
        </h3>
      </div>

      {/* Main container - no scrollbars */}
      <div className="flex-1 overflow-hidden relative">
        {/* Fixed Left Column - header */}
        <div
          className="absolute left-0 top-0 z-30 border-r border-gray-200 dark:border-[var(--border-color)] flex items-center justify-center"
          style={{ width: nameColWidth, height: headerHeight, backgroundColor: 'var(--bg-tertiary)' }}
        >
          <span className="font-medium text-sm text-gray-700 dark:text-[var(--text-primary)]">项目 / 阶段 / 任务</span>
        </div>

        {/* Fixed Left Column - content (syncs with right scroll) */}
        <div
          ref={leftRef}
          className="absolute left-0 top-0 overflow-hidden border-r border-gray-200 dark:border-[var(--border-color)]"
          style={{ width: nameColWidth, top: headerHeight, bottom: 0, backgroundColor: 'var(--bg-primary)' }}
        >
          <div className="transform translate-y-0" id="gantt-left-inner">
            {projects.map((project) => {
              const projectPhases = phases.filter((p) => p.projectId === project.id);
              return (
                <div key={project.id}>
                  {/* Project row */}
                  <div
                    className="flex items-center gap-2 px-3 font-medium text-sm border-b border-gray-100 dark:border-[var(--border-light)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)]"
                    style={{ height: 44, backgroundColor: 'var(--bg-primary)' }}
                  >
                    <i className="fa-solid fa-folder text-yellow-500"></i>
                    <span className="truncate text-gray-700 dark:text-[var(--text-primary)]">{project.name}</span>
                  </div>
                  {/* Phase rows */}
                  {projectPhases.map((phase) => {
                    const phaseTasks = tasks.filter((t) => t.phaseId === phase.id);
                    return (
                      <div key={phase.id}>
                        <div
                          className="flex items-center gap-2 px-3 text-sm border-b border-gray-100 dark:border-[var(--border-light)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] pl-8"
                          style={{ height: 44, backgroundColor: 'var(--bg-primary)' }}
                        >
                          <i
                            className={`fa-solid ${
                              phase.status === 'done'
                                ? 'fa-check-circle text-green-500'
                                : phase.status === 'doing'
                                ? 'fa-circle-notch text-blue-500'
                                : 'fa-circle text-gray-300'
                            }`}
                          />
                          <span className="truncate text-gray-700 dark:text-[var(--text-primary)]">{phase.name}</span>
                        </div>
                        {/* Task rows */}
                        {phaseTasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 px-3 text-xs border-b border-gray-50 dark:border-[var(--border-light)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] pl-14 text-gray-500 dark:text-[var(--text-secondary)]"
                            style={{ height: 36, backgroundColor: 'var(--bg-primary)' }}
                          >
                            <i
                              className={`fa-solid ${
                                task.status === 'done'
                                  ? 'fa-check-square text-green-500'
                                  : task.status === 'doing'
                                  ? 'fa-spinner text-blue-500'
                                  : 'fa-square text-gray-300'
                              }`}
                            />
                            <span className="truncate">{task.name}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable Timeline Area */}
        <div
          ref={rightRef}
          className="absolute overflow-auto"
          style={{ left: nameColWidth, top: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-primary)' }}
        >
          {/* Top Header - fixed at top */}
          <div
            className="sticky top-0 z-20"
            style={{ width: timelineWidth, height: headerHeight, backgroundColor: 'var(--bg-primary)' }}
          >
            {/* Month headers */}
            <div className="flex border-b border-gray-100 dark:border-[var(--border-color)]" style={{ height: headerHeight / 2 }}>
              {headerMonths.map((month, i) => (
                <div
                  key={i}
                  className="text-center text-xs text-gray-500 dark:text-[var(--text-secondary)] py-1 border-r border-gray-100 dark:border-[var(--border-color)] flex items-center justify-center"
                  style={{ width: month.days * dayWidth }}
                >
                  {month.label}
                </div>
              ))}
            </div>
            {/* Day headers */}
            <div className="flex" style={{ height: headerHeight / 2 }}>
              {Array.from({ length: totalDays }).map((_, i) => {
                const date = new Date(minDate);
                date.setDate(date.getDate() + i);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={`text-center text-xs py-1 border-r border-gray-50 dark:border-[var(--border-light)] flex items-center justify-center ${
                      isWeekend ? 'bg-gray-50 dark:bg-[var(--bg-hover)]' : ''
                    }`}
                    style={{ width: dayWidth, color: 'var(--text-secondary)' }}
                  >
                    {date.getDate()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gantt Bars */}
          <div style={{ width: timelineWidth, backgroundColor: 'var(--bg-primary)' }}>
            {projects.map((project) => {
              const projectPhases = phases.filter((p) => p.projectId === project.id);
              return (
                <div key={project.id}>
                  {/* Project row */}
                  <div
                    className="relative border-b border-gray-100 dark:border-[var(--border-light)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)]"
                    style={{ height: 44, backgroundColor: 'var(--bg-primary)' }}
                  >
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                      style={{
                        left: getDateX(new Date().toISOString().split('T')[0]),
                      }}
                    />
                  </div>

                  {/* Phase rows */}
                  {projectPhases.map((phase) => {
                    const phaseTasks = tasks.filter((t) => t.phaseId === phase.id);
                    const x = getDateX(phase.startDate);
                    const width = getPhaseWidth(phase);

                    return (
                      <div key={phase.id}>
                        <div
                          className="relative border-b border-gray-100 dark:border-[var(--border-light)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)]"
                          style={{ height: 44, backgroundColor: 'var(--bg-primary)' }}
                        >
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                            style={{
                              left: getDateX(new Date().toISOString().split('T')[0]),
                            }}
                          />
                          <div
                            className="absolute top-1 bottom-1 rounded flex items-center px-2 text-xs text-white font-medium"
                            style={{
                              left: x,
                              width: width,
                              backgroundColor: getStatusColor(phase.status),
                            }}
                          >
                            {phase.name}
                          </div>
                        </div>

                        {/* Task rows */}
                        {phaseTasks.map((task) => {
                          const taskX = getDateX(task.dueDate);
                          const taskWidth = getTaskWidth(task);

                          return (
                            <div
                              key={task.id}
                              className="relative border-b border-gray-50 dark:border-[var(--border-light)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)]"
                              style={{ height: 36, backgroundColor: 'var(--bg-primary)' }}
                            >
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                                style={{
                                  left: getDateX(new Date().toISOString().split('T')[0]),
                                }}
                              />
                              <div
                                className="absolute top-1 bottom-1 rounded flex items-center px-2 text-xs text-white"
                                style={{
                                  left: taskX,
                                  width: taskWidth,
                                  backgroundColor: getStatusColor(task.status),
                                }}
                              >
                                {task.assignee}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
