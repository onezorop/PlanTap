import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type Language = 'zh' | 'en' | 'fr' | 'ja';

interface SettingsStore {
  theme: Theme;
  language: Language;
  sidebarVisible: boolean;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setSidebarVisible: (visible: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'zh',
      sidebarVisible: true,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
    }),
    {
      name: 'promgr-settings',
    }
  )
);
