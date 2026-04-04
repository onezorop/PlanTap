const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Projects
  getProjects: () => ipcRenderer.invoke('db:projects:getAll'),
  getAllData: () => ipcRenderer.invoke('db:getAllData'),
  addProject: (project) => ipcRenderer.invoke('db:projects:add', project),
  updateProject: (id, updates) => ipcRenderer.invoke('db:projects:update', id, updates),
  deleteProject: (id) => ipcRenderer.invoke('db:projects:softDelete', id),
  restoreProject: (id) => ipcRenderer.invoke('db:projects:restore', id),
  permanentDeleteProject: (id) => ipcRenderer.invoke('db:projects:permanentDelete', id),
  getRecycleBin: () => ipcRenderer.invoke('db:projects:getRecycleBin'),
  emptyRecycleBin: () => ipcRenderer.invoke('db:projects:emptyRecycleBin'),

  // Phases
  getPhasesByProject: (projectId) => ipcRenderer.invoke('db:phases:getByProject', projectId),
  addPhase: (phase) => ipcRenderer.invoke('db:phases:add', phase),
  updatePhase: (id, updates) => ipcRenderer.invoke('db:phases:update', id, updates),
  deletePhase: (id) => ipcRenderer.invoke('db:phases:delete', id),

  // Tasks
  getTasksByPhase: (phaseId) => ipcRenderer.invoke('db:tasks:getByPhase', phaseId),
  addTask: (task) => ipcRenderer.invoke('db:tasks:add', task),
  updateTask: (id, updates) => ipcRenderer.invoke('db:tasks:update', id, updates),
  deleteTask: (id) => ipcRenderer.invoke('db:tasks:delete', id),

  // Notification Settings
  getNotificationSettings: () => ipcRenderer.invoke('notification:settings:get'),
  updateNotificationSettings: (settings) => ipcRenderer.invoke('notification:settings:update', settings),

  // In-App Notifications
  getInAppNotifications: () => ipcRenderer.invoke('notification:inapp:getAll'),
  markNotificationRead: (id) => ipcRenderer.invoke('notification:inapp:markRead', id),
  markAllNotificationsRead: () => ipcRenderer.invoke('notification:inapp:markAllRead'),
  clearNotifications: () => ipcRenderer.invoke('notification:inapp:clear'),

  // Desktop Notification
  showDesktopNotification: (title, body) => ipcRenderer.invoke('notification:desktop:show', { title, body }),

  // TEST: Send a test notification
  sendTestNotification: () => ipcRenderer.invoke('notification:test'),

  // TEST: Send a test DingTalk notification
  sendTestDingTalkNotification: () => ipcRenderer.invoke('notification:testDingtalk'),

  // Listen for new notifications from main process
  onNewNotification: (callback) => {
    ipcRenderer.on('notification:new', (_, notification) => callback(notification));
  },

  // AI Chat
  aiChat: (messages, projectContext, images) => ipcRenderer.invoke('ai:chat', { messages, projectContext, images }),
  getAIConfig: () => ipcRenderer.invoke('ai:config:get'),
  updateAIConfig: (config) => ipcRenderer.invoke('ai:config:update', config),
  getAIMessages: () => ipcRenderer.invoke('ai:messages:getAll'),
  addAIMessage: (message) => ipcRenderer.invoke('ai:messages:add', message),
  clearAIMessages: () => ipcRenderer.invoke('ai:messages:clear'),
  sendAINotification: (title, message) => ipcRenderer.invoke('ai:notification:send', { title, message }),
  executeAIAction: (action) => ipcRenderer.invoke('ai:executeAction', action),
});
