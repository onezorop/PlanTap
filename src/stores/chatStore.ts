import { create } from 'zustand';
import type { AIChatMessage, AIConfig } from '../types';

export interface ActionSpec {
  action: 'create' | 'update' | 'delete';
  target: 'project' | 'phase' | 'task';
  id?: string;
  data?: any;
  displayText: string;
}

interface ChatStore {
  messages: AIChatMessage[];
  config: AIConfig;
  isOpen: boolean;
  isLoading: boolean;
  pendingAction: ActionSpec | null;

  // Actions
  init: () => Promise<void>;
  sendMessage: (content: string, projectContext: unknown, images?: string[]) => Promise<string>;
  toggleChat: () => void;
  updateConfig: (config: AIConfig) => Promise<void>;
  clearHistory: () => Promise<void>;
  saveMessage: (message: AIChatMessage) => Promise<void>;
  setPendingAction: (action: ActionSpec | null) => void;
  executePendingAction: () => Promise<{ success: boolean; error?: string; duplicateProject?: any }>;
  clearPendingAction: () => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const isElectron = () => typeof window !== 'undefined' && window.electronAPI;

const defaultConfig: AIConfig = {
  enabled: false,
  provider: {
    type: 'openai',
    name: 'OpenAI',
    model: 'gpt-4o',
  },
};

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  config: defaultConfig,
  isOpen: false,
  isLoading: false,
  pendingAction: null,

  init: async () => {
    if (!isElectron()) {
      set({ isLoading: false });
      return;
    }

    try {
      const [config, savedMessages] = await Promise.all([
        window.electronAPI.getAIConfig(),
        window.electronAPI.getAIMessages(),
      ]);
      set({
        config: config || defaultConfig,
        messages: savedMessages || [],
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load chat state:', error);
      set({ isLoading: false });
    }
  },

  sendMessage: async (content, projectContext, images) => {
    if (!isElectron()) return 'Electron环境不可用';

    // Build content with image references
    let fullContent = content;
    if (images && images.length > 0) {
      fullContent = `[用户发送了${images.length}张图片]\n${content}`;
    }

    const userMessage: AIChatMessage = {
      id: generateId(),
      role: 'user',
      content: fullContent,
      timestamp: new Date().toISOString(),
    };

    // Save user message
    await get().saveMessage(userMessage);
    set((state) => ({ messages: [...state.messages, userMessage] }));

    set({ isLoading: true });

    try {
      const rawResponse = await window.electronAPI.aiChat(
        get().messages.map((m) => ({ role: m.role, content: m.content })),
        projectContext,
        images || []
      );

      // Parse JSON response
      let responseText = rawResponse;
      try {
        const parsed = JSON.parse(rawResponse);
        responseText = parsed.content;
      } catch {
        // Response is plain text
      }

      const assistantMessage: AIChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString(),
      };

      await get().saveMessage(assistantMessage);
      set((state) => ({ messages: [...state.messages, assistantMessage], isLoading: false }));

      return rawResponse; // Return raw for UI to handle notification
    } catch (error) {
      set({ isLoading: false });
      return `发送失败：${error}`;
    }
  },

  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),

  updateConfig: async (config) => {
    if (!isElectron()) return;

    await window.electronAPI.updateAIConfig(config);
    set({ config });
  },

  clearHistory: async () => {
    if (!isElectron()) return;

    await window.electronAPI.clearAIMessages();
    set({ messages: [] });
  },

  saveMessage: async (message) => {
    if (!isElectron()) return;
    await window.electronAPI.addAIMessage(message);
  },

  setPendingAction: (action) => set({ pendingAction: action }),

  executePendingAction: async () => {
    const { pendingAction } = get();
    if (!pendingAction || !isElectron()) {
      return { success: false, error: 'No pending action or not in Electron' };
    }

    try {
      const result = await window.electronAPI.executeAIAction({
        type: pendingAction.action,
        target: pendingAction.target,
        id: pendingAction.id,
        data: pendingAction.data,
      });

      if (result.success) {
        set({ pendingAction: null });
      }

      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  clearPendingAction: () => set({ pendingAction: null }),
}));
