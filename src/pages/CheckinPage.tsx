import {
  Activity,
  Brain,
  Calendar,
  CheckCircle2,
  Droplets,
  Dumbbell,
  HeartHandshake,
  Loader2,
  Moon,
  Save,
  Sparkles,
  Star,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { MarkdownText } from '../components/MarkdownText';
import { useApp } from '../context/AppContext';
import { analyzeDailyCheckin } from '../services/aiService';
import {
  BEDTIME_LABELS,
  computeLifeBalanceScore,
  getReadinessInfo,
} from '../services/analyticsEngine';
import { BedtimeSlot, DailyLog } from '../types';
import {
  formatDisplayDate,
  formatShortDate,
  getPastDateKeys,
  getTodayStr,
} from '../utils/dateUtils';

const EMOTION_OPTIONS = [
  'Bình yên',
  'Vui vẻ',
  'Hứng khởi',
  'Tập trung',
  'Biết ơn',
  'Tự tin',
  'Thư thái',
  'Cố gắng',
  'Mệt mỏi',
  'Áp lực',
  'Lo âu',
  'Xao nhãng',
  'Chênh vênh',
  'Buồn',
];

const TRIGGER_OPTIONS = [
  'Công việc / Học tập',
  'Vận động tốt',
  'Ngủ đúng giờ',
  'Màn hình khuya',
  'Mối quan hệ',
  'Gia đình',
  'Tài chính',
  'Cà phê / Ăn muộn',
  'Thời tiết',
];

function getMoodDescription(mood: number): { emoji: string; label: string } {
  if (mood <= 2) return { emoji: '🌧️', label: 'Rất nặng nề, cần được vỗ về' };
  if (mood <= 4) return { emoji: '🌥️', label: 'Trùng xuống, hơi mệt mỏi' };
  if (mood <= 6) return { emoji: '⛅', label: 'Bình thường, ổn định' };
  if (mood <= 8) return { emoji: '🌤️', label: 'Tích cực, dễ chịu' };
  return { emoji: '☀️', label: 'Tràn đầy năng lượng & hứng khởi' };
}

function createEmptyLogForDate(date: string, defaultWeight?: number): DailyLog {
  return {
    date,
    mood: 7,
    stress: 4,
    emotions: [],
    triggers: [],
    focusHours: 4,
    sleepHours: 7.5,
    sleepQuality: 4,
    bedtimeSlot: '2230_2330',
    energy: 7,
    waterGlasses: 6,
    exerciseMinutes: 20,
    exerciseType: '',
    weightKg: defaultWeight,
    physicalNotes: '',
    journal: '',
    gratitude: '',
    aiReflection: undefined,
    updatedAt: new Date().toISOString(),
  };
}

export const CheckinPage: React.FC = () => {
  const { data, aiConfig, hasActiveApiKey, upsertDailyLog, setActiveTab } = useApp();
  const today = getTodayStr();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [form, setForm] = useState<DailyLog>(() => {
    return data.dailyLogs[today] || createEmptyLogForDate(today, data.profile.weightKg);
  });
  const [isDirty, setIsDirty] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Chuyển ngày: nạp dữ liệu của ngày được chọn
  useEffect(() => {
    const existing = data.dailyLogs[selectedDate];
    setForm(
      existing
        ? { ...existing }
        : createEmptyLogForDate(selectedDate, data.profile.weightKg)
    );
    setIsDirty(false);
    setSavedNotice(false);
    setAiError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Tự động lưu tức thì sau 350ms mỗi khi người dùng thay đổi bất kỳ chỉ số hay dòng nhật ký nào
  useEffect(() => {
    if (!isDirty) return;
    const timer = window.setTimeout(() => {
      upsertDailyLog(form);
      setIsDirty(false);
      setSavedNotice(true);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [form, isDirty, upsertDailyLog]);

  const updateForm = (patchOrUpdater: Partial<DailyLog> | ((prev: DailyLog) => DailyLog)) => {
    setIsDirty(true);
    setForm((prev) =>
      typeof patchOrUpdater === 'function'
        ? patchOrUpdater(prev)
        : { ...prev, ...patchOrUpdater }
    );
  };

  const recent7Dates = getPastDateKeys(7, today);
  const moodInfo = getMoodDescription(form.mood);
  const companionName = data.profile.companionName || 'Tâm An';

  const toggleEmotion = (emotion: string) => {
    updateForm((prev) => ({
      ...prev,
      emotions: prev.emotions.includes(emotion)
        ? prev.emotions.filter((e) => e !== emotion)
        : [...prev.emotions, emotion],
    }));
  };

  const toggleTrigger = (trigger: string) => {
    updateForm((prev) => {
      const current = prev.triggers || [];
      return {
        ...prev,
        triggers: current.includes(trigger)
          ? current.filter((t) => t !== trigger)
          : [...current, trigger],
      };
    });
  };

  const habitRatioForSelected =
    data.habits.length > 0
      ? data.habits.filter((h) => h.completedDates.includes(selectedDate)).length /
        data.habits.length
      : 0.5;
  const readiness = getReadinessInfo(computeLifeBalanceScore(form, habitRatioForSelected));

  const handleSaveOnly = () => {
    upsertDailyLog(form);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleSaveAndAnalyze = async () => {
    upsertDailyLog(form);
    if (!hasActiveApiKey) {
      setAiError(
        'Nhật ký đã được lưu! Để nhận phân tích từ AI, bạn hãy gắn API Key miễn phí trong phần Cài đặt nhé.'
      );
      return;
    }

    setAiError(null);
    setAnalyzing(true);
    try {
      const nextData = {
        ...data,
        dailyLogs: {
          ...data.dailyLogs,
          [form.date]: form,
        },
      };
      const reflection = await analyzeDailyCheckin(form, nextData, aiConfig);
      const withReflection: DailyLog = {
        ...form,
        aiReflection: reflection,
      };
      setForm(withReflection);
      upsertDailyLog(withReflection);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Không thể phân tích lúc này.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Thanh chọn ngày nhanh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Nhật Ký Tâm - Sinh - Lý</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
            {formatDisplayDate(selectedDate)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
            Điểm Cân Bằng: {readiness.score}/100 • {readiness.label}
          </span>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <input
              type="date"
              max={today}
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Dải 7 ngày gần nhất */}
      <div className="grid grid-cols-7 gap-2">
        {recent7Dates.map((d) => {
          const hasLog = Boolean(data.dailyLogs[d]);
          const isSelected = d === selectedDate;
          return (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`py-2.5 px-1 rounded-2xl border text-center transition ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : hasLog
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70 text-slate-800 dark:text-slate-200'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-500'
              }`}
            >
              <div className="text-[11px] opacity-80">{d === today ? 'Hôm nay' : formatShortDate(d)}</div>
              <div className="mt-1 flex justify-center">
                {hasLog ? (
                  <span className="text-xs font-bold">
                    {data.dailyLogs[d].mood}/10
                  </span>
                ) : (
                  <span className="text-xs opacity-40">•</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* KHỐI 1: TÂM LÝ & CẢM XÚC */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg">1. Trạng thái Tâm lý & Tinh thần</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gọi tên đúng cảm xúc là bước đầu tiên để làm dịu tâm trí
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Thanh kéo Tâm trạng */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Tâm trạng tổng thể</label>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {moodInfo.emoji} {form.mood}/10
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={form.mood}
              onChange={(e) => updateForm({ mood: Number(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">{moodInfo.label}</p>
          </div>

          {/* Thanh kéo Mức độ căng thẳng */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Mức độ căng thẳng (Stress)</label>
              <span
                className={`text-sm font-bold ${
                  form.stress >= 7
                    ? 'text-rose-600 dark:text-rose-400'
                    : form.stress >= 5
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {form.stress}/10
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={form.stress}
              onChange={(e) => updateForm({ stress: Number(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {form.stress >= 7
                ? 'Áp lực cao — hôm nay hãy ưu tiên nghỉ ngơi & giảm tải nhé'
                : form.stress >= 5
                ? 'Áp lực vừa phải trong tầm kiểm soát'
                : 'Tâm trí thư thả, nhẹ nhàng'}
            </p>
          </div>
        </div>

        {/* Thẻ cảm xúc trong ngày */}
        <div className="space-y-2.5">
          <label className="text-sm font-semibold block">
            Những sắc thái cảm xúc xuất hiện trong ngày
          </label>
          <div className="flex flex-wrap gap-2">
            {EMOTION_OPTIONS.map((emo) => {
              const selected = form.emotions.includes(emo);
              return (
                <button
                  key={emo}
                  type="button"
                  onClick={() => toggleEmotion(emo)}
                  className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition ${
                    selected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                  }`}
                >
                  {emo}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tác nhân chính ảnh hưởng (1 chạm giúp thống kê nguyên nhân gốc rễ) */}
        <div className="space-y-2 pt-1">
          <label className="text-sm font-semibold block">
            Yếu tố tác động lớn nhất tới bạn hôm nay (Chọn nhanh 1 chạm)
          </label>
          <div className="flex flex-wrap gap-2">
            {TRIGGER_OPTIONS.map((trig) => {
              const selected = (form.triggers || []).includes(trig);
              return (
                <button
                  key={trig}
                  type="button"
                  onClick={() => toggleTrigger(trig)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    selected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white'
                      : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  {trig}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* KHỐI 2: SINH LÝ & THỂ CHẤT */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg">2. Nhịp Sinh lý & Sức khoẻ cơ thể</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nền tảng thể chất quyết định trực tiếp sức bền tinh thần của bạn
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Giấc ngủ */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-indigo-500" /> Số giờ ngủ
              </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {form.sleepHours} giờ
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={12}
              step={0.5}
              value={form.sleepHours}
              onChange={(e) => updateForm({ sleepHours: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">Chất lượng ngủ:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => updateForm({ sleepQuality: star })}
                    className="p-0.5"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        star <= form.sleepQuality
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-1">
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(BEDTIME_LABELS) as BedtimeSlot[]).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => updateForm({ bedtimeSlot: slot })}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition truncate ${
                      form.bedtimeSlot === slot
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {BEDTIME_LABELS[slot]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Năng lượng & Tập trung */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Năng lượng cơ thể</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {form.energy}/10
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={form.energy}
              onChange={(e) => updateForm({ energy: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">Giờ tập trung sâu:</span>
              <input
                type="number"
                min={0}
                max={16}
                step={0.5}
                value={form.focusHours ?? 0}
                onChange={(e) => updateForm({ focusHours: Number(e.target.value) })}
                className="w-20 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-right"
              />
            </div>
          </div>

          {/* Nước uống */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 flex flex-col justify-between space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-sky-500" /> Nước đã uống
              </span>
              <span className="font-bold text-sky-600 dark:text-sky-400">
                {form.waterGlasses} cốc
              </span>
            </div>
            <div className="flex items-center justify-center gap-4 py-1">
              <button
                type="button"
                onClick={() =>
                  updateForm({ waterGlasses: Math.max(0, form.waterGlasses - 1) })
                }
                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-lg hover:bg-slate-100"
              >
                -
              </button>
              <span className="text-xl font-extrabold">{form.waterGlasses}</span>
              <button
                type="button"
                onClick={() => updateForm({ waterGlasses: form.waterGlasses + 1 })}
                className="w-9 h-9 rounded-xl bg-sky-600 text-white font-bold text-lg hover:bg-sky-700"
              >
                +
              </button>
            </div>
            <p className="text-[11px] text-center text-slate-500">
              Khuyến nghị theo cân nặng: ~{ data.profile.weightKg ? Math.max(5, Math.round((data.profile.weightKg * 35) / 250)) : 8 } cốc/ngày
            </p>
          </div>
        </div>

        {/* Vận động, cân nặng & Ghi chú cơ thể */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-emerald-500" /> Vận động (phút)
            </label>
            <input
              type="number"
              min={0}
              max={300}
              value={form.exerciseMinutes}
              onChange={(e) => updateForm({ exerciseMinutes: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">
              Bộ môn / Hình thức vận động
            </label>
            <input
              type="text"
              placeholder="VD: Chạy bộ, Đi bộ, Yoga, Gym..."
              value={form.exerciseType || ''}
              onChange={(e) => updateForm({ exerciseType: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">
              Cân nặng (kg - tuỳ chọn)
            </label>
            <input
              type="number"
              step={0.1}
              placeholder="VD: 62.5"
              value={form.weightKg ?? ''}
              onChange={(e) =>
                updateForm({
                  weightKg: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">
            Lắng nghe tín hiệu cơ thể (triệu chứng, ăn uống, đau mỏi nếu có)
          </label>
          <input
            type="text"
            placeholder="VD: Hơi mỏi cổ vai gáy buổi chiều, ăn trưa ngon miệng, uống ít cà phê hơn..."
            value={form.physicalNotes || ''}
            onChange={(e) => updateForm({ physicalNotes: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm"
          />
        </div>
      </section>

      {/* KHỐI 3: NHẬT KÝ SUY NGẪM & PHẢN HỒI AI */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg">3. Nhật ký Suy ngẫm & Biết ơn</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Viết ra giúp giải phóng tâm trí — {companionName} luôn sẵn sàng lắng nghe bạn
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">
            Một điều nhỏ khiến bạn biết ơn hoặc mỉm cười hôm nay
          </label>
          <input
            type="text"
            placeholder="VD: Hoàn thành xong việc khó, một tách trà ấm buổi sáng..."
            value={form.gratitude || ''}
            onChange={(e) => updateForm({ gratitude: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">
            Nhật ký trải lòng tự do (chuyện xảy ra, suy nghĩ, trăn trở hoặc bài học hôm nay)
          </label>
          <textarea
            rows={4}
            placeholder="Hôm nay của bạn diễn ra như thế nào? Có điều gì đang làm bạn bận tâm hay tự hào không..."
            value={form.journal}
            onChange={(e) => updateForm({ journal: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Nút thao tác Lưu & Phân tích AI */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSaveOnly}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm hover:opacity-90 transition"
          >
            <Save className="w-4 h-4" />
            Lưu nhật ký ngày {formatShortDate(selectedDate)}
          </button>

          <button
            type="button"
            onClick={handleSaveAndAnalyze}
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition disabled:opacity-60"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Lưu & Nhờ {companionName} phân tích ngày hôm nay
          </button>

          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Đã lưu thành công!
            </span>
          )}
        </div>

        {aiError && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm flex flex-wrap items-center justify-between gap-3">
            <span>{aiError}</span>
            {!hasActiveApiKey && (
              <button
                onClick={() => setActiveTab('settings')}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold"
              >
                Mở Cài đặt AI
              </button>
            )}
          </div>
        )}

        {/* Phản hồi từ AI được lưu kèm ngày nhật ký */}
        {form.aiReflection && (
          <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-emerald-50/90 to-teal-50/70 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              Lời hồi đáp & góc nhìn từ {companionName}
            </div>
            <MarkdownText
              content={form.aiReflection}
              className="text-slate-700 dark:text-slate-200"
            />
          </div>
        )}
      </section>
    </div>
  );
};
