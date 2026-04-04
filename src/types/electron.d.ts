import type { Project, Phase, Task, NotificationConfig, NotificationSettings, InAppNotification, AIConfig, AIChatMessage } from './index';

export interface ElectronAPI {
  // Projects
  getProjects: () => Promise<Project[]>;
  getAllData: () => Promise<{ projects: Project[]; phases: Phase[]; tasks: (Task & { notificationConfig: NotificationConfig })[] }>;
  addProject: (project: Omit<Project, 'id'> & { id: string }) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<boolean>;
  restoreProject: (id: string) => Promise<boolean>;
  permanentDeleteProject: (id: string) => Promise<boolean>;
  getRecycleBin: () => Promise<Project[]>;
  emptyRecycleBin: () => Promise<boolean>;

  // Phases
  getPhasesByProject: (projectId: string) => Promise<Phase[]>;
  addPhase: (phase: Omit<Phase, 'id'> & { id: string }) => Promise<Phase>;
  updatePhase: (id: string, updates: Partial<Phase>) => Promise<Phase>;
  deletePhase: (id: string) => Promise<boolean>;

  // Tasks
  getTasksByPhase: (phaseId: string) => Promise<(Task & { notificationConfig: NotificationConfig })[]>;
  addTask: (task: Omit<Task, 'id'> & { id: string; notificationConfig?: NotificationConfig }) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task> & { notificationConfig?: NotificationConfig }) => Promise<Task>;
  deleteTask: (id: string) => Promise<boolean>;

  // Notification Settings
  getNotificationSettings: () => Promise<NotificationSettings>;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<NotificationSettings>;

  // In-App Notifications
  getInAppNotifications: () => Promise<InAppNotification[]>;
  markNotificationRead: (id: string) => Promise<boolean>;
  markAllNotificationsRead: () => Promise<boolean>;
  clearNotifications: () => Promise<boolean>;

  // Desktop Notification
  showDesktopNotification: (title: string, body: string) => Promise<void>;

  // TEST: Send a test notification
  sendTestNotification: () => Promise<InAppNotification>;

  // TEST: Send a test DingTalk notification
  sendTestDingTalkNotification: () => Promise<{ success: boolean; error?: string; message?: string }>;

  // Listen for new notifications
  onNewNotification: (callback: (notification: InAppNotification) => void) => void;

  // AI Chat
  aiChat: (messages: { role: string; content: string }[], projectContext: unknown, images?: string[]) => Promise<string>;
  getAIConfig: () => Promise<AIConfig>;
  updateAIConfig: (config: AIConfig) => Promise<AIConfig>;
  getAIMessages: () => Promise<AIChatMessage[]>;
  addAIMessage: (message: AIChatMessage) => Promise<AIChatMessage>;
  clearAIMessages: () => Promise<void>;
  sendAINotification: (title: string, message: string) => Promise<{ success: boolean; error?: string }>;
  executeAIAction: (action: { type: 'create' | 'update' | 'delete'; target: 'project' | 'phase' | 'task'; id?: string; data?: any }) => Promise<{ success: boolean; data?: any; error?: string; duplicateProject?: any }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
