import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../stores/chatStore';
import { useProjectStore } from '../stores/projectStore';
import DuplicateNameModal from './DuplicateNameModal';

interface NotificationData {
  title: string;
  content: string;
}

interface AIResponse {
  type: 'text' | 'text_with_notification' | 'text_with_action';
  content: string;
  notification?: NotificationData;
  action?: {
    action: 'create' | 'update' | 'delete';
    target: 'project' | 'phase' | 'task';
    id?: string;
    data?: any;
    displayText: string;
  };
}

export default function AIChatPanel() {
  const { t } = useTranslation();
  const {
    messages,
    isOpen,
    isLoading,
    toggleChat,
    sendMessage,
    clearHistory,
    config,
    pendingAction,
    setPendingAction,
    executePendingAction,
    clearPendingAction,
  } = useChatStore();
  const { projects, phases, tasks, refreshData } = useProjectStore();
  const [input, setInput] = useState('');
  const [pendingNotification, setPendingNotification] = useState<NotificationData | null>(null);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<{ name: string; existingProjectId: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen]);

  // Build project context for AI
  const projectContext = {
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      progress: p.progress,
      startDate: p.startDate,
      endDate: p.endDate,
      phases: phases
        .filter((ph) => ph.projectId === p.id)
        .map((ph) => ({
          id: ph.id,
          name: ph.name,
          status: ph.status,
          startDate: ph.startDate,
          endDate: ph.endDate,
          tasks: tasks
            .filter((t) => t.phaseId === ph.id)
            .map((t) => ({
              id: t.id,
              name: t.name,
              assignee: t.assignee,
              dueDate: t.dueDate,
              status: t.status,
              priority: t.priority,
            })),
        })),
    })),
    statistics: {
      totalProjects: projects.length,
      completedProjects: projects.filter((p) => p.progress === 100).length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === 'done').length,
      overdueTasks: tasks.filter(
        (t) => t.status !== 'done' && new Date(t.dueDate) < new Date()
      ).length,
    },
  };

  // Parse ACTION block from text
  const parseActionBlock = (text: string): void => {
    const actionMatch = text.match(/\[ACTION\]\s*\n([\s\S]*?)\n\[\/ACTION\]/);
    if (actionMatch) {
      const actionContent = actionMatch[1];
      const actionMatch_type = actionContent.match(/操作:\s*(.+)/);
      const actionMatch_target = actionContent.match(/类型:\s*(.+)/);
      const actionMatch_id = actionContent.match(/ID:\s*(.+)/);
      const actionMatch_data = actionContent.match(/内容:\s*(\{[\s\S]*\})/);

      if (actionMatch_type && actionMatch_target) {
        const actionType = actionMatch_type[1].trim();
        const actionTarget = actionMatch_target[1].trim();
        let actionData: any = {};
        let actionId: string | undefined;

        if (actionMatch_data) {
          try {
            actionData = JSON.parse(actionMatch_data[1].trim());
          } catch {
            actionData = actionMatch_data[1].trim();
          }
        }

        if (actionMatch_id) {
          actionId = actionMatch_id[1].trim();
        }

        const actionTypeMap: Record<string, 'create' | 'update' | 'delete'> = {
          '创建': 'create', '更新': 'update', '删除': 'delete',
        };
        const targetTypeMap: Record<string, 'project' | 'phase' | 'task'> = {
          '项目': 'project', '阶段': 'phase', '任务': 'task',
        };
        const displayTextMap: Record<string, string> = {
          '创建': '创建', '更新': '更新', '删除': '删除',
        };

        setPendingAction({
          action: actionTypeMap[actionType] || 'create',
          target: targetTypeMap[actionTarget] || 'project',
          id: actionId,
          data: actionData,
          displayText: `${displayTextMap[actionType] || actionType}${targetTypeMap[actionTarget] || actionTarget}`,
        });
      }
    }
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setAttachedImages(prev => [...prev, base64]);
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attached image
  const removeAttachedImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedImages.length === 0) || isLoading) return;

    const message = input.trim();

    // Check if user is confirming a pending action via text input
    if (pendingAction) {
      const confirmKeywords = ['是', '确认', '好的', 'execute', 'confirm', 'yes', 'y'];
      const lowerContent = message.toLowerCase();
      const isConfirm = confirmKeywords.some(k => lowerContent.includes(k.toLowerCase()));

      if (isConfirm) {
        // Execute the pending action
        const result = await executePendingAction();
        if (result.success) {
          refreshData();
          clearPendingAction();
        } else if (result.error === 'DUPLICATE_NAME') {
          // Show duplicate name warning
          setDuplicateWarning({
            name: pendingAction.data?.name || '',
            existingProjectId: result.duplicateProject?.id || '',
          });
          // Don't clear pending action - user needs to choose
          setInput('');
          setAttachedImages([]);
          return;
        }
        // Clear input and continue - send confirmation to AI for next response
        setInput('');
        setAttachedImages([]);
        // Don't return early - send the confirmation to AI
      } else {
        clearPendingAction();
      }
    }

    // Build content with images
    let contentToSend = message;
    if (attachedImages.length > 0) {
      contentToSend = `[图片] ${message}`;
    }

    setInput('');
    setAttachedImages([]);

    const rawResponse = await sendMessage(contentToSend, projectContext, attachedImages);

    // Focus back to input after AI responds
    setTimeout(() => inputRef.current?.focus(), 100);

    // Parse response - check for JSON first
    let responseText = rawResponse;
    try {
      const parsed: AIResponse = JSON.parse(rawResponse);
      responseText = parsed.content || rawResponse;
      if (parsed.type === 'text_with_notification' && parsed.notification) {
        setPendingNotification(parsed.notification);
      }
    } catch {
      // Response is plain text
    }

    // Check for ACTION block in AI response
    parseActionBlock(responseText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConfirmNotification = async () => {
    if (!pendingNotification || !window.electronAPI) return;

    const result = await window.electronAPI.sendAINotification(
      pendingNotification.title,
      pendingNotification.content
    );

    if (!result.success) {
      console.error('通知发送失败：', result.error);
    }

    setPendingNotification(null);
  };

  const handleCancelNotification = () => {
    setPendingNotification(null);
  };

  const handleCancelAction = () => {
    clearPendingAction();
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-50"
        title={t('ai.title')}
      >
        <i className="fa-solid fa-robot text-xl"></i>
      </button>
    );
  }

  return (
    <>
      {/* Notification Confirmation Modal */}
      {pendingNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-96 max-w-[90vw] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <i className="fa-solid fa-bell text-blue-500"></i>
              </div>
              <div>
                <h3 className="font-semibold">{t('ai.confirmTitle')}</h3>
                <p className="text-xs text-gray-500">{t('ai.confirmSubtitle')}</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {pendingNotification.title}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {pendingNotification.content}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelNotification}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmNotification}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
              >
                {t('ai.confirmSend')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Name Warning Modal */}
      {duplicateWarning && (
        <DuplicateNameModal
          name={duplicateWarning.name}
          onCreateAnyway={async () => {
            // Force create with a modified name
            if (pendingAction) {
              const forcedData = { ...pendingAction.data, name: `${duplicateWarning.name} (copy)` };
              const result = await window.electronAPI.executeAIAction({
                type: pendingAction.action,
                target: pendingAction.target,
                id: pendingAction.id,
                data: forcedData,
              });
              if (result.success) {
                refreshData();
              }
            }
            setDuplicateWarning(null);
            clearPendingAction();
          }}
          onUpdate={async () => {
            // Update existing project
            if (pendingAction && duplicateWarning.existingProjectId) {
              const result = await window.electronAPI.executeAIAction({
                type: 'update',
                target: 'project',
                id: duplicateWarning.existingProjectId,
                data: pendingAction.data,
              });
              if (result.success) {
                refreshData();
              }
            }
            setDuplicateWarning(null);
            clearPendingAction();
          }}
          onCancel={() => {
            setDuplicateWarning(null);
            clearPendingAction();
          }}
        />
      )}

      {/* Action Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-96 max-w-[90vw] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <i className="fa-solid fa-list-check text-green-500"></i>
              </div>
              <div>
                <h3 className="font-semibold">{t('ai.confirmActionTitle') || '确认操作'}</h3>
                <p className="text-xs text-gray-500">{t('ai.confirmActionSubtitle') || 'AI 请求执行以下操作'}</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {pendingAction.displayText}
              </div>
              {pendingAction.data && (
                <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-32">
                  {JSON.stringify(pendingAction.data, null, 2)}
                </pre>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelAction}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  const result = await executePendingAction();
                  if (result.success) {
                    refreshData();
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors"
              >
                {t('ai.confirm') || '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 w-96 h-[32rem] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-robot text-blue-500"></i>
            <span className="font-semibold">{t('ai.title')}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearHistory}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500"
              title={t('ai.newSession')}
            >
              <i className="fa-solid fa-plus text-sm"></i>
            </button>
            <button
              onClick={toggleChat}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-500 py-8">
              <i className="fa-solid fa-robot text-4xl mb-3 opacity-50"></i>
              <p className="text-sm">{t('ai.welcome')}</p>
              <p className="text-xs mt-1">{t('ai.welcomeHint')}</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}
                >
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2 text-gray-500">
                  <i className="fa-solid fa-circle-notch animate-spin"></i>
                  <span className="text-sm">{t('ai.thinking')}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {/* Attached Images Preview */}
          {attachedImages.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {attachedImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img src={img} alt={`Attachment ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg" />
                  <button
                    onClick={() => removeAttachedImage(idx)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <i className="fa-solid fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="px-3 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              title={t('ai.attachImage')}
            >
              <i className="fa-solid fa-image"></i>
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('ai.inputPlaceholder')}
              className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() && attachedImages.length === 0}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
          {!config.enabled && (
            <p className="text-xs text-orange-500 mt-2">
              <i className="fa-solid fa-exclamation-triangle mr-1"></i>
              {t('ai.notEnabled')}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
