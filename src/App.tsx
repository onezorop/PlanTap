import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from './stores/projectStore';
import { useSettingsStore } from './stores/settingsStore';
import { useChatStore } from './stores/chatStore';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MainContent from './components/MainContent';
import GanttView from './components/GanttView';
import AIChatPanel from './components/AIChatPanel';

function App() {
  const { t } = useTranslation();
  const { viewMode, isLoading, init } = useProjectStore();
  const { theme } = useSettingsStore();
  const { init: initChat } = useChatStore();

  // Initialize theme on mount
  useEffect(() => {
    const applyTheme = () => {
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      } else {
        document.documentElement.setAttribute('data-theme', theme);
      }
    };
    applyTheme();
  }, [theme]);

  // Initialize i18n title
  useEffect(() => {
    document.title = t('app.name');
  }, [t]);

  useEffect(() => {
    // Run both stores initialization in parallel
    Promise.all([init(), initChat()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <i className="fa-solid fa-spinner fa-spin text-3xl mb-2" style={{ color: 'var(--text-tertiary)' }}></i>
          <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <Header />
      <div className="flex flex-1 min-h-0">
        {viewMode === 'list' && <div className="m-2"><Sidebar /></div>}
        <div className="flex-1 m-2 overflow-auto">
          {viewMode === 'list' ? <MainContent /> : <GanttView />}
        </div>
      </div>
      <AIChatPanel />
    </div>
  );
}

export default App;
