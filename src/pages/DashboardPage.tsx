import {
  Activity,
  ArrowRight,
  BatteryCharging,
  Check,
  Database,
  Flame,
  Heart,
  Loader2,
  MessageCircleHeart,
  Moon,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Target,
} from 'lucide-react';
import React, { useState } from 'react';
import { MarkdownText } from '../components/MarkdownText';
import { useApp } from '../context/AppContext';
import { generateDailyBriefing } from '../services/aiService';
import { computeLifeBalanceScore, getReadinessInfo } from '../services/analyticsEngine';
import {
  calculateGoalStreakStats,
  calculateHabitStreak,
  formatDisplayDate,
  getGreetingByHour,
  getTodayStr,
} from '../utils/dateUtils';

export const DashboardPage: React.FC = () => {
  const {
    data,
    aiConfig,
    hasActiveApiKey,
    setActiveTab,
    toggleHabitDate,
    setDailyBriefing,
    loadSampleData,
    loadLongTermSampleData,
    triggerChatWithPrompt,
  } = useApp();

  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  const today = getTodayStr();
  const todayLog = data.dailyLogs[today];
  const { greeting, periodHint } = getGreetingByHour();
  const companionName = data.profile.companionName || 'Tâm An';

  const activeGoals = data.goals.filter((g) => g.status === 'active');
  const completedHabitsToday = data.habits.filter((h) => h.completedDates.includes(today)).length;
  const totalLogsCount = Object.keys(data.dailyLogs).length;

  const habitRatioToday =
    data.habits.length > 0 ? completedHabitsToday / data.habits.length : 0.5;
  const todayReadiness = todayLog
    ? getReadinessInfo(computeLifeBalanceScore(todayLog, habitRatioToday))
    : null;

  const handleGenerateBriefing = async () => {
    setBriefingError(null);
    setLoadingBriefing(true);
    try {
      const content = await generateDailyBriefing(data, aiConfig);
      setDailyBriefing(today, content);
    } catch (err) {
      setBriefingError(err instanceof Error ? err.message : 'Không thể kết nối AI lúc này.');
    } finally {
      setLoadingBriefing(false);
    }
  };

  const quickPrompts = [
    {
      label: 'Hôm nay mình thấy hơi quá tải & mệt mỏi',
      prompt:
        'Hôm nay mình cảm thấy hơi quá tải và cạn năng lượng. Hãy lắng nghe và gợi ý giúp mình cách cân bằng lại tâm sinh lý cũng như điều chỉnh khối lượng mục tiêu hôm nay nhé.',
    },
    {
      label: 'Phân tích nhịp tâm sinh lý tuần này',
      prompt:
        'Dựa trên dữ liệu nhật ký những ngày gần đây của mình, bạn nhận thấy mối liên hệ nào giữa giấc ngủ, mức căng thẳng và tâm trạng của mình không?',
    },
    {
      label: 'Lấy lại động lực cho mục tiêu',
      prompt:
        'Nhìn vào các mục tiêu hiện tại của mình, hãy chọn giúp mình 1 việc nhỏ nhất chỉ tốn 15 phút để mình bắt đầu tạo đà ngay bây giờ nhé!',
    },
    {
      label: 'Thư giãn tâm trí để tối nay ngủ sâu',
      prompt:
        'Hãy hướng dẫn mình một quy trình hạ nhiệt tâm trí 10 phút tối nay để buông bỏ lo âu và đi vào giấc ngủ sâu hơn.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner chào mừng */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white p-6 sm:p-8 shadow-xl shadow-emerald-900/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-1.5">
            <p className="text-emerald-100 text-xs sm:text-sm font-medium capitalize">
              {formatDisplayDate(today)}
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {greeting}, {data.profile.userName || 'Bạn'}!
            </h2>
            <p className="text-emerald-50/90 text-sm sm:text-base max-w-xl">
              {todayReadiness ? todayReadiness.advice : periodHint}
            </p>
            {todayReadiness && (
              <div className="pt-1">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-xs font-bold">
                  Điểm Cân Bằng hôm nay: {todayReadiness.score}/100 • {todayReadiness.label}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveTab('checkin')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-700 font-bold text-sm shadow-sm hover:bg-emerald-50 transition"
            >
              <Activity className="w-4 h-4" />
              {todayLog ? 'Cập nhật nhật ký hôm nay' : 'Ghi nhận Tâm - Sinh - Lý'}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800/40 hover:bg-emerald-800/60 text-white border border-white/20 font-semibold text-sm transition"
            >
              <MessageCircleHeart className="w-4 h-4" />
              Tâm sự cùng {companionName}
            </button>
          </div>
        </div>
      </div>

      {/* Gợi ý nạp dữ liệu mẫu nếu người dùng mới mở lần đầu */}
      {totalLogsCount === 0 && (
        <div className="rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm sm:text-base flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Không gian của bạn đang mới tinh!
            </h3>
            <p className="text-xs sm:text-sm text-amber-800/90 dark:text-amber-300/80">
              Bạn có thể bắt đầu ghi nhật ký ngày đầu tiên ngay, hoặc nạp thử bộ dữ liệu mẫu 7 ngày để trải nghiệm biểu đồ phân tích và cách AI đọc hiểu tâm sinh lý (có thể xoá sạch bất cứ lúc nào trong Cài đặt).
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={loadSampleData}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition"
            >
              Mẫu 7 ngày
            </button>
            <button
              onClick={() => loadLongTermSampleData(180)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition"
            >
              Mô phỏng 6 tháng (180 ngày)
            </button>
          </div>
        </div>
      )}

      {/* Thẻ Lời nhắn đồng hành hôm nay từ AI */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                Góc nhìn đồng hành hôm nay từ {companionName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tổng hợp từ sức khoẻ thể chất, cảm xúc và mục tiêu của bạn
              </p>
            </div>
          </div>

          {hasActiveApiKey ? (
            <button
              onClick={handleGenerateBriefing}
              disabled={loadingBriefing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-semibold transition disabled:opacity-60"
            >
              {loadingBriefing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {data.dailyBriefing?.date === today ? 'Làm mới góc nhìn' : 'Nhận lời khuyên hôm nay'}
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('settings')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-semibold transition"
            >
              <Settings className="w-3.5 h-3.5" />
              Gắn API Key miễn phí
            </button>
          )}
        </div>

        {briefingError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm mb-3">
            {briefingError}
          </div>
        )}

        {data.dailyBriefing?.date === today ? (
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-slate-700 dark:text-slate-200">
            <MarkdownText content={data.dailyBriefing.content} />
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 text-sm">
            {hasActiveApiKey ? (
              <span>
                Nhấn <strong>“Nhận lời khuyên hôm nay”</strong> để {companionName} đọc lại nhịp sinh học & mục tiêu của bạn và gợi ý trọng tâm nhẹ nhàng cho cả ngày nhé!
              </span>
            ) : (
              <span>
                Hãy ghé mục <strong>Cài đặt</strong> để kết nối Google Gemini hoặc Groq (hoàn toàn miễn phí) — {companionName} sẽ phân tích dữ liệu cá nhân và đưa ra lời khuyên sát thực tế nhất cho riêng bạn.
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4 Thẻ chỉ số nhanh hôm nay */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div
          onClick={() => setActiveTab('checkin')}
          className="cursor-pointer rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 hover:border-emerald-400 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tâm trạng</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold">
            {todayLog ? `${todayLog.mood}/10` : '--'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {todayLog
              ? todayLog.emotions.slice(0, 2).join(', ') || `Stress: ${todayLog.stress}/10`
              : 'Chạm để ghi nhận'}
          </p>
        </div>

        <div
          onClick={() => setActiveTab('checkin')}
          className="cursor-pointer rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 hover:border-emerald-400 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Năng lượng</span>
            <BatteryCharging className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold">
            {todayLog ? `${todayLog.energy}/10` : '--'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {todayLog ? `Vận động ${todayLog.exerciseMinutes} phút` : 'Chưa cập nhật hôm nay'}
          </p>
        </div>

        <div
          onClick={() => setActiveTab('checkin')}
          className="cursor-pointer rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 hover:border-emerald-400 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Giấc ngủ</span>
            <Moon className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold">
            {todayLog ? `${todayLog.sleepHours}h` : '--'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {todayLog
              ? `Chất lượng ${todayLog.sleepQuality}/5 sao`
              : 'Khuyến nghị 7.5–8h/đêm'}
          </p>
        </div>

        <div
          onClick={() => setActiveTab('goals')}
          className="cursor-pointer rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 hover:border-emerald-400 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Thói quen</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-extrabold">
            {completedHabitsToday}/{data.habits.length}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hoàn thành trong ngày
          </p>
        </div>
      </div>

      {/* Khu vực 2 cột: Thói quen hôm nay & Mục tiêu đang theo đuổi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thói quen hàng ngày */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base sm:text-lg">Thói quen nuôi dưỡng mỗi ngày</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tích chọn từng việc nhỏ để giữ chuỗi bền bỉ
              </p>
            </div>
            <button
              onClick={() => setActiveTab('goals')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              Quản lý <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {data.habits.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-slate-500 mb-3">Bạn chưa thêm thói quen nào.</p>
              <button
                onClick={() => setActiveTab('goals')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
              >
                <Plus className="w-4 h-4" /> Tạo thói quen đầu tiên
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.habits.map((habit) => {
                const done = habit.completedDates.includes(today);
                const streak = calculateHabitStreak(habit.completedDates, today);
                return (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabitDate(habit.id, today)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition ${
                      done
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70'
                        : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
                          done
                            ? 'bg-emerald-600 text-white'
                            : 'border-2 border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {done && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <span className="text-lg">{habit.icon}</span>
                      <span
                        className={`text-sm font-medium truncate ${
                          done ? 'line-through text-slate-500 dark:text-slate-400' : ''
                        }`}
                      >
                        {habit.title}
                      </span>
                    </div>

                    <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100/80 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300">
                      <Flame className="w-3.5 h-3.5" /> {streak} ngày
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mục tiêu trọng tâm */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base sm:text-lg">Mục tiêu đang hướng tới</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Giữ rõ lý do bắt đầu để tiến bước vững vàng
              </p>
            </div>
            <button
              onClick={() => setActiveTab('goals')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              Chi tiết <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeGoals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <Target className="w-9 h-9 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm text-slate-500 mb-3">
                Hãy đặt 1–3 mục tiêu quan trọng nhất để {companionName} đồng hành cùng bạn nhé.
              </p>
              <button
                onClick={() => setActiveTab('goals')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
              >
                <Plus className="w-4 h-4" /> Đặt mục tiêu mới
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {activeGoals.slice(0, 3).map((goal) => {
                const nextStep = goal.milestones.find((m) => !m.completed);
                const mode = goal.trackingType || 'streak_days';
                const gStats = calculateGoalStreakStats(goal.checkInDates, goal.slipDates, today);
                const metricBadge =
                  mode === 'streak_days'
                    ? `${gStats.totalCleanDays}/${goal.targetDays || 30} ngày`
                    : mode === 'numeric'
                    ? `${goal.currentValue || 0}/${goal.targetValue || 100} ${goal.unitLabel || ''}`
                    : `${goal.milestones.filter((m) => m.completed).length}/${goal.milestones.length} bước`;

                return (
                  <div
                    key={goal.id}
                    onClick={() => setActiveTab('goals')}
                    className="cursor-pointer p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:border-emerald-400 transition space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm leading-snug">{goal.title}</h4>
                      <span className="shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {metricBadge}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    {nextStep && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        Bước tiếp theo: <span className="font-medium">{nextStep.title}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Gợi ý mở lời nhanh cùng Người bạn AI */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <h3 className="font-bold text-base mb-1">
          Bạn đang cần {companionName} hỗ trợ điều gì ngay lúc này?
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Chạm vào một chủ đề bên dưới để bắt đầu cuộc trò chuyện sâu sát với dữ liệu của bạn
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickPrompts.map((item, idx) => (
            <button
              key={idx}
              onClick={() => triggerChatWithPrompt(item.prompt)}
              className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200/70 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 text-left transition group"
            >
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                {item.label}
              </span>
              <ArrowRight className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
