import {
  Bot,
  Database,
  HeartHandshake,
  Loader2,
  MessageSquarePlus,
  Send,
  Settings,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { MarkdownText } from '../components/MarkdownText';
import { useApp } from '../context/AppContext';
import {
  AI_PROVIDERS_META,
  buildHolisticSystemPrompt,
  sendAIMessage,
} from '../services/aiService';
import { AI_SKILLS_CATALOG, DEFAULT_ENABLED_SKILLS } from '../services/aiSkills';
import { AISkillId, ChatMessage, ChatThread } from '../types';

export const ChatPage: React.FC = () => {
  const {
    data,
    aiConfig,
    aiConn,
    updateAIConfig,
    hasActiveApiKey,
    saveChatThreads,
    setActiveTab,
    pendingChatPrompt,
    clearPendingChatPrompt,
  } = useApp();

  const [activeThreadId, setActiveThreadId] = useState<string>(
    () => data.chatThreads[0]?.id || 'thread-default'
  );
  const [selectedSkill, setSelectedSkill] = useState<AISkillId>('auto');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const companionName = data.profile.companionName || 'Tâm An';
  const providerMeta = AI_PROVIDERS_META[aiConfig.activeProvider];
  const enabledSkillIds = data.profile.enabledSkills || DEFAULT_ENABLED_SKILLS;
  const visibleSkills = AI_SKILLS_CATALOG.filter((s) => enabledSkillIds.includes(s.id));
  const activeSkillObj =
    selectedSkill !== 'auto'
      ? AI_SKILLS_CATALOG.find((s) => s.id === selectedSkill) || null
      : null;

  const threads: ChatThread[] =
    data.chatThreads.length > 0
      ? data.chatThreads
      : [
          {
            id: 'thread-default',
            title: `Trò chuyện cùng ${companionName}`,
            updatedAt: new Date().toISOString(),
            messages: [],
          },
        ];

  const currentThread =
    threads.find((t) => t.id === activeThreadId) || threads[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentThread.messages.length, sending]);

  const handleSendText = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || sending) return;

    if (!hasActiveApiKey) {
      setError(
        `Chưa có API Key cho ${providerMeta.name}. Hãy nhấn nút "Cài đặt AI" bên dưới để dán Key miễn phí nhé!`
      );
      return;
    }

    setError(null);
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...currentThread.messages, userMsg];
    const updatedTitle =
      currentThread.messages.length <= 1
        ? trimmed.slice(0, 42) + (trimmed.length > 42 ? '...' : '')
        : currentThread.title;

    const optimisticThreads = threads.map((t) =>
      t.id === currentThread.id
        ? { ...t, title: updatedTitle, messages: nextMessages, updatedAt: new Date().toISOString() }
        : t
    );

    saveChatThreads(optimisticThreads);
    setInput('');
    setSending(true);

    try {
      const systemPrompt = buildHolisticSystemPrompt(data, aiConfig.sharePersonalContext, {
        skill: selectedSkill,
        userPromptHint: trimmed,
      });
      const historyForApi = nextMessages.slice(-16).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const replyText = await sendAIMessage({
        messages: historyForApi,
        systemPrompt,
        aiConfig,
        temperature: selectedSkill === 'data_detective' ? 0.3 : 0.4,
      });

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: replyText,
        createdAt: new Date().toISOString(),
      };

      saveChatThreads(
        optimisticThreads.map((t) =>
          t.id === currentThread.id
            ? {
                ...t,
                messages: [...nextMessages, assistantMsg],
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối tới dịch vụ AI.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (pendingChatPrompt) {
      const promptToRun = pendingChatPrompt;
      clearPendingChatPrompt();
      if (hasActiveApiKey) {
        void handleSendText(promptToRun);
      } else {
        setInput(promptToRun);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChatPrompt]);

  const handleNewThread = () => {
    const newThread: ChatThread = {
      id: `thread-${Date.now()}`,
      title: 'Cuộc trò chuyện mới',
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-init-${Date.now()}`,
          role: 'assistant',
          content: `Mình đang lắng nghe đây! Hôm nay bạn muốn tâm sự chuyện tinh thần, rà soát sức khoẻ hay cùng mình tháo gỡ một mục tiêu nào?`,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    saveChatThreads([newThread, ...threads]);
    setActiveThreadId(newThread.id);
  };

  const handleDeleteThread = (threadId: string) => {
    const remaining = threads.filter((t) => t.id !== threadId);
    if (remaining.length === 0) {
      const fresh: ChatThread = {
        id: `thread-${Date.now()}`,
        title: `Trò chuyện cùng ${companionName}`,
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      saveChatThreads([fresh], threadId);
      setActiveThreadId(fresh.id);
    } else {
      saveChatThreads(remaining, threadId);
      if (activeThreadId === threadId) {
        setActiveThreadId(remaining[0].id);
      }
    }
  };

  const starterChips = [
    'Đánh giá xu hướng sức khoẻ & tinh thần dài hạn giúp mình',
    'Hôm nay mình thấy chênh vênh và khó tập trung quá',
    'Giúp mình điều chỉnh lại kế hoạch mục tiêu cho vừa sức',
    'Gợi ý thói quen buổi sáng 15 phút giúp tăng năng lượng',
  ];

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-5 h-[calc(100dvh-9.75rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-4rem)] min-h-[460px]">
      {/* Thanh chọn nhanh chủ đề gọn gàng trên iPhone 17 */}
      <div className="lg:hidden flex items-center gap-2">
        <select
          value={currentThread.id}
          onChange={(e) => setActiveThreadId(e.target.value)}
          className="flex-1 min-w-0 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-100 truncate"
        >
          {threads.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleNewThread}
          className="h-11 px-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1 shrink-0 active:scale-95 transition"
        >
          <MessageSquarePlus className="w-4 h-4" /> Mới
        </button>

        <button
          type="button"
          onClick={() => handleDeleteThread(currentThread.id)}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 flex items-center justify-center shrink-0 active:scale-95 transition"
          aria-label="Xoá hội thoại hiện tại"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Cột danh sách hội thoại trên máy tính */}
      <div className="hidden lg:flex lg:col-span-4 flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">
            Lịch sử tâm sự ({threads.length})
          </h3>
          <button
            onClick={handleNewThread}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" /> Mới
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {threads.map((t) => {
            const active = t.id === currentThread.id;
            return (
              <div
                key={t.id}
                onClick={() => setActiveThreadId(t.id)}
                className={`group cursor-pointer flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200/80 dark:border-emerald-800/60'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span className="truncate">{t.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteThread(t.id);
                  }}
                  className="opacity-60 hover:opacity-100 text-slate-400 hover:text-rose-500 p-1"
                  title="Xoá hội thoại"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Khung Chat chính */}
      <div className="flex-1 lg:col-span-8 flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden min-h-0">
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0">
              <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm flex items-center gap-1.5 truncate">
                <span>{companionName}</span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    aiConn.status === 'connected'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : aiConn.status === 'error'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      aiConn.status === 'connected'
                        ? 'bg-emerald-500'
                        : aiConn.status === 'error'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  {aiConn.status === 'connected'
                    ? `${providerMeta.name} • Online`
                    : aiConn.status === 'connecting'
                    ? 'Đang kết nối...'
                    : aiConn.status === 'error'
                    ? 'Lỗi API'
                    : 'Chưa gắn Key'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Hiểu cả nhật ký gần đây & lịch sử nhiều tháng/năm
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              updateAIConfig({
                ...aiConfig,
                sharePersonalContext: !aiConfig.sharePersonalContext,
              })
            }
            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition ${
              aiConfig.sharePersonalContext
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Database className="w-3 h-3" />
            {aiConfig.sharePersonalContext ? 'Ký ức Bật' : 'Ký ức Tắt'}
          </button>
        </div>

        {/* Thanh chọn Kỹ năng chuyên sâu (Bám sát thực tế, chống bịa chuyện) */}
        <div className="px-3.5 sm:px-5 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
          <div className="ios-scroll-x flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedSkill('auto')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                selectedSkill === 'auto'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              ✨ Tự động phối hợp
            </button>
            {visibleSkills.map((sk) => {
              const isSelected = selectedSkill === sk.id;
              return (
                <button
                  key={sk.id}
                  type="button"
                  onClick={() => setSelectedSkill(sk.id)}
                  title={sk.summary}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                  }`}
                >
                  {sk.emoji} {sk.shortLabel}
                </button>
              );
            })}
          </div>

          {activeSkillObj && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {activeSkillObj.samplePrompts.map((sp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => void handleSendText(sp)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 hover:bg-emerald-100 text-left truncate max-w-full transition"
                >
                  → {sp}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nội dung tin nhắn */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5">
          {currentThread.messages.length === 0 && (
            <div className="py-4 text-center space-y-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="font-bold text-sm sm:text-base">
                  Bắt đầu cuộc trò chuyện cùng {companionName}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {companionName} đọc hiểu cả chỉ số ngắn hạn lẫn quy luật đa tháng/đa năm của bạn.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                {starterChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void handleSendText(chip)}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 text-xs font-medium text-left transition"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentThread.messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[86%] sm:max-w-[78%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-tr-sm'
                      : 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                  }`}
                >
                  {isUser ? (
                    <p className="text-sm sm:text-[15px] whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  ) : (
                    <MarkdownText content={msg.content} />
                  )}
                </div>
              </div>
            );
          })}

          {sending && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500">
                {companionName} đang lắng nghe...
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <span>{error}</span>
              <button
                onClick={() => setActiveTab('settings')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold"
              >
                <Settings className="w-3.5 h-3.5" /> Cài đặt AI
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Ô nhập tin nhắn chống tự zoom trên iPhone 17 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendText(input);
          }}
          className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-end gap-2"
        >
          <textarea
            rows={1}
            placeholder={`Nhắn cho ${companionName}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSendText(input);
              }
            }}
            className="flex-1 max-h-28 resize-none px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 leading-snug focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="h-11 w-11 sm:w-auto sm:px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm inline-flex items-center justify-center gap-1.5 active:scale-95 transition shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Gửi</span>
          </button>
        </form>
      </div>
    </div>
  );
};
