import { BedtimeSlot, DailyLog, Habit, TimeHorizon } from '../types';
import { formatDateKey, formatShortDate, getPastDateKeys, getTodayStr, parseDateKey } from '../utils/dateUtils';

export const BEDTIME_LABELS: Record<BedtimeSlot, string> = {
  before_2230: 'Trước 22:30',
  '2230_2330': '22:30 – 23:30',
  '2330_0030': '23:30 – 00:30',
  after_0030: 'Sau 00:30 (Thức khuya)',
};

export interface ReadinessInfo {
  score: number; // 0 - 100
  label: string;
  tone: 'emerald' | 'teal' | 'amber';
  advice: string;
}

/**
 * Tính Điểm Cân Bằng Tâm - Sinh - Lý (0 - 100) từ dữ liệu ngày mà không bắt người dùng nhập thêm phức tạp
 */
export function computeLifeBalanceScore(
  log: DailyLog,
  habitCompletionRatio = 0.5
): number {
  // 1. Phục hồi sinh học (40đ)
  const sleepDurationScore =
    log.sleepHours >= 7 && log.sleepHours <= 9
      ? 16
      : Math.max(3, 16 - Math.abs(7.5 - log.sleepHours) * 4.2);
  const sleepQualScore = (log.sleepQuality / 5) * 6;
  const circadianBonus =
    log.bedtimeSlot === 'before_2230'
      ? 4
      : log.bedtimeSlot === '2230_2330'
      ? 3
      : log.bedtimeSlot === 'after_0030'
      ? 0
      : 2;
  const energyScore = (log.energy / 10) * 10;
  const activityHydrationScore =
    Math.min(2.5, (log.exerciseMinutes / 30) * 2.5) +
    Math.min(1.5, (log.waterGlasses / 8) * 1.5);

  const bioTotal =
    sleepDurationScore + sleepQualScore + circadianBonus + energyScore + activityHydrationScore; // max ~40

  // 2. Vững vàng tâm lý (35đ)
  const moodScore = (log.mood / 10) * 20;
  const calmScore = ((11 - log.stress) / 10) * 15;
  const mindTotal = moodScore + calmScore; // max 35

  // 3. Nhịp độ kỷ luật & tập trung (25đ)
  const habitScore = Math.max(0, Math.min(1, habitCompletionRatio)) * 15;
  const focusScore = Math.min(10, ((log.focusHours ?? 2) / 4) * 10);
  const growthTotal = habitScore + focusScore; // max 25

  return Math.max(10, Math.min(100, Math.round(bioTotal + mindTotal + growthTotal)));
}

export function getReadinessInfo(score: number): ReadinessInfo {
  if (score >= 78) {
    return {
      score,
      label: 'Sẵn sàng bứt phá',
      tone: 'emerald',
      advice:
        'Thể trạng và tâm trí đang ở vùng sung sức — rất thích hợp để giải quyết cột mốc quan trọng nhất của mục tiêu!',
    };
  }
  if (score >= 60) {
    return {
      score,
      label: 'Cân bằng ổn định',
      tone: 'teal',
      advice:
        'Nhịp tâm sinh lý ổn định — hãy giữ nhịp độ vừa sức, duy trì đều các thói quen cốt lõi.',
    };
  }
  return {
    score,
    label: 'Cần ưu tiên phục hồi',
    tone: 'amber',
    advice:
      'Cơ thể hoặc tâm trí đang có dấu hiệu quá tải — hôm nay nên giảm bớt áp lực, ngủ sớm và chỉ làm 1 bước nhỏ 10–15 phút.',
  };
}

export interface BucketPoint {
  label: string;
  tooltipTitle: string;
  diemCanBang: number | null;
  tamTrang: number | null;
  nangLuong: number | null;
  cangThang: number | null;
  giacNgu: number | null;
  vanDong: number | null;
  count: number;
}

export interface MonthlyRollup {
  monthKey: string; // YYYY-MM
  monthLabel: string; // Tháng 11/2026
  shortLabel: string; // T11/26
  daysLogged: number;
  avgBalance: number;
  avgMood: number;
  avgEnergy: number;
  avgSleep: number;
  avgStress: number;
  avgFocus: number;
  totalExerciseMinutes: number;
  topEmotions: string[];
}

export interface CorrelationInsight {
  id: string;
  pairLabel: string;
  r: number; // -1 .. +1
  strengthLabel: string;
  summary: string;
}

export interface TriggerImpact {
  trigger: string;
  occurrences: number;
  avgMoodWithTrigger: number;
  moodDelta: number; // Chênh lệch so với trung bình chung toàn kỳ
}

export interface HorizonAnalyticsResult {
  granularityLabel: string;
  logsCount: number;
  avgBalance: number;
  avgMood: number;
  avgEnergy: number;
  avgSleep: number;
  avgStress: number;
  totalExerciseHours: number;
  lateNightCount: number;
  deltas: {
    balance: number | null;
    mood: number | null;
    energy: number | null;
    sleep: number | null;
    stress: number | null;
  };
  chartSeries: BucketPoint[];
  correlations: CorrelationInsight[];
  triggerImpacts: TriggerImpact[];
  topEmotions: [string, number][];
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return round1(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function getHabitRatioForDate(habits: Habit[], dateStr: string): number {
  if (!habits || habits.length === 0) return 0.5;
  const done = habits.filter((h) => h.completedDates.includes(dateStr)).length;
  return done / habits.length;
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 5 || ys.length !== n) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return Math.max(-1, Math.min(1, Math.round((num / den) * 100) / 100));
}

export function computeCorrelations(logs: DailyLog[]): CorrelationInsight[] {
  if (logs.length < 5) return [];

  const pairs: {
    id: string;
    pairLabel: string;
    x: (l: DailyLog) => number;
    y: (l: DailyLog) => number;
    describe: (r: number) => string;
  }[] = [
    {
      id: 'sleep-mood',
      pairLabel: 'Giấc ngủ ↔ Tâm trạng',
      x: (l) => l.sleepHours,
      y: (l) => l.mood,
      describe: (r) =>
        r > 0
          ? 'Ngủ đủ giấc có tác động nâng đỡ rõ rệt tới tâm trạng tích cực của bạn.'
          : 'Tâm trạng của bạn biến thiên khá độc lập với thời lượng ngủ.',
    },
    {
      id: 'sleep-energy',
      pairLabel: 'Giấc ngủ ↔ Năng lượng',
      x: (l) => l.sleepHours,
      y: (l) => l.energy,
      describe: (r) =>
        r > 0
          ? 'Số giờ ngủ quyết định trực tiếp độ bền năng lượng cơ thể ngày hôm sau.'
          : 'Mức năng lượng chịu ảnh hưởng thêm từ nhiều yếu tố ngoài giờ ngủ.',
    },
    {
      id: 'exercise-stress',
      pairLabel: 'Vận động ↔ Giảm căng thẳng',
      x: (l) => l.exerciseMinutes,
      y: (l) => 11 - l.stress,
      describe: (r) =>
        r > 0
          ? 'Những ngày duy trì vận động giúp bạn giải toả căng thẳng hiệu quả hơn hẳn.'
          : 'Cần kết hợp thêm nghỉ ngơi tinh thần bên cạnh vận động thể chất.',
    },
    {
      id: 'exercise-energy',
      pairLabel: 'Vận động ↔ Năng lượng',
      x: (l) => l.exerciseMinutes,
      y: (l) => l.energy,
      describe: (r) =>
        r > 0
          ? 'Tập luyện vừa sức đang tạo hiệu ứng nạp thêm sinh lực thay vì gây mệt.'
          : 'Lưu ý cường độ tập vừa phải để tránh làm cơ thể quá tải.',
    },
    {
      id: 'focus-mood',
      pairLabel: 'Tập trung sâu ↔ Tâm trạng',
      x: (l) => l.focusHours ?? 0,
      y: (l) => l.mood,
      describe: (r) =>
        r > 0
          ? 'Làm việc tập trung sâu mang lại cảm giác thành tựu và tinh thần vui vẻ.'
          : 'Nên xen kẽ nghỉ ngắn khi tập trung cao độ để giữ tâm lý thoải mái.',
    },
  ];

  const insights: CorrelationInsight[] = [];
  for (const p of pairs) {
    const xs = logs.map(p.x);
    const ys = logs.map(p.y);
    const r = pearsonCorrelation(xs, ys);
    const absR = Math.abs(r);
    if (absR < 0.15) continue;

    const strengthLabel =
      absR >= 0.6 ? 'Mối liên hệ rất mạnh' : absR >= 0.35 ? 'Mối liên hệ rõ rệt' : 'Mối liên hệ nhẹ';

    insights.push({
      id: p.id,
      pairLabel: p.pairLabel,
      r,
      strengthLabel,
      summary: p.describe(r),
    });
  }

  return insights.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

export function computeTriggerImpacts(logs: DailyLog[]): TriggerImpact[] {
  if (logs.length < 3) return [];
  const overallMood = average(logs.map((l) => l.mood));
  const map = new Map<string, number[]>();

  logs.forEach((l) => {
    const tags = new Set<string>(l.triggers || []);
    if (l.bedtimeSlot === 'after_0030') tags.add('Thức khuya sau 00:30');
    if (l.bedtimeSlot === 'before_2230') tags.add('Ngủ sớm trước 22:30');
    tags.forEach((t) => {
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(l.mood);
    });
  });

  const list: TriggerImpact[] = [];
  map.forEach((moods, trigger) => {
    if (moods.length < 2) return;
    const avgM = average(moods);
    const delta = round1(avgM - overallMood);
    if (Math.abs(delta) >= 0.2) {
      list.push({
        trigger,
        occurrences: moods.length,
        avgMoodWithTrigger: avgM,
        moodDelta: delta,
      });
    }
  });

  return list.sort((a, b) => Math.abs(b.moodDelta) - Math.abs(a.moodDelta)).slice(0, 6);
}

export function computeMonthlyRollups(
  dailyLogs: Record<string, DailyLog>,
  habits: Habit[] = []
): MonthlyRollup[] {
  const buckets: Record<string, DailyLog[]> = {};
  for (const log of Object.values(dailyLogs)) {
    const monthKey = log.date.slice(0, 7);
    if (!buckets[monthKey]) buckets[monthKey] = [];
    buckets[monthKey].push(log);
  }

  return Object.entries(buckets)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, logs]) => {
      const [y, m] = monthKey.split('-');
      const emoCount: Record<string, number> = {};
      logs.forEach((l) => {
        l.emotions.forEach((e) => {
          emoCount[e] = (emoCount[e] || 0) + 1;
        });
      });
      const topEmotions = Object.entries(emoCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([e]) => e);

      const balances = logs.map((l) =>
        computeLifeBalanceScore(l, getHabitRatioForDate(habits, l.date))
      );

      return {
        monthKey,
        monthLabel: `Tháng ${m}/${y}`,
        shortLabel: `T${Number(m)}/${y.slice(2)}`,
        daysLogged: logs.length,
        avgBalance: Math.round(average(balances)),
        avgMood: average(logs.map((l) => l.mood)),
        avgEnergy: average(logs.map((l) => l.energy)),
        avgSleep: average(logs.map((l) => l.sleepHours)),
        avgStress: average(logs.map((l) => l.stress)),
        avgFocus: average(logs.map((l) => l.focusHours ?? 0)),
        totalExerciseMinutes: logs.reduce((s, l) => s + l.exerciseMinutes, 0),
        topEmotions,
      };
    });
}

function aggregateLogsToBucket(
  label: string,
  tooltipTitle: string,
  logs: DailyLog[],
  habits: Habit[]
): BucketPoint {
  if (logs.length === 0) {
    return {
      label,
      tooltipTitle,
      diemCanBang: null,
      tamTrang: null,
      nangLuong: null,
      cangThang: null,
      giacNgu: null,
      vanDong: null,
      count: 0,
    };
  }

  return {
    label,
    tooltipTitle: `${tooltipTitle} (${logs.length} ngày)`,
    diemCanBang: Math.round(
      average(logs.map((l) => computeLifeBalanceScore(l, getHabitRatioForDate(habits, l.date))))
    ),
    tamTrang: average(logs.map((l) => l.mood)),
    nangLuong: average(logs.map((l) => l.energy)),
    cangThang: average(logs.map((l) => l.stress)),
    giacNgu: average(logs.map((l) => l.sleepHours)),
    vanDong: Math.round(logs.reduce((s, l) => s + l.exerciseMinutes, 0) / logs.length),
    count: logs.length,
  };
}

export function analyzeByHorizon(
  dailyLogs: Record<string, DailyLog>,
  horizon: TimeHorizon,
  habits: Habit[] = []
): HorizonAnalyticsResult | null {
  const today = getTodayStr();
  const allSortedDates = Object.keys(dailyLogs).sort();
  if (allSortedDates.length === 0) return null;

  let horizonDays = 30;
  if (horizon === '7d') horizonDays = 7;
  else if (horizon === '30d') horizonDays = 30;
  else if (horizon === '90d') horizonDays = 90;
  else if (horizon === '365d') horizonDays = 365;
  else {
    const oldest = parseDateKey(allSortedDates[0]);
    const newest = parseDateKey(today);
    const span = Math.ceil((newest.getTime() - oldest.getTime()) / 86400000) + 1;
    horizonDays = Math.max(7, span);
  }

  const currentKeys = getPastDateKeys(horizonDays, today);
  const currentSet = new Set(currentKeys);
  const currentLogs = currentKeys
    .map((k) => dailyLogs[k])
    .filter((l): l is DailyLog => Boolean(l));

  if (currentLogs.length === 0) return null;

  let prevLogs: DailyLog[] = [];
  if (horizon !== 'all') {
    const dayBeforeCurrent = parseDateKey(currentKeys[0]);
    dayBeforeCurrent.setDate(dayBeforeCurrent.getDate() - 1);
    const prevKeys = getPastDateKeys(horizonDays, formatDateKey(dayBeforeCurrent));
    prevLogs = prevKeys.map((k) => dailyLogs[k]).filter((l): l is DailyLog => Boolean(l));
  }

  const avgBalance = Math.round(
    average(
      currentLogs.map((l) => computeLifeBalanceScore(l, getHabitRatioForDate(habits, l.date)))
    )
  );
  const avgMood = average(currentLogs.map((l) => l.mood));
  const avgEnergy = average(currentLogs.map((l) => l.energy));
  const avgSleep = average(currentLogs.map((l) => l.sleepHours));
  const avgStress = average(currentLogs.map((l) => l.stress));
  const totalExerciseHours = round1(
    currentLogs.reduce((s, l) => s + l.exerciseMinutes, 0) / 60
  );
  const lateNightCount = currentLogs.filter((l) => l.bedtimeSlot === 'after_0030').length;

  const deltas =
    prevLogs.length >= 2
      ? {
          balance: Math.round(
            avgBalance -
              average(
                prevLogs.map((l) =>
                  computeLifeBalanceScore(l, getHabitRatioForDate(habits, l.date))
                )
              )
          ),
          mood: round1(avgMood - average(prevLogs.map((l) => l.mood))),
          energy: round1(avgEnergy - average(prevLogs.map((l) => l.energy))),
          sleep: round1(avgSleep - average(prevLogs.map((l) => l.sleepHours))),
          stress: round1(avgStress - average(prevLogs.map((l) => l.stress))),
        }
      : { balance: null, mood: null, energy: null, sleep: null, stress: null };

  let chartSeries: BucketPoint[] = [];
  let granularityLabel = 'Chi tiết từng ngày';

  if (horizonDays <= 35) {
    granularityLabel = 'Chi tiết từng ngày';
    chartSeries = currentKeys.map((d) => {
      const l = dailyLogs[d];
      return {
        label: formatShortDate(d),
        tooltipTitle: d,
        diemCanBang: l
          ? computeLifeBalanceScore(l, getHabitRatioForDate(habits, d))
          : null,
        tamTrang: l ? l.mood : null,
        nangLuong: l ? l.energy : null,
        cangThang: l ? l.stress : null,
        giacNgu: l ? l.sleepHours : null,
        vanDong: l ? l.exerciseMinutes : null,
        count: l ? 1 : 0,
      };
    });
  } else if (horizonDays <= 185) {
    granularityLabel = 'Trung bình theo từng tuần';
    for (let i = 0; i < currentKeys.length; i += 7) {
      const sliceKeys = currentKeys.slice(i, i + 7);
      const sliceLogs = sliceKeys
        .map((k) => dailyLogs[k])
        .filter((l): l is DailyLog => Boolean(l));
      const startLbl = formatShortDate(sliceKeys[0]);
      const endLbl = formatShortDate(sliceKeys[sliceKeys.length - 1]);
      chartSeries.push(
        aggregateLogsToBucket(startLbl, `Tuần ${startLbl} – ${endLbl}`, sliceLogs, habits)
      );
    }
  } else if (horizonDays <= 1100) {
    granularityLabel = 'Trung bình theo từng tháng';
    const monthMap = new Map<string, DailyLog[]>();
    currentKeys.forEach((k) => {
      if (!currentSet.has(k)) return;
      const mKey = k.slice(0, 7);
      if (!monthMap.has(mKey)) monthMap.set(mKey, []);
      if (dailyLogs[k]) monthMap.get(mKey)!.push(dailyLogs[k]);
    });
    monthMap.forEach((mLogs, mKey) => {
      const [y, m] = mKey.split('-');
      chartSeries.push(
        aggregateLogsToBucket(`T${Number(m)}/${y.slice(2)}`, `Tháng ${m}/${y}`, mLogs, habits)
      );
    });
  } else {
    granularityLabel = 'Trung bình theo từng quý (Nhiều năm)';
    const quarterMap = new Map<string, DailyLog[]>();
    currentLogs.forEach((l) => {
      const [y, m] = l.date.split('-').map(Number);
      const q = Math.floor((m - 1) / 3) + 1;
      const qKey = `Q${q}/${String(y).slice(2)}`;
      if (!quarterMap.has(qKey)) quarterMap.set(qKey, []);
      quarterMap.get(qKey)!.push(l);
    });
    quarterMap.forEach((qLogs, qKey) => {
      chartSeries.push(aggregateLogsToBucket(qKey, `Quý ${qKey}`, qLogs, habits));
    });
  }

  const emotionCounts: Record<string, number> = {};
  currentLogs.forEach((l) => {
    l.emotions.forEach((emo) => {
      emotionCounts[emo] = (emotionCounts[emo] || 0) + 1;
    });
  });
  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return {
    granularityLabel,
    logsCount: currentLogs.length,
    avgBalance,
    avgMood,
    avgEnergy,
    avgSleep,
    avgStress,
    totalExerciseHours,
    lateNightCount,
    deltas,
    chartSeries,
    correlations: computeCorrelations(currentLogs),
    triggerImpacts: computeTriggerImpacts(currentLogs),
    topEmotions,
  };
}

export interface YearHeatmapCell {
  date: string;
  inYear: boolean;
  mood?: number;
}

export function getAvailableYears(dailyLogs: Record<string, DailyLog>): number[] {
  const currentYear = new Date().getFullYear();
  const years = new Set<number>([currentYear]);
  Object.keys(dailyLogs).forEach((d) => {
    const y = Number(d.slice(0, 4));
    if (!Number.isNaN(y) && y >= 2000 && y <= 2100) {
      years.add(y);
    }
  });
  return Array.from(years).sort((a, b) => b - a);
}

export function buildYearHeatmap(
  dailyLogs: Record<string, DailyLog>,
  year: number
): YearHeatmapCell[][] {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);

  const startOffset = (jan1.getDay() + 6) % 7;
  const cursor = new Date(jan1);
  cursor.setDate(jan1.getDate() - startOffset);

  const weeks: YearHeatmapCell[][] = [];
  while (cursor <= dec31) {
    const week: YearHeatmapCell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = formatDateKey(cursor);
      const inYear = cursor.getFullYear() === year;
      week.push({
        date: key,
        inYear,
        mood: inYear ? dailyLogs[key]?.mood : undefined,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}
