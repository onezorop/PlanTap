import { create } from 'zustand';
import type { Project, Phase, Task, ViewMode } from '../types';

interface ProjectStore {
  projects: Project[];
  phases: Phase[];
  tasks: Task[];
  viewMode: ViewMode;
  selectedProjectId: string | null;
  selectedPhaseId: string | null;
  isLoading: boolean;

  // Init - load all data from SQLite
  init: () => Promise<void>;

  // Refresh - reload all data from SQLite
  refreshData: () => Promise<void>;

  // Project actions
  addProject: (project: Omit<Project, 'id'> & { id?: string }) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Phase actions
  addPhase: (phase: Omit<Phase, 'id'> & { id?: string }) => Promise<void>;
  updatePhase: (id: string, updates: Partial<Phase>) => Promise<void>;
  deletePhase: (id: string) => Promise<void>;

  // Task actions
  addTask: (task: Omit<Task, 'id'> & { id?: string }) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // UI actions
  setViewMode: (mode: ViewMode) => void;
  setSelectedProjectId: (id: string | null) => void;
  setSelectedPhaseId: (id: string | null) => void;

  // Computed
  getPhasesByProject: (projectId: string) => Phase[];
  getTasksByPhase: (phaseId: string) => Task[];
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Check if running in Electron
const isElectron = () => typeof window !== 'undefined' && window.electronAPI;

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  phases: [],
  tasks: [],
  viewMode: 'list',
  selectedProjectId: null,
  selectedPhaseId: null,
  isLoading: true,

  init: async () => {
    if (!isElectron()) {
      set({ isLoading: false });
      return;
    }

    try {
      // Batch query: get all data in one request (fast startup)
      const { projects, phases, tasks } = await window.electronAPI.getAllData();
      set({ projects, phases, tasks, isLoading: false });
    } catch (error) {
      console.error('Failed to load data:', error);
      set({ isLoading: false });
    }
  },

  refreshData: async () => {
    if (!isElectron()) return;

    try {
      const { projects, phases, tasks } = await window.electronAPI.getAllData();
      set({ projects, phases, tasks });
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  },

  addProject: async (project) => {
    const id = project.id || generateId();
    const newProject = { ...project, id };
    if (isElectron()) {
      await window.electronAPI.addProject(newProject);
    }
    set((state) => ({ projects: [...state.projects, newProject] }));
  },

  updateProject: async (id, updates) => {
    if (isElectron()) {
      await window.electronAPI.updateProject(id, updates);
    }
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  },

  deleteProject: async (id) => {
    if (isElectron()) {
      await window.electronAPI.deleteProject(id);
    }
    const { phases } = get();
    const phaseIds = phases.filter((p) => p.projectId === id).map((p) => p.id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      phases: state.phases.filter((p) => p.projectId !== id),
      tasks: state.tasks.filter((t) => !phaseIds.includes(t.phaseId)),
      selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
    }));
  },

  addPhase: async (phase) => {
    const id = phase.id || generateId();
    const newPhase = { ...phase, id };
    if (isElectron()) {
      await window.electronAPI.addPhase(newPhase);
    }
    set((state) => ({ phases: [...state.phases, newPhase] }));
  },

  updatePhase: async (id, updates) => {
    if (isElectron()) {
      await window.electronAPI.updatePhase(id, updates);
    }
    set((state) => ({
      phases: state.phases.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  },

  deletePhase: async (id) => {
    if (isElectron()) {
      await window.electronAPI.deletePhase(id);
    }
    set((state) => ({
      phases: state.phases.filter((p) => p.id !== id),
      tasks: state.tasks.filter((t) => t.phaseId !== id),
      selectedPhaseId: state.selectedPhaseId === id ? null : state.selectedPhaseId,
    }));
  },

  addTask: async (task) => {
    const id = task.id || generateId();
    const newTask = { ...task, id };
    if (isElectron()) {
      await window.electronAPI.addTask(newTask);
    }
    set((state) => ({ tasks: [...state.tasks, newTask] }));
  },

  updateTask: async (id, updates) => {
    if (isElectron()) {
      await window.electronAPI.updateTask(id, updates);
    }
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  deleteTask: async (id) => {
    if (isElectron()) {
      await window.electronAPI.deleteTask(id);
    }
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id, selectedPhaseId: null }),
  setSelectedPhaseId: (id) => set({ selectedPhaseId: id }),

  getPhasesByProject: (projectId) => get().phases.filter((p) => p.projectId === projectId),
  getTasksByPhase: (phaseId) => get().tasks.filter((t) => t.phaseId === phaseId),
}));
