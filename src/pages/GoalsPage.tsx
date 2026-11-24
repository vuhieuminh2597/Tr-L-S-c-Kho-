import {
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Flame,
  ListChecks,
  Loader2,
  MessageCircleHeart,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { MarkdownText } from '../components/MarkdownText';
import { useApp } from '../context/AppContext';
import { coachGoalWithAI, suggestGoalMilestonesWithAI } from '../services/aiService';
import { Goal, GoalCategory, GoalTrackingType, Habit } from '../types';
import {
  calculateGoalStreakStats,
  calculateHabitStreak,
  computeGoalAutoProgress,
  formatShortDate,
  getPastDateKeys,
  getTodayStr,
  parseDateKey,
} from '../utils/dateUtils';

const CATEGORY_LABELS: Record<GoalCategory, { label: string; color: string }> = {
  health: {
    label: 'Sức khoẻ & Thể chất',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  mind: {
    label: 'Tinh thần & Làm chủ Bản thân',
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  career: {
    label: 'Sự nghiệp & Học tập',
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  },
  finance: {
    label: 'Tài chính',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  personal: {
    label: 'Phát triển Cá nhân',
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
};

const TRACKING_MODES: {
  id: GoalTrackingType;
  shortLabel: string;
  title: string;
  desc: string;
}[] = [
  {
    id: 'streak_days',
    shortLabel: 'Chuỗi ngày kỷ luật',
    title: '🔥 Đếm Ngày Giữ Vững (Kỷ luật / Cai thói quen xấu)',
    desc: 'Điểm danh từng ngày thắng lợi (VD: 30 ngày, 90 ngày) — rõ ràng, tạo đà mỗi ngày.',
  },
  {
    id: 'milestones',
    shortLabel: 'Các bước cột mốc',
    title: '☑️ Hoàn Thành Theo Từng Bước Cột Mốc',
    desc: 'Chia mục tiêu thành các đầu việc cụ thể, xong việc nào tích việc đó.',
  },
  {
    id: 'numeric',
    shortLabel: 'Con số định lượng',
    title: '📈 Đếm Con Số Cụ Thể (Km, Cuốn sách, Buổi tập...)',
    desc: 'Cộng dồn con số thực tế đạt được mỗi ngày cho tới vạch đích.',
  },
];

const HABIT_ICONS = ['💧', '🏃', '🌙', '🌿', '📚', '🧘', '🥗', '🎯', '✍️', '☀️'];

export const GoalsPage: React.FC = () => {
  const {
    data,
    aiConfig,
    hasActiveApiKey,
    saveGoals,
    saveHabits,
    toggleHabitDate,
    setActiveTab,
    triggerChatWithPrompt,
  } = useApp();

  // State tạo mục tiêu mới
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState<GoalCategory>('health');
  const [goalTrackingType, setGoalTrackingType] = useState<GoalTrackingType>('streak_days');
  const [goalTargetDays, setGoalTargetDays] = useState<number>(30);
  const [goalTargetValue, setGoalTargetValue] = useState<number>(30);
  const [goalUnitLabel, setGoalUnitLabel] = useState<string>('buổi');
  const [goalWhy, setGoalWhy] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalFirstSteps, setGoalFirstSteps] = useState('');

  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, string>>({});
  const [coachingGoalId, setCoachingGoalId] = useState<string | null>(null);
  const [splittingGoalId, setSplittingGoalId] = useState<string | null>(null);
  const [collapsedAdviceIds, setCollapsedAdviceIds] = useState<Record<string, boolean>>({});
  const [copiedGoalId, setCopiedGoalId] = useState<string | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'active' | 'completed' | 'all'>('active');

  // State tạo thói quen mới
  const [showNewHabit, setShowNewHabit] = useState(false);
  const [habitTitle, setHabitTitle] = useState('');
  const [habitIcon, setHabitIcon] = useState('🌿');

  const today = getTodayStr();
  const last7Days = getPastDateKeys(7, today);
  const last14Days = getPastDateKeys(14, today);
  const companionName = data.profile.companionName || 'Tâm An';

  const recalculateGoal = (g: Goal): Goal => {
    const progress = computeGoalAutoProgress({
      trackingType: g.trackingType,
      targetDays: g.targetDays,
      checkInDates: g.checkInDates,
      slipDates: g.slipDates,
      milestones: g.milestones,
      currentValue: g.currentValue,
      targetValue: g.targetValue,
      fallbackProgress: g.progress,
    });
    return {
      ...g,
      progress: g.status === 'completed' ? 100 : progress,
      status: progress >= 100 ? 'completed' : g.status === 'completed' ? 'active' : g.status,
      updatedAt: new Date().toISOString(),
    };
  };

  const updateSingleGoal = (goalId: string, updater: (g: Goal) => Goal) => {
    saveGoals(
      data.goals.map((g) => (g.id === goalId ? recalculateGoal(updater(g)) : g))
    );
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    const milestones = goalFirstSteps
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((title, i) => ({
        id: `ms-${Date.now()}-${i}`,
        title,
        completed: false,
      }));

    let computedTargetDays = goalTargetDays;
    if (goalTrackingType === 'streak_days' && goalTargetDate) {
      const diff = Math.round(
        (parseDateKey(goalTargetDate).getTime() - parseDateKey(today).getTime()) / 86400000
      );
      if (diff >= 1 && !goalTargetDays) {
        computedTargetDays = diff;
      }
    }

    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      title: goalTitle.trim(),
      category: goalCategory,
      whyItMatters: goalWhy.trim(),
      targetDate: goalTargetDate || undefined,
      trackingType: goalTrackingType,
      targetDays: Math.max(1, computedTargetDays || 30),
      checkInDates: [],
      slipDates: [],
      milestones,
      currentValue: 0,
      targetValue: Math.max(1, goalTargetValue || 30),
      unitLabel: goalUnitLabel.trim() || 'lần',
      progress: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveGoals([newGoal, ...data.goals]);
    setGoalTitle('');
    setGoalWhy('');
    setGoalTargetDate('');
    setGoalFirstSteps('');
    setShowNewGoal(false);
  };

  // Điểm danh ngày giữ vững cho mục tiêu Chuỗi ngày
  const handleToggleGoalCleanDay = (goalId: string, dateStr = today) => {
    updateSingleGoal(goalId, (g) => {
      const checkIns = new Set(g.checkInDates || []);
      const slips = new Set(g.slipDates || []);
      slips.delete(dateStr);
      if (checkIns.has(dateStr)) {
        checkIns.delete(dateStr);
      } else {
        checkIns.add(dateStr);
      }
      return {
        ...g,
        checkInDates: Array.from(checkIns).sort(),
        slipDates: Array.from(slips).sort(),
      };
    });
  };

  // Ghi nhận lỡ vấp ngã hôm nay (không xoá tổng số ngày đã thắng trước đó!)
  const handleRecordGoalSlipDay = (goalId: string, dateStr = today) => {
    updateSingleGoal(goalId, (g) => {
      const checkIns = new Set(g.checkInDates || []);
      const slips = new Set(g.slipDates || []);
      checkIns.delete(dateStr);
      if (slips.has(dateStr)) {
        slips.delete(dateStr);
      } else {
        slips.add(dateStr);
      }
      return {
        ...g,
        checkInDates: Array.from(checkIns).sort(),
        slipDates: Array.from(slips).sort(),
      };
    });
  };

  const handleToggleMilestone = (goalId: string, milestoneId: string) => {
    updateSingleGoal(goalId, (g) => ({
      ...g,
      milestones: g.milestones.map((m) =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      ),
    }));
  };

  const handleDeleteMilestone = (goalId: string, milestoneId: string) => {
    updateSingleGoal(goalId, (g) => ({
      ...g,
      milestones: g.milestones.filter((m) => m.id !== milestoneId),
    }));
  };

  const handleAddMilestone = (goalId: string) => {
    const text = (milestoneDrafts[goalId] || '').trim();
    if (!text) return;

    updateSingleGoal(goalId, (g) => ({
      ...g,
      milestones: [
        ...g.milestones,
        { id: `ms-${Date.now()}`, title: text, completed: false },
      ],
    }));
    setMilestoneDrafts((prev) => ({ ...prev, [goalId]: '' }));
  };

  const handleAdjustNumericValue = (goalId: string, nextVal: number) => {
    updateSingleGoal(goalId, (g) => ({
      ...g,
      currentValue: Math.max(0, Math.round(nextVal * 100) / 100),
    }));
  };

  const handleDeleteGoal = (goalId: string) => {
    saveGoals(
      data.goals.filter((g) => g.id !== goalId),
      goalId
    );
  };

  const handleToggleGoalComplete = (goalId: string) => {
    saveGoals(
      data.goals.map((g) => {
        if (g.id !== goalId) return g;
        const nextCompleted = g.status !== 'completed';
        return {
          ...g,
          status: nextCompleted ? 'completed' : 'active',
          progress: nextCompleted ? 100 : recalculateGoal({ ...g, status: 'active' }).progress,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const handleAutoSplitMilestones = async (goal: Goal) => {
    if (!hasActiveApiKey) {
      setCoachError('Vui lòng gắn API Key miễn phí trong Cài đặt để AI tự động chia bước nhỏ.');
      return;
    }
    setCoachError(null);
    setSplittingGoalId(goal.id);
    try {
      const steps = await suggestGoalMilestonesWithAI(goal, data, aiConfig);
      if (steps.length > 0) {
        updateSingleGoal(goal.id, (g) => ({
          ...g,
          milestones: [
            ...g.milestones,
            ...steps.map((title, idx) => ({
              id: `ms-${Date.now()}-${idx}`,
              title,
              completed: false,
            })),
          ],
        }));
      }
    } catch (err) {
      setCoachError(err instanceof Error ? err.message : 'Không thể tạo bước nhỏ lúc này.');
    } finally {
      setSplittingGoalId(null);
    }
  };

  const handleCoachGoal = async (goal: Goal) => {
    if (!hasActiveApiKey) {
      setCoachError('Vui lòng gắn API Key miễn phí trong mục Cài đặt để nhận chiến lược từ AI.');
      return;
    }
    setCoachError(null);
    setCoachingGoalId(goal.id);
    // Đảm bảo mở rộng hoàn toàn khung chiến lược khi tạo mới
    setCollapsedAdviceIds((prev) => ({ ...prev, [goal.id]: false }));
    try {
      const advice = await coachGoalWithAI(goal, data, aiConfig);
      saveGoals(
        data.goals.map((g) =>
          g.id === goal.id
            ? { ...g, aiAdvice: advice, updatedAt: new Date().toISOString() }
            : g
        )
      );
    } catch (err) {
      setCoachError(err instanceof Error ? err.message : 'Không thể kết nối AI lúc này.');
    } finally {
      setCoachingGoalId(null);
    }
  };

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;
    const newHabit: Habit = {
      id: `habit-${Date.now()}`,
      title: habitTitle.trim(),
      icon: habitIcon,
      category: 'health',
      completedDates: [],
      createdAt: new Date().toISOString(),
    };
    saveHabits([...data.habits, newHabit]);
    setHabitTitle('');
    setShowNewHabit(false);
  };

  const handleDeleteHabit = (habitId: string) => {
    saveHabits(
      data.habits.filter((h) => h.id !== habitId),
      habitId
    );
  };

  const filteredGoals = data.goals.filter((g) =>
    filterStatus === 'all' ? true : g.status === filterStatus
  );

  return (
    <div className="space-y-8">
      {/* PHẦN 1: MỤC TIÊU CÁ NHÂN */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Mục Tiêu Cố Gắng</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Đo lường bằng ngày thắng lợi và hành động cụ thể — dễ dàng ghi nhận mỗi ngày
            </p>
          </div>

          <button
            onClick={() => setShowNewGoal((v) => !v)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition"
          >
            {showNewGoal ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showNewGoal ? 'Đóng biểu mẫu' : 'Đặt mục tiêu mới'}
          </button>
        </div>

        {/* Biểu mẫu tạo mục tiêu mới */}
        {showNewGoal && (
          <form
            onSubmit={handleCreateGoal}
            className="rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/70 p-5 sm:p-6 shadow-md space-y-4"
          >
            <h3 className="font-bold text-base flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" /> Thiết lập mục tiêu mới
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                  Tên mục tiêu cụ thể *
                </label>
                <input
                  required
                  type="text"
                  placeholder="VD: Cai đồ ngọt & thức ăn nhanh, Giữ kỷ luật 30 ngày, Đọc 12 cuốn sách..."
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                  Lĩnh vực
                </label>
                <select
                  value={goalCategory}
                  onChange={(e) => setGoalCategory(e.target.value as GoalCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chọn hình thức ghi nhận hàng ngày */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                Cách đánh giá & ghi nhận tiến độ mỗi ngày
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {TRACKING_MODES.map((m) => {
                  const selected = goalTrackingType === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setGoalTrackingType(m.id)}
                      className={`p-3.5 rounded-2xl border text-left transition ${
                        selected
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm">{m.title}</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        {m.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {goalTrackingType === 'streak_days' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  Cột mốc số ngày muốn chinh phục
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[7, 14, 21, 30, 60, 90, 180, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setGoalTargetDays(d)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        goalTargetDays === d
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {d} ngày
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={goalTargetDays}
                    onChange={(e) => setGoalTargetDays(Number(e.target.value))}
                    className="w-24 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
              </div>
            )}

            {goalTrackingType === 'numeric' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                    Con số đích cần đạt
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={goalTargetValue}
                    onChange={(e) => setGoalTargetValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                    Đơn vị đo (VD: km, cuốn, buổi, giờ)
                  </label>
                  <input
                    type="text"
                    placeholder="km / cuốn / buổi..."
                    value={goalUnitLabel}
                    onChange={(e) => setGoalUnitLabel(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                  Lý do cốt lõi (Vì sao mục tiêu này quan trọng với bạn?)
                </label>
                <input
                  type="text"
                  placeholder={`Khi bạn nản lòng, ${companionName} sẽ nhắc lại lý do này để tiếp thêm sức mạnh...`}
                  value={goalWhy}
                  onChange={(e) => setGoalWhy(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                  Ngày đích dự kiến (Tuỳ chọn)
                </label>
                <input
                  type="date"
                  value={goalTargetDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGoalTargetDate(val);
                    if (val && goalTrackingType === 'streak_days') {
                      const diff = Math.round(
                        (parseDateKey(val).getTime() - parseDateKey(today).getTime()) / 86400000
                      );
                      if (diff >= 1 && diff <= 3650) setGoalTargetDays(diff);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                Các bước hành động hỗ trợ (mỗi dòng 1 bước — hoặc để AI tự chia giúp sau khi tạo)
              </label>
              <textarea
                rows={2}
                placeholder={'Không mang điện thoại vào phòng ngủ sau 22:30\nKhi thấy căng thẳng -> Ra ngoài đi bộ 10 phút...'}
                value={goalFirstSteps}
                onChange={(e) => setGoalFirstSteps(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowNewGoal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-semibold"
              >
                Huỷ
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
              >
                Lưu mục tiêu
              </button>
            </div>
          </form>
        )}

        {/* Bộ lọc trạng thái */}
        <div className="flex items-center gap-2">
          {(
            [
              { id: 'active', label: 'Đang theo đuổi' },
              { id: 'completed', label: 'Đã hoàn thành' },
              { id: 'all', label: 'Tất cả' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                filterStatus === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {coachError && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm flex items-center justify-between gap-3">
            <span>{coachError}</span>
            {!hasActiveApiKey && (
              <button
                onClick={() => setActiveTab('settings')}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold"
              >
                Cài đặt AI
              </button>
            )}
          </div>
        )}

        {/* Danh sách các thẻ Mục tiêu */}
        {filteredGoals.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-10 text-center space-y-2">
            <Trophy className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Chưa có mục tiêu nào trong danh sách này.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhấn <strong>“+ Đặt mục tiêu mới”</strong> để {companionName} cùng bạn lập chiến lược và điểm danh chiến thắng mỗi ngày nhé!
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredGoals.map((goal) => {
              const cat = CATEGORY_LABELS[goal.category] || CATEGORY_LABELS.personal;
              const mode: GoalTrackingType = goal.trackingType || 'streak_days';
              const isCoaching = coachingGoalId === goal.id;
              const isAdviceCollapsed = Boolean(collapsedAdviceIds[goal.id]);

              const streakStats = calculateGoalStreakStats(
                goal.checkInDates,
                goal.slipDates,
                today
              );
              const targetDays = Math.max(1, goal.targetDays || 30);
              const checkedToday = (goal.checkInDates || []).includes(today);
              const slippedToday = (goal.slipDates || []).includes(today);
              const doneMilestonesCount = goal.milestones.filter((m) => m.completed).length;

              return (
                <div
                  key={goal.id}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5"
                >
                  {/* Hàng 1: Nhãn danh mục + Nút chức năng AI */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${cat.color}`}>
                          {cat.label}
                        </span>
                        {goal.targetDate && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Đích: {goal.targetDate}
                          </span>
                        )}
                        {/* Chuyển nhanh chế độ đo lường */}
                        <select
                          value={mode}
                          onChange={(e) =>
                            updateSingleGoal(goal.id, (g) => ({
                              ...g,
                              trackingType: e.target.value as GoalTrackingType,
                            }))
                          }
                          title="Đổi cách đo lường tiến độ cho mục tiêu này"
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          {TRACKING_MODES.map((tm) => (
                            <option key={tm.id} value={tm.id}>
                              Đo theo: {tm.shortLabel}
                            </option>
                          ))}
                        </select>
                      </div>

                      <h3
                        className={`text-lg sm:text-xl font-extrabold ${
                          goal.status === 'completed' ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {goal.title}
                      </h3>
                      {goal.whyItMatters && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 italic">
                          “{goal.whyItMatters}”
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => void handleAutoSplitMilestones(goal)}
                        disabled={splittingGoalId === goal.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 text-xs font-bold transition"
                        title="AI tự động thêm 4 bước hành động nhỏ thực tế vào mục tiêu này"
                      >
                        {splittingGoalId === goal.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ListChecks className="w-3.5 h-3.5" />
                        )}
                        AI chia bước nhỏ
                      </button>

                      <button
                        onClick={() => void handleCoachGoal(goal)}
                        disabled={isCoaching}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold transition"
                      >
                        {isCoaching ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        {goal.aiAdvice ? `Làm mới chiến lược` : `Chiến lược từ ${companionName}`}
                      </button>

                      <button
                        onClick={() => handleToggleGoalComplete(goal.id)}
                        title={
                          goal.status === 'completed'
                            ? 'Đánh dấu đang thực hiện'
                            : 'Đánh dấu đã hoàn thành'
                        }
                        className={`p-2 rounded-xl transition ${
                          goal.status === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        title="Xoá mục tiêu"
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* KHỐI ĐÁNH GIÁ & GHI NHẬN HẰNG NGÀY (THAY CHO THANH KÉO % MÙ MỜ) */}
                  {mode === 'streak_days' && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-4">
                      {/* 3 Chỉ số rõ ràng */}
                      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-orange-500" /> Chuỗi hiện tại
                          </div>
                          <div className="text-lg sm:text-2xl font-extrabold text-orange-600 dark:text-orange-400 mt-0.5">
                            {streakStats.currentStreak}{' '}
                            <span className="text-xs font-semibold">ngày</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                          <div className="text-[11px] text-slate-500 flex items-center justify-between gap-1">
                            <span className="flex items-center gap-1">
                              <Trophy className="w-3.5 h-3.5 text-emerald-500" /> Tổng ngày thắng
                            </span>
                          </div>
                          <div className="text-lg sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-baseline gap-1">
                            <span>{streakStats.totalCleanDays}</span>
                            <span className="text-xs text-slate-400 font-semibold">/</span>
                            <input
                              type="number"
                              min={1}
                              max={3650}
                              title="Chỉnh tổng số ngày mục tiêu"
                              value={targetDays}
                              onChange={(e) =>
                                updateSingleGoal(goal.id, (g) => ({
                                  ...g,
                                  targetDays: Math.max(1, Number(e.target.value) || 30),
                                }))
                              }
                              className="w-12 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 focus:outline-none"
                            />
                            <span className="text-[11px] text-slate-400 font-medium">ngày</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-amber-500" /> Kỷ lục tốt nhất
                          </div>
                          <div className="text-lg sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                            {streakStats.bestStreak}{' '}
                            <span className="text-xs font-semibold">ngày</span>
                          </div>
                        </div>
                      </div>

                      {/* Thanh hành trình số ngày tự động */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-600 dark:text-slate-300">
                            Hành trình tích luỹ: {streakStats.totalCleanDays} / {targetDays} ngày giữ vững
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Còn {Math.max(0, targetDays - streakStats.totalCleanDays)} ngày tới đích
                          </span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Dải lịch 14 ngày gần nhất (Chạm để điểm danh bù ngày hôm qua nếu quên) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Nhật ký 14 ngày gần đây (Chạm vào ô ngày để điểm danh / sửa):</span>
                          <span className="hidden sm:inline">Xanh = Giữ vững • Cam = Vấp ngã</span>
                        </div>
                        <div className="grid grid-cols-7 sm:[grid-template-columns:repeat(14,minmax(0,1fr))] gap-1.5">
                          {last14Days.map((d) => {
                            const isClean = (goal.checkInDates || []).includes(d);
                            const isSlip = (goal.slipDates || []).includes(d);
                            const isToday = d === today;
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => handleToggleGoalCleanDay(goal.id, d)}
                                title={`${d}: ${
                                  isClean ? 'Đã giữ vững' : isSlip ? 'Lỡ vấp ngã' : 'Chưa ghi nhận'
                                }`}
                                className={`py-1.5 rounded-xl border text-center transition ${
                                  isClean
                                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm'
                                    : isSlip
                                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400 font-bold'
                                    : isToday
                                    ? 'bg-white dark:bg-slate-900 border-emerald-400 text-slate-700 dark:text-slate-200 font-semibold'
                                    : 'bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-400'
                                }`}
                              >
                                <div className="text-[10px] leading-tight">
                                  {isToday ? 'Nay' : d.slice(-2)}
                                </div>
                                <div className="text-[11px] mt-0.5">
                                  {isClean ? '✓' : isSlip ? '↺' : '•'}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Bộ nút Điểm danh Hôm nay */}
                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleToggleGoalCleanDay(goal.id, today)}
                          className={`flex-1 min-w-[210px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm transition active:scale-[0.99] ${
                            checkedToday
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                              : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-95'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          {checkedToday
                            ? 'Đã giữ vững hôm nay — Tiếp tục phát huy!'
                            : 'Điểm danh hôm nay: Mình đã giữ vững (+1 ngày)'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRecordGoalSlipDay(goal.id, today)}
                          className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-2xl text-xs font-semibold border transition ${
                            slippedToday
                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-400'
                              : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-amber-600 border-slate-200 dark:border-slate-700'
                          }`}
                          title="Ghi nhận trung thực để đặt lại chuỗi hiện tại nhưng vẫn bảo toàn Tổng ngày thắng trước đó"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {slippedToday ? 'Đã ghi nhận vấp ngã hôm nay' : 'Lỡ vấp ngã hôm nay'}
                        </button>

                        {slippedToday && (
                          <button
                            type="button"
                            onClick={() =>
                              triggerChatWithPrompt(
                                `Hôm nay mình vừa lỡ vấp ngã ở mục tiêu "${goal.title}". Đừng phán xét mình, hãy giúp mình ngắt ngay hiệu ứng trượt dài tâm lý (chaser effect), tìm nguyên nhân kích hoạt hôm nay và đứng dậy làm lại ngay từ bây giờ nhé!`
                              )
                            }
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800"
                          >
                            <MessageCircleHeart className="w-4 h-4" />
                            Nhờ {companionName} ngắt đà trượt ngay
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {mode === 'numeric' && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="text-xs text-slate-500 block">Kết quả tích luỹ thực tế</span>
                          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            {goal.currentValue || 0} / {goal.targetValue || 100}{' '}
                            <span className="text-sm font-semibold">{goal.unitLabel || 'đơn vị'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleAdjustNumericValue(goal.id, (goal.currentValue || 0) - 1)
                            }
                            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAdjustNumericValue(goal.id, (goal.currentValue || 0) + 1)
                            }
                            className="px-4 h-10 rounded-xl bg-emerald-600 text-white font-bold text-sm"
                          >
                            +1 {goal.unitLabel || ''}
                          </button>
                          <input
                            type="number"
                            value={goal.currentValue ?? 0}
                            onChange={(e) =>
                              handleAdjustNumericValue(goal.id, Number(e.target.value))
                            }
                            className="w-20 h-10 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-center"
                          />
                        </div>
                      </div>

                      <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {mode === 'milestones' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600 dark:text-slate-300">
                          Hoàn thành: {doneMilestonesCount} / {goal.milestones.length} bước cột mốc
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {goal.progress}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Danh sách Các bước hành động nhỏ đi kèm (Hỗ trợ ở cả 3 chế độ) */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>
                        Các bước hành động & quy tắc bảo vệ ({doneMilestonesCount}/
                        {goal.milestones.length})
                      </span>
                    </div>

                    {goal.milestones.map((ms) => (
                      <div
                        key={ms.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleMilestone(goal.id, ms.id)}
                          className="flex-1 flex items-center gap-3 text-left min-w-0"
                        >
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                              ms.completed
                                ? 'bg-emerald-600 text-white'
                                : 'border-2 border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {ms.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span
                            className={`text-sm ${
                              ms.completed
                                ? 'line-through text-slate-400'
                                : 'text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {ms.title}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMilestone(goal.id, ms.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 shrink-0"
                          title="Xoá bước này"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Thêm một quy tắc / bước hành động cụ thể..."
                        value={milestoneDrafts[goal.id] || ''}
                        onChange={(e) =>
                          setMilestoneDrafts((prev) => ({ ...prev, [goal.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMilestone(goal.id);
                          }
                        }}
                        className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddMilestone(goal.id)}
                        className="px-3.5 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-xs font-semibold transition shrink-0"
                      >
                        + Thêm bước
                      </button>
                    </div>
                  </div>

                  {/* KHUNG CHIẾN LƯỢC ĐỒNG HÀNH TỪ AI (HIỂN THỊ TRỌN VẸN KHÔNG CẮT CHỮ) */}
                  {goal.aiAdvice && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-200/60 dark:border-emerald-800/50">
                        <div className="text-xs sm:text-sm font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          Chiến lược đồng hành từ {companionName}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleCoachGoal(goal)}
                            disabled={isCoaching}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/70 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-white transition"
                            title="Tạo lại bản chiến lược đầy đủ mới nhất"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${isCoaching ? 'animate-spin' : ''}`}
                            />
                            Tạo lại đầy đủ
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard?.writeText(goal.aiAdvice || '');
                              setCopiedGoalId(goal.id);
                              window.setTimeout(() => setCopiedGoalId(null), 2000);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 text-[11px] font-semibold"
                          >
                            {copiedGoalId === goal.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" /> Đã chép
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Sao chép
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedAdviceIds((prev) => ({
                                ...prev,
                                [goal.id]: !prev[goal.id],
                              }))
                            }
                            className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 text-[11px] font-semibold"
                          >
                            {isAdviceCollapsed ? (
                              <>
                                Mở rộng <ChevronDown className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <>
                                Thu gọn <ChevronUp className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {!isAdviceCollapsed && (
                        <MarkdownText
                          content={goal.aiAdvice}
                          className="text-slate-700 dark:text-slate-200"
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* PHẦN 2: THÓI QUEN HÀNG NGÀY & LỊCH SỬ 7 NGÀY */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Chuỗi Thói Quen Hàng Ngày
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Kỷ luật nhẹ nhàng mỗi ngày tạo nên sự thay đổi lớn về tâm sinh lý
            </p>
          </div>

          <button
            onClick={() => setShowNewHabit((v) => !v)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm transition"
          >
            {showNewHabit ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showNewHabit ? 'Đóng' : 'Thêm thói quen'}
          </button>
        </div>

        {showNewHabit && (
          <form
            onSubmit={handleCreateHabit}
            className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
          >
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                Chọn biểu tượng
              </label>
              <div className="flex flex-wrap gap-2">
                {HABIT_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setHabitIcon(ic)}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition ${
                      habitIcon === ic
                        ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 scale-105'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                required
                type="text"
                placeholder="VD: Thiền hít thở 10 phút, Không xem điện thoại sau 22:30..."
                value={habitTitle}
                onChange={(e) => setHabitTitle(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm"
              >
                Tạo thói quen
              </button>
            </div>
          </form>
        )}

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm overflow-x-auto">
          {data.habits.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              Chưa có thói quen nào. Hãy tạo một thói quen nhỏ dễ làm nhất nhé!
            </p>
          ) : (
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left pb-3 font-semibold">Thói quen</th>
                  {last7Days.map((d) => (
                    <th key={d} className="text-center pb-3 font-semibold w-12">
                      {d === today ? 'Nay' : formatShortDate(d)}
                    </th>
                  ))}
                  <th className="text-right pb-3 font-semibold w-24">Chuỗi</th>
                  <th className="w-10 pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {data.habits.map((habit) => {
                  const streak = calculateHabitStreak(habit.completedDates, today);
                  return (
                    <tr key={habit.id}>
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{habit.icon}</span>
                          <span className="text-sm font-semibold">{habit.title}</span>
                        </div>
                      </td>
                      {last7Days.map((d) => {
                        const checked = habit.completedDates.includes(d);
                        return (
                          <td key={d} className="py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleHabitDate(habit.id, d)}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition ${
                                checked
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-transparent hover:border hover:border-emerald-400'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>
                          </td>
                        );
                      })}
                      <td className="py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400">
                          <Flame className="w-3.5 h-3.5" /> {streak}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteHabit(habit.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                          title="Xoá thói quen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};
