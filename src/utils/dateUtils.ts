export function getTodayStr(): string {
  const now = new Date();
  return formatDateKey(now);
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPastDateKeys(days: number, endDateStr?: string): string[] {
  const base = endDateStr ? parseDateKey(endDateStr) : new Date();
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    result.push(formatDateKey(d));
  }
  return result;
}

export function parseDateKey(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDisplayDate(dateStr: string): string {
  const date = parseDateKey(dateStr);
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

export function calculateHabitStreak(completedDates: string[], todayStr = getTodayStr()): number {
  if (!completedDates || completedDates.length === 0) return 0;
  const set = new Set(completedDates);
  let cursor = parseDateKey(todayStr);

  // Nếu hôm nay chưa tích, kiểm tra chuỗi tính từ hôm qua
  if (!set.has(formatDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(formatDateKey(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (set.has(formatDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function calculateGoalStreakStats(
  checkInDates: string[] = [],
  slipDates: string[] = [],
  todayStr = getTodayStr()
): { currentStreak: number; bestStreak: number; totalCleanDays: number } {
  const slipSet = new Set(slipDates);
  const cleanSorted = Array.from(new Set(checkInDates))
    .filter((d) => !slipSet.has(d))
    .sort();

  const totalCleanDays = cleanSorted.length;
  if (totalCleanDays === 0) {
    return { currentStreak: 0, bestStreak: 0, totalCleanDays: 0 };
  }

  // Tính chuỗi kỷ lục dài nhất (Best Streak)
  let bestStreak = 1;
  let running = 1;
  for (let i = 1; i < cleanSorted.length; i++) {
    const prev = parseDateKey(cleanSorted[i - 1]);
    const curr = parseDateKey(cleanSorted[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      running += 1;
      if (running > bestStreak) bestStreak = running;
    } else {
      running = 1;
    }
  }

  // Tính chuỗi hiện tại (Current Streak)
  const currentStreak = calculateHabitStreak(cleanSorted, todayStr);
  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    totalCleanDays,
  };
}

export function computeGoalAutoProgress(params: {
  trackingType?: 'streak_days' | 'milestones' | 'numeric';
  targetDays?: number;
  checkInDates?: string[];
  slipDates?: string[];
  milestones?: { completed: boolean }[];
  currentValue?: number;
  targetValue?: number;
  fallbackProgress?: number;
}): number {
  const mode = params.trackingType || 'streak_days';
  if (mode === 'streak_days') {
    const target = Math.max(1, params.targetDays || 30);
    const { totalCleanDays } = calculateGoalStreakStats(
      params.checkInDates || [],
      params.slipDates || []
    );
    return Math.min(100, Math.round((totalCleanDays / target) * 100));
  }
  if (mode === 'numeric') {
    const target = Math.max(0.0001, params.targetValue || 100);
    const current = Math.max(0, params.currentValue || 0);
    return Math.min(100, Math.round((current / target) * 100));
  }
  const ms = params.milestones || [];
  if (ms.length === 0) return params.fallbackProgress ?? 0;
  const done = ms.filter((m) => m.completed).length;
  return Math.min(100, Math.round((done / ms.length) * 100));
}

export function getGreetingByHour(): { greeting: string; periodHint: string } {
  const h = new Date().getHours();
  if (h < 11) {
    return {
      greeting: 'Chào buổi sáng lành mạnh',
      periodHint: 'Khởi đầu ngày mới nhẹ nhàng và rõ ràng mục tiêu nhé.',
    };
  }
  if (h < 14) {
    return {
      greeting: 'Chào buổi trưa bình yên',
      periodHint: 'Đừng quên uống nước và dành vài phút thả lỏng mắt, vai gáy nhé.',
    };
  }
  if (h < 18) {
    return {
      greeting: 'Chào buổi chiều bền bỉ',
      periodHint: 'Giữ nhịp năng lượng vừa sức, từng bước nhỏ đều đáng trân trọng.',
    };
  }
  return {
    greeting: 'Chào buổi tối thư thái',
    periodHint: 'Đã đến lúc lắng lại, ghi nhận nỗ lực hôm nay và chăm sóc giấc ngủ.',
  };
}
