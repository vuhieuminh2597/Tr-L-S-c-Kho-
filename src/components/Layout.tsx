import {
  Activity,
  AlertCircle,
  BarChart3,
  Cloud,
  HeartHandshake,
  Home,
  Loader2,
  MessageCircleHeart,
  Moon,
  RefreshCw,
  Settings,
  Sparkles,
  Sun,
  Target,
} from 'lucide-react';
import React from 'react';
import { useApp } from '../context/AppContext';
import { AI_PROVIDERS_META } from '../services/aiService';
import { NavTab } from '../types';

const NAV_ITEMS: { id: NavTab; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Hôm nay', shortLabel: 'Hôm nay', icon: Home },
  { id: 'checkin', label: 'Nhật ký Tâm Sinh Lý', shortLabel: 'Nhật ký', icon: Activity },
  { id: 'goals', label: 'Mục tiêu & Thói quen', shortLabel: 'Mục tiêu', icon: Target },
  { id: 'analytics', label: 'Phân tích Đa Năm', shortLabel: 'Phân tích', icon: BarChart3 },
  { id: 'chat', label: 'Trò chuyện Tri kỷ AI', shortLabel: 'Tri kỷ AI', icon: MessageCircleHeart },
  { id: 'settings', label: 'Cài đặt & Đồng bộ', shortLabel: 'Cài đặt', icon: Settings },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    data,
    aiConfig,
    gistConfig,
    activeTab,
    setActiveTab,
    toggleTheme,
    aiConn,
    verifyAIConnectionNow,
    syncStatus,
    syncToCloudNow,
  } = useApp();

  const companionName = data.profile.companionName || 'Tâm An';
  const providerMeta = AI_PROVIDERS_META[aiConfig.activeProvider];

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar cho màn hình máy tính */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 z-30">
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                {companionName}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sức khoẻ • Tâm lý • Mục tiêu
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            title="Chuyển chế độ Sáng / Tối"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {data.theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 m-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                API AI:
              </span>

              {aiConn.status === 'connected' ? (
                <button
                  onClick={() => void verifyAIConnectionNow()}
                  title="Đã xác thực thành công với máy chủ! Nhấn để kiểm tra lại"
                  className="inline-flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/90 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Đã kết nối
                </button>
              ) : aiConn.status === 'connecting' ? (
                <span className="inline-flex items-center gap-1 font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <Loader2 className="w-3 h-3 animate-spin" /> Đang kết nối...
                </span>
              ) : aiConn.status === 'error' ? (
                <button
                  onClick={() => setActiveTab('settings')}
                  title={aiConn.message}
                  className="inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                >
                  <AlertCircle className="w-3 h-3" /> Lỗi kết nối
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('settings')}
                  className="font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                >
                  Chưa gắn Key
                </button>
              )}
            </div>

            {aiConn.status === 'connected' && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pl-5">
                <span className="truncate">{providerMeta.name}</span>
                {aiConn.latencyMs && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                    {aiConn.latencyMs}ms
                  </span>
                )}
              </div>
            )}

            {aiConn.status === 'error' && (
              <p className="text-[11px] text-rose-500 dark:text-rose-400 pl-5 line-clamp-2 leading-tight">
                {aiConn.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-sky-500" />
              Đám mây Gist:
            </span>
            {gistConfig.githubToken.trim() ? (
              <button
                onClick={() => void syncToCloudNow().catch(() => setActiveTab('settings'))}
                disabled={syncStatus === 'syncing'}
                title="Nhấn để hợp nhất & đồng bộ 2 chiều ngay"
                className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline disabled:opacity-60"
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" /> Đang đồng bộ
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" /> Đồng bộ ngay
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('settings')}
                className="font-medium text-slate-400 hover:underline"
              >
                IndexedDB
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Header chuẩn Dynamic Island trên iPhone 17 */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/80 px-4 pb-2.5 pt-safe-top flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-[15px] leading-tight truncate">{companionName}</h1>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
              {aiConn.status === 'connected' ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                    Đã kết nối • {providerMeta.name}
                  </span>
                </>
              ) : aiConn.status === 'connecting' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-sky-500 shrink-0" />
                  <span>Đang kết nối {providerMeta.name}...</span>
                </>
              ) : aiConn.status === 'error' ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-rose-600 dark:text-rose-400 font-semibold truncate">
                    Lỗi kết nối API — Chạm kiểm tra
                  </span>
                </>
              ) : (
                <span>Chạm bánh răng để gắn AI Key</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {gistConfig.githubToken.trim() && (
            <button
              onClick={() => void syncToCloudNow().catch(() => setActiveTab('settings'))}
              disabled={syncStatus === 'syncing'}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400 active:scale-95 transition"
              aria-label="Đồng bộ 2 chiều ngay"
              title="Đồng bộ 2 chiều ngay"
            >
              <RefreshCw
                className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
              />
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition"
            aria-label="Đổi giao diện"
          >
            {data.theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
            aria-label="Cài đặt"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Khu vực nội dung chính (tối ưu chiều rộng 402px của iPhone 17) */}
      <main className="flex-1 lg:pl-72 main-mobile-pb lg:pb-10">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8">{children}</div>
      </main>

      {/* Thanh điều hướng đáy chuẩn iOS Home Indicator trên iPhone 17 */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 px-1.5 pt-1.5 pb-safe-bottom">
        <div className="grid grid-cols-5 gap-0.5">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center rounded-2xl active:scale-95 transition ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-[10.5px] leading-tight tracking-tight">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
