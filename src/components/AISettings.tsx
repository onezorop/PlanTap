import { useState, useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import type { AIConfig, AIProviderType } from '../types';

const AI_PROVIDERS = [
  { type: 'openai' as AIProviderType, name: 'OpenAI', defaultModel: 'gpt-4o' },
  { type: 'claude' as AIProviderType, name: 'Claude', defaultModel: 'claude-3-5-sonnet' },
  { type: 'ollama' as AIProviderType, name: 'Ollama (本地)', defaultModel: 'llama3' },
  { type: 'custom' as AIProviderType, name: '自定义 OpenAI', defaultModel: 'gpt-4o' },
];

export default function AISettings() {
  const { config, updateConfig, init } = useChatStore();
  const [localConfig, setLocalConfig] = useState<AIConfig>(config);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleProviderChange = (type: AIProviderType) => {
    const provider = AI_PROVIDERS.find((p) => p.type === type)!;
    setLocalConfig({
      ...localConfig,
      provider: {
        ...localConfig.provider,
        type,
        name: provider.name,
        model: provider.defaultModel,
      },
    });
  };

  const handleSave = async () => {
    await updateConfig(localConfig);
  };

  const handleTest = async () => {
    if (!window.electronAPI) return;
    setTesting(true);
    setTestResult(null);

    try {
      // Save config first
      await updateConfig(localConfig);

      // Test with a simple message
      const result = await window.electronAPI.aiChat(
        [{ role: 'user', content: '你好' }],
        { projects: [], statistics: {} }
      );

      if (result.includes('抱歉') || result.includes('失败')) {
        setTestResult({ type: 'error', message: result });
      } else {
        setTestResult({ type: 'success', message: '连接成功！' });
      }
    } catch (error) {
      setTestResult({ type: 'error', message: String(error) });
    }

    setTesting(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <i className="fa-solid fa-robot text-blue-500"></i>
        AI 设置
      </h3>

      {/* Enable Toggle */}
      <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <input
          type="checkbox"
          checked={localConfig.enabled}
          onChange={(e) => setLocalConfig({ ...localConfig, enabled: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300"
        />
        <span className="font-medium">启用 AI 助手</span>
      </label>

      {localConfig.enabled && (
        <>
          {/* Provider Selection */}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
              AI 提供商
            </label>
            <select
              value={localConfig.provider.type}
              onChange={(e) => handleProviderChange(e.target.value as AIProviderType)}
              className="w-full input-notion"
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.type} value={p.type}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
              API Key {localConfig.provider.type !== 'ollama' && '*'}
            </label>
            <input
              type="password"
              value={localConfig.provider.apiKey || ''}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  provider: { ...localConfig.provider, apiKey: e.target.value },
                })
              }
              placeholder={localConfig.provider.type === 'ollama' ? '本地部署无需API Key' : '输入 API Key'}
              className="w-full input-notion"
            />
          </div>

          {/* Custom Base URL */}
          {(localConfig.provider.type === 'custom' || localConfig.provider.type === 'ollama') && (
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                {localConfig.provider.type === 'ollama' ? 'Ollama 地址' : 'API 地址'}
              </label>
              <input
                type="text"
                value={localConfig.provider.baseUrl || ''}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    provider: { ...localConfig.provider, baseUrl: e.target.value },
                  })
                }
                placeholder={
                  localConfig.provider.type === 'ollama'
                    ? 'http://localhost:11434'
                    : 'https://api.openai.com/v1'
                }
                className="w-full input-notion"
              />
            </div>
          )}

          {/* Model */}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
              模型
            </label>
            <input
              type="text"
              value={localConfig.provider.model}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  provider: { ...localConfig.provider, model: e.target.value },
                })
              }
              placeholder="gpt-4o"
              className="w-full input-notion"
            />
            <p className="text-xs text-gray-400 mt-1">
              {localConfig.provider.type === 'openai' && '推荐: gpt-4o, gpt-4-turbo, gpt-3.5-turbo'}
              {localConfig.provider.type === 'claude' && '推荐: claude-3-5-sonnet, claude-3-opus'}
              {localConfig.provider.type === 'ollama' && '推荐: llama3, mistral, qwen2'}
              {localConfig.provider.type === 'custom' && '输入你的自定义模型名称'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="btn-notion flex-1"
            >
              <i className="fa-solid fa-save mr-2"></i>
              保存
            </button>
            <button
              onClick={handleTest}
              disabled={testing || (!localConfig.provider.apiKey && localConfig.provider.type !== 'ollama')}
              className="btn-notion flex-1"
            >
              {testing ? (
                <>
                  <i className="fa-solid fa-circle-notch animate-spin mr-2"></i>
                  测试中...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-plug mr-2"></i>
                  测试连接
                </>
              )}
            </button>
          </div>

          {testResult && (
            <div
              className={`text-sm p-3 rounded-lg ${
                testResult.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600'
              }`}
            >
              {testResult.message}
            </div>
          )}
        </>
      )}

      <div className="text-xs text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
        <i className="fa-solid fa-shield-halved mr-1"></i>
        API Key 仅存储在本地，不会上传到任何服务器
      </div>
    </div>
  );
}