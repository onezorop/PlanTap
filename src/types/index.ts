export interface Project {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  deletedAt?: string;
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  actualEndDate?: string;
  status: 'todo' | 'doing' | 'done';
}

export interface Task {
  id: string;
  phaseId: string;
  name: string;
  assignee: string;
  plannedHours: number;
  actualHours: number;
  dueDate: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
}

// 通知配置
export interface NotificationConfig {
  enabled: boolean;
  advanceMinutes: number; // 提前多少分钟通知，0表示不提前
  repeatIntervalMinutes: number; // 周期通知间隔分钟数，0表示不重复
}

// 系统通知设置
export interface NotificationSettings {
  inApp: {
    enabled: boolean;
  };
  system: {
    enabled: boolean;
  };
  email: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
  };
  dingtalk: {
    enabled: boolean;
    webhookUrl: string;
    secret: string; // 钉钉机器人加签密钥
  };
}

// 应用内通知
export interface InAppNotification {
  id: string;
  type: 'task' | 'phase' | 'project';
  typeId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type ViewMode = 'list' | 'gantt';

// AI Provider types
export type AIProviderType = 'openai' | 'claude' | 'ollama' | 'custom';

export interface AIProvider {
  type: AIProviderType;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AIConfig {
  enabled: boolean;
  provider: AIProvider;
}
