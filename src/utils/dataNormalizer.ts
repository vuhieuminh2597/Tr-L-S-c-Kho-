import { AppData, ChatThread, DailyLog, Goal, Habit } from '../types';
import { computeGoalAutoProgress, parseDateKey } from './dateUtils';
import { createInitialCleanData } from './sampleData';

function clamp(val: number, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
  return Math.max(min, Math.min(max, val));
}

export function normalizeDailyLog(raw: Partial<DailyLog>, dateKey: string): DailyLog {
  return {
    date: raw.date || dateKey,
    mood: clamp(Number(raw.mood), 1, 10, 7),
    stress: clamp(Number(raw.stress), 1, 10, 4),
    emotions: Array.isArray(raw.emotions) ? Array.from(new Set(raw.emotions.filter(Boolean))) : [],
    triggers: Array.isArray(raw.triggers) ? Array.from(new Set(raw.triggers.filter(Boolean))) : [],
    focusHours:
      raw.focusHours !== undefined ? clamp(Number(raw.focusHours), 0, 18, 0) : undefined,
    sleepHours: clamp(Number(raw.sleepHours), 0, 16, 7.5),
    sleepQuality: clamp(Number(raw.sleepQuality), 1, 5, 4),
    bedtimeSlot: raw.bedtimeSlot,
    energy: clamp(Number(raw.energy), 1, 10, 7),
    waterGlasses: clamp(Number(raw.waterGlasses), 0, 30, 6),
    exerciseMinutes: clamp(Number(raw.exerciseMinutes), 0, 600, 0),
    exerciseType: raw.exerciseType || '',
    weightKg:
      raw.weightKg && Number(raw.weightKg) > 15 ? Number(raw.weightKg) : undefined,
    physicalNotes: raw.physicalNotes || '',
    journal: raw.journal || '',
    gratitude: raw.gratitude || '',
    aiReflection: raw.aiReflection,
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function syncCompanionNameInSystemTexts(data: AppData): AppData {
  const activeName = data.profile.companionName?.trim() || 'Tâm An';
  const activeUser = data.profile.userName?.trim() || 'Bạn';

  const chatThreads = data.chatThreads.map((t) => {
    if (t.id !== 'thread-welcome') return t;
    const isDefaultTitle =
      t.title.startsWith('Trò chuyện cùng ') ||
      t.title.startsWith('Cuộc trò chuyện mở đầu cùng ');
    const nextTitle = isDefaultTitle ? `Trò chuyện cùng ${activeName}` : t.title;
    const messages = t.messages.map((m) => {
      if (m.id !== 'msg-welcome') return m;
      return {
        ...m,
        content: `Xin chào ${activeUser}! Mình là **${activeName}** — trợ lý sức khoẻ, người lắng nghe tâm lý và cũng là người bạn đồng hành trên hành trình chinh phục mục tiêu của bạn.\n\nHôm nay cơ thể và tâm trí của bạn đang cảm thấy thế nào? Bạn có thể chia sẻ bất cứ điều gì, hoặc nhờ mình phân tích dữ liệu những ngày qua nhé!`,
      };
    });
    return { ...t, title: nextTitle, messages };
  });

  const goals = data.goals.map((g) => ({
    ...g,
    milestones: g.milestones.map((ms) =>
      ms.id === 'm-8'
        ? { ...ms, title: `Tổng kết quy luật tâm sinh lý cuối mỗi tuần cùng ${activeName}` }
        : ms
    ),
  }));

  return { ...data, chatThreads, goals };
}

export function normalizeAppData(raw: Partial<AppData> | null | undefined): AppData {
  const clean = createInitialCleanData();
  if (!raw || typeof raw !== 'object') return clean;

  const dailyLogs: Record<string, DailyLog> = {};
  if (raw.dailyLogs && typeof raw.dailyLogs === 'object') {
    Object.entries(raw.dailyLogs).forEach(([k, v]) => {
      if (v && typeof v === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(k)) {
        dailyLogs[k] = normalizeDailyLog(v, k);
      }
    });
  }

  const habits: Habit[] = Array.isArray(raw.habits)
    ? raw.habits
        .filter((h) => h && h.id && h.title)
        .map((h) => ({
          ...h,
          completedDates: Array.isArray(h.completedDates)
            ? Array.from(new Set(h.completedDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))).sort()
            : [],
        }))
    : clean.habits;

  const goals: Goal[] = Array.isArray(raw.goals)
    ? raw.goals
        .filter((g) => g && g.id && g.title)
        .map((g) => {
          const milestones = Array.isArray(g.milestones) ? g.milestones : [];
          // Tự động chọn chế độ phù hợp nhất cho cả mục tiêu cũ đã tạo trước đó
          const inferredType =
            g.trackingType ||
            (milestones.length > 0 ? 'milestones' : 'streak_days');

          let targetDays = g.targetDays;
          if (!targetDays || targetDays < 1) {
            if (g.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(g.targetDate)) {
              const startD = g.createdAt
                ? parseDateKey(g.createdAt.slice(0, 10))
                : new Date();
              const endD = parseDateKey(g.targetDate);
              const diff = Math.round((endD.getTime() - startD.getTime()) / 86400000);
              targetDays = diff >= 3 && diff <= 3650 ? diff : 30;
            } else {
              targetDays = 30;
            }
          }

          const checkInDates = Array.isArray(g.checkInDates)
            ? Array.from(new Set(g.checkInDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))).sort()
            : [];
          const slipDates = Array.isArray(g.slipDates)
            ? Array.from(new Set(g.slipDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))).sort()
            : [];

          const autoProgress = computeGoalAutoProgress({
            trackingType: inferredType,
            targetDays,
            checkInDates,
            slipDates,
            milestones,
            currentValue: g.currentValue,
            targetValue: g.targetValue,
            fallbackProgress: clamp(Number(g.progress), 0, 100, 0),
          });

          return {
            ...g,
            trackingType: inferredType,
            targetDays,
            checkInDates,
            slipDates,
            milestones,
            progress: g.status === 'completed' ? 100 : autoProgress,
          };
        })
    : [];

  return syncCompanionNameInSystemTexts({
    version: 2,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    theme: raw.theme === 'dark' ? 'dark' : 'light',
    profile: {
      ...clean.profile,
      ...(raw.profile || {}),
    },
    dailyLogs,
    goals,
    habits,
    chatThreads: Array.isArray(raw.chatThreads) ? raw.chatThreads : clean.chatThreads,
    insightReports: Array.isArray(raw.insightReports) ? raw.insightReports : [],
    deletedIds: Array.isArray(raw.deletedIds)
      ? Array.from(new Set(raw.deletedIds)).slice(-500)
      : [],
    dailyBriefing: raw.dailyBriefing,
  });
}

/**
 * Hợp nhất dữ liệu thông minh 2 chiều (iPhone 17 <-> Máy tính <-> Gist)
 * Không bao giờ làm mất nhật ký, chuỗi thói quen hay cuộc trò chuyện khi dùng nhiều thiết bị.
 */
export function smartMergeAppData(localRaw: AppData, remoteRaw: AppData): AppData {
  const local = normalizeAppData(localRaw);
  const remote = normalizeAppData(remoteRaw);

  const localIsNewer = (local.updatedAt || '') >= (remote.updatedAt || '');
  const primary = localIsNewer ? local : remote;
  const secondary = localIsNewer ? remote : local;

  const deletedSet = new Set<string>([
    ...(local.deletedIds || []),
    ...(remote.deletedIds || []),
  ]);

  // 1. Hợp nhất DailyLogs theo từng ngày (ưu tiên bản ghi có updatedAt mới hơn)
  const mergedLogs: Record<string, DailyLog> = { ...secondary.dailyLogs };
  Object.entries(primary.dailyLogs).forEach(([dateKey, pLog]) => {
    const sLog = mergedLogs[dateKey];
    if (!sLog || (pLog.updatedAt || '') >= (sLog.updatedAt || '')) {
      mergedLogs[dateKey] = pLog;
    }
  });
  Object.entries(secondary.dailyLogs).forEach(([dateKey, sLog]) => {
    const pLog = primary.dailyLogs[dateKey];
    if (pLog && (sLog.updatedAt || '') > (pLog.updatedAt || '')) {
      mergedLogs[dateKey] = sLog;
    }
  });

  // 2. Hợp nhất Habits (gộp tập hợp các ngày đã tích hoàn thành trên cả 2 thiết bị)
  const habitMap = new Map<string, Habit>();
  [...secondary.habits, ...primary.habits].forEach((h) => {
    if (deletedSet.has(h.id)) return;
    const existing = habitMap.get(h.id);
    if (!existing) {
      habitMap.set(h.id, h);
    } else {
      habitMap.set(h.id, {
        ...h,
        completedDates: Array.from(
          new Set([...existing.completedDates, ...h.completedDates])
        ).sort(),
      });
    }
  });

  // 3. Hợp nhất Goals (gộp cả checkInDates & slipDates giữa 2 thiết bị)
  const goalMap = new Map<string, Goal>();
  [...secondary.goals, ...primary.goals].forEach((g) => {
    if (deletedSet.has(g.id)) return;
    const existing = goalMap.get(g.id);
    if (!existing) {
      goalMap.set(g.id, g);
    } else {
      const gTime = g.updatedAt || g.createdAt || '';
      const eTime = existing.updatedAt || existing.createdAt || '';
      const winner = gTime >= eTime ? g : existing;
      const mergedCheckIns = Array.from(
        new Set([...(existing.checkInDates || []), ...(g.checkInDates || [])])
      ).sort();
      const mergedSlips = Array.from(
        new Set([...(existing.slipDates || []), ...(g.slipDates || [])])
      ).sort();
      goalMap.set(g.id, {
        ...winner,
        checkInDates: mergedCheckIns,
        slipDates: mergedSlips,
      });
    }
  });

  // 4. Hợp nhất ChatThreads & Tin nhắn bên trong
  const threadMap = new Map<string, ChatThread>();
  [...secondary.chatThreads, ...primary.chatThreads].forEach((t) => {
    if (deletedSet.has(t.id)) return;
    const existing = threadMap.get(t.id);
    if (!existing) {
      threadMap.set(t.id, t);
    } else {
      const msgMap = new Map(existing.messages.map((m) => [m.id, m]));
      t.messages.forEach((m) => msgMap.set(m.id, m));
      const mergedMessages = Array.from(msgMap.values()).sort((a, b) =>
        (a.createdAt || '').localeCompare(b.createdAt || '')
      );
      const newerThread = (t.updatedAt || '') >= (existing.updatedAt || '') ? t : existing;
      threadMap.set(t.id, {
        ...newerThread,
        messages: mergedMessages,
      });
    }
  });

  // 5. Hợp nhất Báo cáo phân tích AI
  const reportMap = new Map(
    [...secondary.insightReports, ...primary.insightReports]
      .filter((r) => !deletedSet.has(r.id))
      .map((r) => [r.id, r])
  );
  const mergedReports = Array.from(reportMap.values()).sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );

  // 6. Chọn DailyBriefing mới nhất
  let dailyBriefing = primary.dailyBriefing || secondary.dailyBriefing;
  if (primary.dailyBriefing && secondary.dailyBriefing) {
    dailyBriefing =
      primary.dailyBriefing.date >= secondary.dailyBriefing.date
        ? primary.dailyBriefing
        : secondary.dailyBriefing;
  }

  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    theme: primary.theme,
    profile: { ...secondary.profile, ...primary.profile },
    dailyLogs: mergedLogs,
    goals: Array.from(goalMap.values()),
    habits: Array.from(habitMap.values()),
    chatThreads: Array.from(threadMap.values()).sort((a, b) =>
      (b.updatedAt || '').localeCompare(a.updatedAt || '')
    ),
    insightReports: mergedReports,
    deletedIds: Array.from(deletedSet).slice(-500),
    dailyBriefing,
  };
}
