import {
  AIConnectionState,
  AIProviderConfig,
  AIProviderId,
  AISkillId,
  AppData,
  ChatMessage,
  DailyLog,
  Goal,
  PronounStyle,
  TimeHorizon,
} from '../types';
import {
  calculateGoalStreakStats,
  calculateHabitStreak,
  getPastDateKeys,
  getTodayStr,
} from '../utils/dateUtils';
import {
  buildSkillsInstructionBlock,
  STRICT_GROUNDING_CONSTITUTION,
} from './aiSkills';
import {
  analyzeByHorizon,
  BEDTIME_LABELS,
  computeCorrelations,
  computeLifeBalanceScore,
  computeMonthlyRollups,
  computeTriggerImpacts,
} from './analyticsEngine';

export interface ModelOption {
  value: string;
  label: string;
}

export interface ProviderMeta {
  id: AIProviderId;
  name: string;
  badge: string;
  keyGuideUrl: string;
  keyPlaceholder: string;
  defaultModel: string;
  suggestedModels: ModelOption[];
  supportsCustomBaseUrl?: boolean;
}

export const AI_PROVIDERS_META: Record<AIProviderId, ProviderMeta> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Khuyên dùng • Thế hệ Gemini 4 & 3.8 mới nhất',
    keyGuideUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIzaSy...',
    defaultModel: 'gemini-3.8-flash',
    suggestedModels: [
      { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Khuyên dùng • Nhanh, thông minh, Free)' },
      { value: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen (Thế hệ 4 mới nhất • Tốc độ & hiệu quả cao)' },
      { value: 'gemini-4-argon', label: 'Gemini 4 Argon (Thế hệ 4 • Suy luận sâu, tiết kiệm token)' },
      { value: 'gemini-4-neon', label: 'Gemini 4 Neon (Thế hệ 4 • Trí tuệ cấp cao, phản hồi nhanh)' },
      { value: 'gemini-4-carbon', label: 'Gemini 4 Carbon (Thế hệ 4 Flagship • Phân tích sâu mạnh nhất)' },
      { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (Ổn định • Thay thế chính thức dòng 2.x/3.5)' },
      { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (Siêu nhẹ • Tiết kiệm hạn mức tối đa)' },
    ],
  },
  groq: {
    id: 'groq',
    name: 'Groq Cloud',
    badge: 'Miễn phí • Tốc độ phản hồi siêu nhanh',
    keyGuideUrl: 'https://console.groq.com/keys',
    keyPlaceholder: 'gsk_...',
    defaultModel: 'openai/gpt-oss-120b',
    suggestedModels: [
      { value: 'openai/gpt-oss-120b', label: 'OpenAI GPT-OSS 120B (Mới nhất • Suy luận mạnh trên Groq)' },
      { value: 'openai/gpt-oss-20b', label: 'OpenAI GPT-OSS 20B (Tốc độ siêu nhanh, nhẹ)' },
      { value: 'llama-3.3-70b-versatile', label: 'Meta Llama 3.3 70B Versatile (Đa năng, tiếng Việt tốt)' },
      { value: 'llama-3.1-8b-instant', label: 'Meta Llama 3.1 8B Instant (Phản hồi tức thì)' },
    ],
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'Đa mô hình • Tự động chọn Model Free đang sống',
    keyGuideUrl: 'https://openrouter.ai/keys',
    keyPlaceholder: 'sk-or-v1-...',
    defaultModel: 'openrouter/free',
    suggestedModels: [
      { value: 'openrouter/free', label: 'Auto Free Router (Tự động chọn model Free tốt nhất)' },
      { value: 'google/gemma-4-31b-it:free', label: 'Google Gemma 4 31B (Free • Thế hệ 4 mới nhất)' },
      { value: 'nvidia/nemotron-3-ultra:free', label: 'NVIDIA Nemotron 3 Ultra (Free • Suy luận sâu)' },
      { value: 'nvidia/nemotron-3.5-lightning:free', label: 'NVIDIA Nemotron 3.5 Lightning (Free • Tốc độ cao)' },
      { value: 'upstage/solar-pro-3:free', label: 'Upstage Solar Pro 3 (Free)' },
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI / Tương thích OpenAI',
    badge: 'Thế hệ GPT-6 • Hỗ trợ Custom URL',
    keyGuideUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-...',
    defaultModel: 'gpt-6-luna',
    supportsCustomBaseUrl: true,
    suggestedModels: [
      { value: 'gpt-6-luna', label: 'GPT-6 Luna (Thế hệ 6 • Nhanh, hiệu quả cao)' },
      { value: 'gpt-6.2-sol', label: 'GPT-6.2 Sol (Cân bằng hiệu năng cao & chi phí)' },
      { value: 'gpt-6.2-astra', label: 'GPT-6.2 Astra (Flagship phân tích sâu nhất)' },
      { value: 'gpt-5-mini', label: 'GPT-5 Mini (Nhẹ, tiết kiệm)' },
    ],
  },
};

const RETIRED_MODELS_MAP: Record<AIProviderId, Set<string>> = {
  gemini: new Set([
    'gemini-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-exp',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-3.5-flash',
  ]),
  groq: new Set(['deepseek-r1-distill-llama-70b', 'mixtral-8x7b-32768', 'llama3-70b-8192']),
  openrouter: new Set([
    'google/gemini-2.0-flash-exp:free',
    'deepseek/deepseek-chat-v3-0324:free',
    'anthropic/claude-3.5-sonnet',
  ]),
  openai: new Set(['gpt-3.5-turbo', 'gpt-4o-mini', 'gpt-4o']),
};

export function sanitizeAIConfigModels(config: AIProviderConfig): AIProviderConfig {
  const updatedProviders = { ...config.providers };
  (Object.keys(AI_PROVIDERS_META) as AIProviderId[]).forEach((id) => {
    const meta = AI_PROVIDERS_META[id];
    const current = updatedProviders[id] || { apiKey: '', model: meta.defaultModel };
    const trimmedModel = (current.model || '').trim();
    if (!trimmedModel || RETIRED_MODELS_MAP[id].has(trimmedModel)) {
      updatedProviders[id] = {
        ...current,
        model: meta.defaultModel,
      };
    }
  });
  return {
    ...config,
    providers: updatedProviders,
  };
}

export async function fetchLiveModelsFromProvider(
  providerId: AIProviderId,
  apiKey: string,
  customBaseUrl?: string
): Promise<ModelOption[]> {
  const cleanKey = apiKey.trim();

  if (providerId === 'gemini') {
    if (!cleanKey) {
      throw new Error('Vui lòng dán Gemini API Key trước khi quét danh sách model trực tiếp từ Google.');
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${encodeURIComponent(
        cleanKey
      )}`
    );
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(
        errBody?.error?.message || `Không thể tải danh sách model Gemini (HTTP ${res.status})`
      );
    }
    const json = await res.json();
    const rawModels: {
      name?: string;
      displayName?: string;
      supportedGenerationMethods?: string[];
    }[] = json?.models || [];

    const filtered = rawModels
      .filter((m) => {
        const id = (m.name || '').replace(/^models\//, '');
        const supportsChat = m.supportedGenerationMethods?.includes('generateContent');
        const isExcluded = /(embedding|imagen|veo|aqa|tts|whisper|moderation)/i.test(id);
        return Boolean(id) && supportsChat && !isExcluded && !RETIRED_MODELS_MAP.gemini.has(id);
      })
      .map((m) => {
        const id = (m.name || '').replace(/^models\//, '');
        const title = m.displayName ? `${m.displayName} (${id})` : id;
        return { value: id, label: title };
      })
      // Ưu tiên xếp dòng Gemini 4 & Gemini 3.8 lên đầu danh sách
      .sort((a, b) => {
        const score = (id: string) => {
          if (id.startsWith('gemini-4')) return 40;
          if (id.startsWith('gemini-3.8')) return 35;
          if (id.startsWith('gemini-3')) return 30;
          if (id.startsWith('gemini-')) return 20;
          return 10;
        };
        return score(b.value) - score(a.value) || b.value.localeCompare(a.value);
      });

    if (filtered.length === 0) {
      throw new Error('Không tìm thấy model sinh văn bản nào khả dụng cho API Key này.');
    }
    return filtered;
  }

  let baseUrl = 'https://api.openai.com/v1';
  if (providerId === 'groq') baseUrl = 'https://api.groq.com/openai/v1';
  else if (providerId === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1';
  else if (customBaseUrl?.trim()) baseUrl = customBaseUrl.trim().replace(/\/+$/, '');

  if (providerId !== 'openrouter' && !cleanKey) {
    throw new Error(`Vui lòng dán API Key ${AI_PROVIDERS_META[providerId].name} trước khi quét model.`);
  }

  const headers: Record<string, string> = {};
  if (cleanKey) {
    headers.Authorization = `Bearer ${cleanKey}`;
  }

  const res = await fetch(`${baseUrl}/models`, { headers });
  if (!res.ok) {
    throw new Error(`Không thể quét danh sách model (HTTP ${res.status}).`);
  }

  const json = await res.json();
  const dataList: { id?: string; name?: string }[] = json?.data || [];

  const options = dataList
    .filter((m) => {
      const id = m.id || '';
      if (!id) return false;
      if (/(whisper|tts|embedding|guard|moderation|dall-e)/i.test(id)) return false;
      if (providerId === 'openrouter') {
        // Ưu tiên đưa các model :free và các dòng phổ biến lên dễ chọn
        return id.endsWith(':free') || /^(openrouter\/free|google\/|openai\/|anthropic\/|nvidia\/|meta-llama\/)/.test(id);
      }
      return true;
    })
    .map((m) => ({
      value: m.id!,
      label: m.name && m.name !== m.id ? `${m.name} (${m.id})` : m.id!,
    }))
    .sort((a, b) => {
      const aFree = a.value.includes('free') ? 1 : 0;
      const bFree = b.value.includes('free') ? 1 : 0;
      return bFree - aFree || a.value.localeCompare(b.value);
    });

  return options.slice(0, 80);
}

/**
 * Tự động kiểm tra bắt tay kết nối (Handshake) trực tiếp với máy chủ AI khi mở web (Tốn 0 token!)
 * Đồng thời tự động đồng bộ danh sách Model sống & sửa model nếu model cũ không còn khả dụng.
 */
export async function verifyProviderHandshake(
  aiConfig: AIProviderConfig
): Promise<{ state: AIConnectionState; resolvedModel?: string; liveModels?: ModelOption[] }> {
  const provider = aiConfig.activeProvider;
  const meta = AI_PROVIDERS_META[provider];
  const setting = aiConfig.providers[provider];
  const apiKey = (setting?.apiKey || '').trim();
  const currentModel = (setting?.model || meta.defaultModel).trim();

  if (!apiKey) {
    return {
      state: {
        status: 'unconfigured',
        provider,
        message: `Chưa gắn API Key cho ${meta.name}`,
      },
    };
  }

  const start = performance.now();
  try {
    if (provider === 'openrouter') {
      const authRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!authRes.ok) {
        throw new Error(`API Key OpenRouter không hợp lệ (HTTP ${authRes.status})`);
      }
      const latencyMs = Math.max(1, Math.round(performance.now() - start));
      return {
        state: {
          status: 'connected',
          provider,
          verifiedModel: currentModel,
          latencyMs,
          message: `Đã kết nối ${meta.name} (${latencyMs}ms)`,
          verifiedAt: new Date().toISOString(),
        },
      };
    }

    const liveModels = await fetchLiveModelsFromProvider(provider, apiKey, setting?.baseUrl);
    const latencyMs = Math.max(1, Math.round(performance.now() - start));

    // Lưu đệm danh sách model sống vào localStorage để trang Cài đặt có sẵn ngay
    try {
      const cachedRaw = localStorage.getItem('tam_an_live_models_v1');
      const cached = cachedRaw ? JSON.parse(cachedRaw) : {};
      cached[provider] = liveModels;
      localStorage.setItem('tam_an_live_models_v1', JSON.stringify(cached));
    } catch {
      // ignore
    }

    const cleanCurrent = currentModel.replace(/^models\//, '');
    const modelExists = liveModels.some((m) => m.value === cleanCurrent);
    const resolvedModel =
      modelExists || liveModels.length === 0 ? cleanCurrent : liveModels[0].value;

    return {
      resolvedModel,
      liveModels,
      state: {
        status: 'connected',
        provider,
        verifiedModel: resolvedModel,
        latencyMs,
        message: `Đã kết nối ${meta.name} • ${resolvedModel} (${latencyMs}ms)`,
        verifiedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Không thể kết nối máy chủ AI';
    return {
      state: {
        status: 'error',
        provider,
        message: msg,
        verifiedAt: new Date().toISOString(),
      },
    };
  }
}

function getPronounPair(style: PronounStyle): { aiSelf: string; userCall: string } {
  switch (style) {
    case 'to_cau':
      return { aiSelf: 'tớ', userCall: 'cậu' };
    case 'anh_em':
      return { aiSelf: 'anh', userCall: 'em' };
    case 'em_anh':
      return { aiSelf: 'em', userCall: 'anh' };
    case 'minh_ban':
    default:
      return { aiSelf: 'mình', userCall: 'bạn' };
  }
}

export function resolveUserAge(profile: AppData['profile']): number | null {
  const currentYear = new Date().getFullYear();
  if (profile.birthYear && profile.birthYear >= 1920 && profile.birthYear <= currentYear - 5) {
    return currentYear - profile.birthYear;
  }
  if (profile.age && profile.age >= 5 && profile.age <= 110) {
    return profile.age;
  }
  return null;
}

export function computePhysiologicalProfile(profile: AppData['profile']): {
  age: number | null;
  bmi: number | null;
  bmiCategory: string;
  recommendedWaterGlasses: number;
  recommendedWaterLiters: number;
  optimalHeartRateZone: string | null;
  recommendedSleepRange: string;
} {
  const age = resolveUserAge(profile);
  const h = profile.heightCm && profile.heightCm > 50 ? profile.heightCm : null;
  const w = profile.weightKg && profile.weightKg > 15 ? profile.weightKg : null;

  let bmi: number | null = null;
  let bmiCategory = 'Chưa rõ BMI';
  if (h && w) {
    const heightM = h / 100;
    bmi = Math.round((w / (heightM * heightM)) * 10) / 10;
    if (bmi < 18.5) bmiCategory = 'Thiếu cân (Cần bồi bổ dinh dưỡng & ngủ sâu)';
    else if (bmi < 23) bmiCategory = 'Cân đối, chuẩn thể trạng';
    else if (bmi < 25) bmiCategory = 'Thừa cân nhẹ (Ưu tiên vận động đều đặn)';
    else bmiCategory = 'Thừa cân (Cần kết hợp vận động đốt mỡ & kiểm soát căng thẳng)';
  }

  const waterMl = w ? Math.round(w * 35) : 2000;
  const recommendedWaterLiters = Math.round((waterMl / 1000) * 10) / 10;
  const recommendedWaterGlasses = Math.max(5, Math.round(waterMl / 250));

  let optimalHeartRateZone: string | null = null;
  if (age) {
    const hrMax = 220 - age;
    const zLow = Math.round(hrMax * 0.6);
    const zHigh = Math.round(hrMax * 0.72);
    optimalHeartRateZone = `${zLow}–${zHigh} nhịp/phút`;
  }

  const recommendedSleepRange =
    age && age <= 25 ? '7.5–9 giờ/đêm' : age && age >= 60 ? '7–8 giờ/đêm' : '7–8.5 giờ/đêm';

  return {
    age,
    bmi,
    bmiCategory,
    recommendedWaterGlasses,
    recommendedWaterLiters,
    optimalHeartRateZone,
    recommendedSleepRange,
  };
}

export function buildPersonalContextSummary(data: AppData): string {
  const today = getTodayStr();
  const allLogs = Object.values(data.dailyLogs).sort((a, b) => a.date.localeCompare(b.date));
  const last7Days = getPastDateKeys(7, today);
  const recentLogs = last7Days
    .map((d) => data.dailyLogs[d])
    .filter((l): l is DailyLog => Boolean(l));

  const phys = computePhysiologicalProfile(data.profile);

  const lines: string[] = [];
  lines.push(`=== HỒ SƠ THỂ TRẠNG, ĐỘ TUỔI, TÍNH CÁCH & BỐI CẢNH CÁ NHÂN ===`);
  lines.push(
    `- Tên người dùng: ${data.profile.userName || 'Bạn'}${
      phys.age ? ` | Độ tuổi: ${phys.age} tuổi` : ''
    } | Quốc tịch / Văn hoá sinh sống: ${data.profile.nationality || 'Việt Nam'}`
  );
  if (data.profile.heightCm || data.profile.weightKg || phys.age) {
    lines.push(
      `- Thể trạng sinh học: ${phys.age ? `${phys.age} tuổi, ` : ''}Chiều cao ${
        data.profile.heightCm || '--'
      } cm | Cân nặng ${data.profile.weightKg || '--'} kg${
        phys.bmi ? ` -> Chỉ số BMI: ${phys.bmi} (${phys.bmiCategory})` : ''
      } | Ngủ chuẩn theo tuổi: ${phys.recommendedSleepRange}${
        phys.optimalHeartRateZone
          ? ` | Vùng nhịp tim vận động bền/đốt mỡ an toàn: ${phys.optimalHeartRateZone}`
          : ''
      } | Nhu cầu nước: ~${phys.recommendedWaterLiters} lít (${phys.recommendedWaterGlasses} cốc/ngày).`
    );
  }
  if (data.profile.personality) {
    lines.push(
      `- Đặc điểm tính cách & tâm lý: ${data.profile.personality} (Hãy tinh chỉnh giọng điệu tâm lý và phương án hành động phù hợp sát với tính cách này).`
    );
  }
  if (data.profile.bioOrFocus) {
    lines.push(`- Trọng tâm & bối cảnh cuộc sống hiện tại: ${data.profile.bioOrFocus}`);
  }

  if (recentLogs.length > 0) {
    const avg = (arr: number[]) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
    const avgMood = avg(recentLogs.map((l) => l.mood));
    const avgStress = avg(recentLogs.map((l) => l.stress));
    const avgSleep = avg(recentLogs.map((l) => l.sleepHours));
    const avgEnergy = avg(recentLogs.map((l) => l.energy));

    lines.push(`\n=== TẦNG 1: CHI TIẾT 7 NGÀY GẦN ĐÂY (${recentLogs.length}/7 ngày có ghi nhận) ===`);
    lines.push(
      `- Trung bình 7 ngày: Tâm trạng ${avgMood}/10 | Căng thẳng ${avgStress}/10 | Giấc ngủ ${avgSleep}h | Năng lượng ${avgEnergy}/10.`
    );
    recentLogs.slice(-5).forEach((log) => {
      const habitRatio =
        data.habits.length > 0
          ? data.habits.filter((h) => h.completedDates.includes(log.date)).length /
            data.habits.length
          : 0.5;
      const balance = computeLifeBalanceScore(log, habitRatio);
      const bed = log.bedtimeSlot ? `, Ngủ lúc ${BEDTIME_LABELS[log.bedtimeSlot]}` : '';
      const emo = log.emotions.length > 0 ? ` | Cảm xúc: [${log.emotions.join(', ')}]` : '';
      const trig =
        log.triggers && log.triggers.length > 0
          ? ` | Tác nhân: [${log.triggers.join(', ')}]`
          : '';
      const physNote = log.physicalNotes ? ` | Cơ thể: ${log.physicalNotes}` : '';
      const jrnl = log.journal ? ` | Nhật ký: "${log.journal.slice(0, 140)}"` : '';
      lines.push(
        `  • ${log.date} (Điểm Cân Bằng ${balance}/100): Mood ${log.mood}/10, Stress ${log.stress}/10, Ngủ ${log.sleepHours}h (CL ${log.sleepQuality}/5${bed}), NL ${log.energy}/10, Tập ${log.exerciseMinutes}p${emo}${trig}${physNote}${jrnl}`
      );
    });
  } else {
    lines.push(`\n=== TẦNG 1: CHỈ SỐ GẦN ĐÂY ===`);
    lines.push(`- Người dùng chưa có bản ghi nhật ký trong 7 ngày qua.`);
  }

  // TẦNG 2: Ký ức nén đa tháng / đa năm (giúp AI hiểu hành trình nhiều năm mà vẫn siêu nhẹ token)
  if (allLogs.length > 7) {
    const monthlyRollups = computeMonthlyRollups(data.dailyLogs, data.habits).slice(0, 18);
    const correlations = computeCorrelations(allLogs).slice(0, 3);
    const triggerImpacts = computeTriggerImpacts(allLogs).slice(0, 4);
    lines.push(
      `\n=== TẦNG 2: LỊCH SỬ DÀI HẠN ĐA THÁNG / ĐA NĂM (Tổng ${allLogs.length} ngày từ ${allLogs[0].date} đến ${allLogs[allLogs.length - 1].date}) ===`
    );
    monthlyRollups.forEach((m) => {
      lines.push(
        `  • ${m.monthLabel} (${m.daysLogged} ngày): Điểm Cân Bằng ${m.avgBalance}/100, Mood ${m.avgMood}/10, NL ${m.avgEnergy}/10, Ngủ ${m.avgSleep}h, Stress ${m.avgStress}/10, Tập ${m.totalExerciseMinutes}p`
      );
    });
    if (correlations.length > 0) {
      lines.push(`- Tương quan cá nhân dài hạn (Pearson r):`);
      correlations.forEach((c) => {
        lines.push(`  • ${c.pairLabel} (r=${c.r}): ${c.summary}`);
      });
    }
    if (triggerImpacts.length > 0) {
      lines.push(`- Tác nhân gốc rễ ảnh hưởng tâm trạng mạnh nhất:`);
      triggerImpacts.forEach((t) => {
        lines.push(
          `  • "${t.trigger}" (${t.occurrences} lần): làm tâm trạng thay đổi ${
            t.moodDelta > 0 ? `+${t.moodDelta}` : t.moodDelta
          } điểm so với trung bình.`
        );
      });
    }
  }

  const activeGoals = data.goals.filter((g) => g.status === 'active');
  lines.push(`\n=== MỤC TIÊU ĐANG THEO ĐUỔI (${activeGoals.length}) ===`);
  if (activeGoals.length === 0) {
    lines.push(`- Chưa đặt mục tiêu đang hoạt động.`);
  } else {
    activeGoals.forEach((g) => {
      const pendingMilestones = g.milestones
        .filter((m) => !m.completed)
        .slice(0, 3)
        .map((m) => m.title)
        .join('; ');
      lines.push(
        `  • [${g.category.toUpperCase()}] "${g.title}" — Tiến độ: ${g.progress}%${
          g.targetDate ? ` (Đích: ${g.targetDate})` : ''
        } | Lý do cốt lõi: ${g.whyItMatters || 'Phát triển bản thân'}${
          pendingMilestones ? ` | Bước tiếp theo: ${pendingMilestones}` : ''
        }`
      );
    });
  }

  lines.push(`\n=== THÓI QUEN HÀNG NGÀY (${data.habits.length}) ===`);
  if (data.habits.length === 0) {
    lines.push(`- Chưa thiết lập thói quen hàng ngày.`);
  } else {
    data.habits.forEach((h) => {
      const streak = calculateHabitStreak(h.completedDates, today);
      const doneToday = h.completedDates.includes(today) ? 'Đã làm hôm nay' : 'Chưa làm hôm nay';
      lines.push(`  • ${h.icon} ${h.title}: Chuỗi ${streak} ngày liên tiếp (${doneToday})`);
    });
  }

  return lines.join('\n');
}

export function buildHolisticSystemPrompt(
  data: AppData,
  shareContext: boolean,
  options?: { skill?: AISkillId; userPromptHint?: string }
): string {
  const { aiSelf, userCall } = getPronounPair(data.profile.pronounStyle);
  const companionName = data.profile.companionName || 'Tâm An';
  const skillsBlock = buildSkillsInstructionBlock(
    data,
    options?.skill || 'auto',
    options?.userPromptHint || ''
  );

  const baseRole = `Bạn tên là "${companionName}" — người bạn đồng hành AI cá nhân duy nhất, tỉnh táo, chân thành và bám sát thực tế của ${
    data.profile.userName || userCall
  }.
Cách xưng hô bắt buộc: xưng là "${aiSelf}" và gọi người dùng là "${userCall}".

${STRICT_GROUNDING_CONSTITUTION}

${skillsBlock}

Định dạng trình bày:
- Ngôn ngữ tiếng Việt đời thường, tự nhiên, ấm áp nhưng khúc chiết, thực tế, dễ áp dụng ngay.
- Trình bày thoáng mắt bằng Markdown (in đậm ý cốt lõi, gạch đầu dòng rõ ràng).`;

  if (!shareContext) {
    return `${baseRole}\n\n(Trạng thái dữ liệu: Hiện người dùng đang tắt đính kèm hồ sơ tự động — chỉ trả lời dựa trên nội dung tin nhắn hiện tại, không suy đoán số liệu cũ.)`;
  }

  return `${baseRole}\n\n=== DỮ LIỆU THỰC TẾ ĐÃ XÁC THỰC CỦA ${userCall.toUpperCase()} (Hôm nay: ${getTodayStr()}) ===\n${buildPersonalContextSummary(
    data
  )}`;
}

export async function sendAIMessage(params: {
  messages: Pick<ChatMessage, 'role' | 'content'>[];
  systemPrompt: string;
  aiConfig: AIProviderConfig;
  temperature?: number;
}): Promise<string> {
  const { messages, systemPrompt, aiConfig, temperature = 0.42 } = params;
  const providerId = aiConfig.activeProvider;
  const providerSetting = aiConfig.providers[providerId];
  const meta = AI_PROVIDERS_META[providerId];

  const apiKey = providerSetting?.apiKey?.trim();
  const model = providerSetting?.model?.trim() || meta.defaultModel;

  if (!apiKey) {
    throw new Error(
      `Chưa có API Key cho ${meta.name}. Bạn hãy vào mục "Cài đặt" để dán API Key miễn phí trước nhé!`
    );
  }

  if (providerId === 'gemini') {
    const cleanModel = model.replace(/^models\//, '');
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const callGeminiModel = async (targetModel: string) => {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        targetModel
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents,
          generationConfig: {
            temperature,
            topP: 0.9,
            // Để 8192 token vì các dòng Gemini 4 / 3.8 dùng chung hạn mức này cho cả suy luận ngầm (thinking) lẫn câu trả lời hiển thị
            maxOutputTokens: 8192,
          },
        }),
      });
    };

    let response = await callGeminiModel(cleanModel);

    // Tự động phục hồi thông minh: Nếu model bị ngừng hỗ trợ (404), tự động hỏi Google danh sách model sống mới nhất và gọi lại ngay
    if (response.status === 404) {
      try {
        const liveModels = await fetchLiveModelsFromProvider('gemini', apiKey);
        const fallbackModel = liveModels.find((m) => m.value !== cleanModel)?.value;
        if (fallbackModel) {
          response = await callGeminiModel(fallbackModel);
        }
      } catch {
        // Nếu không quét được, trả về thông báo lỗi gốc bên dưới
      }
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const msg = errBody?.error?.message || `Mã lỗi HTTP ${response.status}`;
      throw new Error(
        `Lỗi kết nối Google Gemini: ${msg}. (Mẹo: Vào Cài đặt bấm "Quét Model trực tiếp từ API" để lấy đúng model mới nhất cho Key của bạn)`
      );
    }

    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string; thought?: boolean }) => (p.thought ? '' : p.text || ''))
      .join('')
      .trim();

    if (!text) {
      throw new Error('Gemini không trả về nội dung phản hồi. Vui lòng thử lại.');
    }
    return text;
  }

  // Chuẩn OpenAI-compatible cho Groq, OpenRouter và OpenAI
  let baseUrl = 'https://api.openai.com/v1';
  if (providerId === 'groq') {
    baseUrl = 'https://api.groq.com/openai/v1';
  } else if (providerId === 'openrouter') {
    baseUrl = 'https://openrouter.ai/api/v1';
  } else if (providerSetting.baseUrl?.trim()) {
    baseUrl = providerSetting.baseUrl.trim().replace(/\/+$/, '');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  if (providerId === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'Tam An Personal AI Companion';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature,
      top_p: 0.9,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const msg = errBody?.error?.message || `Mã lỗi HTTP ${response.status}`;
    throw new Error(`Lỗi kết nối ${meta.name}: ${msg}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error(`${meta.name} không trả về nội dung. Vui lòng kiểm tra tên Model.`);
  }
  return content;
}

export async function generateDailyBriefing(data: AppData, aiConfig: AIProviderConfig): Promise<string> {
  const systemPrompt = buildHolisticSystemPrompt(data, true, {
    skill: 'auto',
    userPromptHint: 'nhịp sinh học giấc ngủ mục tiêu thói quen hôm nay',
  });
  return sendAIMessage({
    systemPrompt,
    aiConfig,
    temperature: 0.38,
    messages: [
      {
        role: 'user',
        content:
          'Chỉ dựa trên dữ liệu thực tế đã ghi nhận của mình (nếu chưa có bản ghi nào thì nói thẳng là chưa có dữ liệu hôm nay và hướng dẫn khởi đầu nhẹ nhàng), hãy gửi thông điệp đồng hành ngắn gọn (100-150 từ): 1 nhận xét thực tế về trạng thái hiện tại, 1 lưu ý sức khoẻ/tâm lý thiết thực và 1 trọng tâm vừa sức nhất cho mục tiêu hôm nay.',
      },
    ],
  });
}

export async function analyzeDailyCheckin(
  log: DailyLog,
  data: AppData,
  aiConfig: AIProviderConfig
): Promise<string> {
  const systemPrompt = buildHolisticSystemPrompt(data, true, {
    skill: 'auto',
    userPromptHint: `${log.emotions.join(' ')} ${(log.triggers || []).join(' ')} ${log.journal} ngủ năng lượng`,
  });
  const habitRatio =
    data.habits.length > 0
      ? data.habits.filter((h) => h.completedDates.includes(log.date)).length / data.habits.length
      : 0.5;
  const balance = computeLifeBalanceScore(log, habitRatio);

  const prompt = `Mình vừa ghi nhận nhật ký tâm sinh lý ngày ${log.date} (Điểm Cân Bằng tổng hợp: ${balance}/100):
- Tâm trạng: ${log.mood}/10 | Căng thẳng: ${log.stress}/10 | Cảm xúc: ${log.emotions.join(', ') || 'Chưa chọn'}
${log.triggers && log.triggers.length > 0 ? `- Tác nhân ảnh hưởng hôm nay: ${log.triggers.join(', ')}\n` : ''}- Giấc ngủ: ${log.sleepHours} giờ (Chất lượng ${log.sleepQuality}/5${
    log.bedtimeSlot ? `, đi ngủ lúc ${BEDTIME_LABELS[log.bedtimeSlot]}` : ''
  }) | Năng lượng: ${log.energy}/10 | Tập trung sâu: ${log.focusHours ?? 0}h
- Vận động: ${log.exerciseMinutes} phút${log.exerciseType ? ` (${log.exerciseType})` : ''} | Nước uống: ${log.waterGlasses} cốc
${log.physicalNotes ? `- Ghi chú cơ thể: ${log.physicalNotes}\n` : ''}${
    log.gratitude ? `- Điều biết ơn: ${log.gratitude}\n` : ''
  }- Nhật ký suy ngẫm: "${log.journal || 'Không ghi chú thêm'}"

Chỉ dựa sát vào dữ liệu thật bên trên (không suy diễn thêm sự kiện ngoài lề), hãy phản hồi tích cực thực tế trong khoảng 150-210 từ theo 3 ý:
1. **Ghi nhận & Giải mã thực tế**: Thấu cảm cảm xúc hôm nay và chỉ rõ mối liên hệ thực tế với giấc ngủ / tác nhân / thể trạng.
2. **Điểm tựa & Điều chỉnh nhỏ**: Ghi nhận 1 điểm sáng có thật hôm nay và gợi ý 1 điều chỉnh sinh hoạt/tâm lý làm được ngay.
3. **Nhịp mục tiêu ngày mai**: Khuyên mức độ nỗ lực vừa vặn dựa trên Điểm Cân Bằng ${balance}/100.`;

  return sendAIMessage({
    systemPrompt,
    aiConfig,
    temperature: 0.38,
    messages: [{ role: 'user', content: prompt }],
  });
}

export async function suggestGoalMilestonesWithAI(
  goal: Pick<Goal, 'title' | 'category' | 'whyItMatters' | 'milestones'>,
  data: AppData,
  aiConfig: AIProviderConfig
): Promise<string[]> {
  const systemPrompt = buildHolisticSystemPrompt(data, true, { skill: 'micro_goals' });
  const existingText =
    goal.milestones.length > 0
      ? `Các bước đã có (không lặp lại): ${goal.milestones.map((m) => m.title).join('; ')}`
      : '';

  const prompt = `Dựa sát trên thể trạng, tính cách và bối cảnh thực tế của mình, hãy chia mục tiêu "${goal.title}" (Lý do: "${goal.whyItMatters || 'Phát triển bản thân'}") thành ĐÚNG 4 bước hành động nhỏ (milestones) thực tế, cụ thể, đo lường được, dễ bắt đầu.
${existingText}
YÊU CẦU ĐỊNH DẠNG BẮT BUỘC: Chỉ trả về đúng 4 dòng, mỗi dòng bắt đầu bằng dấu "- ", không viết lời mở đầu hay kết luận.`;

  const raw = await sendAIMessage({
    systemPrompt,
    aiConfig,
    temperature: 0.32,
    messages: [{ role: 'user', content: prompt }],
  });

  return raw
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').replace(/\*\*/g, '').trim())
    .filter((line) => line.length >= 4 && line.length <= 140)
    .slice(0, 4);
}

export async function coachGoalWithAI(
  goal: Goal,
  data: AppData,
  aiConfig: AIProviderConfig
): Promise<string> {
  const systemPrompt = buildHolisticSystemPrompt(data, true, { skill: 'micro_goals' });
  const mode = goal.trackingType || 'streak_days';
  const streakStats = calculateGoalStreakStats(goal.checkInDates, goal.slipDates);

  let trackingSummary = '';
  if (mode === 'streak_days') {
    trackingSummary = `- Hình thức đo lường: Giữ chuỗi kỷ luật theo ngày (Đích: ${
      goal.targetDays || 30
    } ngày)
- Kết quả thực tế: Đã giữ vững ${streakStats.totalCleanDays}/${
      goal.targetDays || 30
    } ngày | Chuỗi liên tiếp hiện tại: ${streakStats.currentStreak} ngày | Kỷ lục tốt nhất: ${
      streakStats.bestStreak
    } ngày | Số lần ghi nhận vấp ngã: ${(goal.slipDates || []).length} lần`;
  } else if (mode === 'numeric') {
    trackingSummary = `- Hình thức đo lường: Định lượng con số -> Hiện đạt ${
      goal.currentValue || 0
    } / ${goal.targetValue || 100} ${goal.unitLabel || ''}`;
  } else {
    trackingSummary = `- Hình thức đo lường: Hoàn thành theo cột mốc (${
      goal.milestones.filter((m) => m.completed).length
    }/${goal.milestones.length} bước hoàn thành)`;
  }

  const milestonesText =
    goal.milestones.length > 0
      ? goal.milestones.map((m) => `${m.completed ? '[x]' : '[ ]'} ${m.title}`).join('\n')
      : 'Chưa liệt kê bước phụ';

  const prompt = `Hãy lập **Chiến Lược Đồng Hành Thực Tế & Toàn Diện** giúp mình chinh phục mục tiêu này:
- Tên mục tiêu: "${goal.title}" (Nhóm: ${goal.category})
- Lý do cốt lõi mình quyết tâm thực hiện: "${goal.whyItMatters || 'Muốn làm chủ bản thân và tiến bộ mỗi ngày'}"
${goal.targetDate ? `- Ngày đích hướng tới: ${goal.targetDate}\n` : ''}${trackingSummary}
- Các bước hành động đi kèm:
${milestonesText}

YÊU CẦU QUAN TRỌNG: Viết ĐẦY ĐỦ TRỌN VẸN CẢ 4 PHẦN bên dưới (súc tích, sắc bén, khoảng 320–450 từ, tuyệt đối không bỏ dở câu, bám sát hồ sơ tuổi, thể trạng, tính cách và bối cảnh sống thật của mình):
### 1. Giải mã thẳng thắn bản chất & Tính khả thi
Chỉ rõ gốc rễ tâm-sinh-lý của mục tiêu này với riêng mình và cách đặt kỳ vọng đúng để không bị áp lực ngược.
### 2. Thiết kế môi trường & Hành động thay thế hàng ngày
Đưa ra 3 quy tắc thực chiến theo công thức: **"Khi gặp tín hiệu kích hoạt [X] -> Lập tức làm [Hành động Y trong 2-5 phút]"**.
### 3. Lộ trình 3 chặng rõ ràng để ghi nhận mỗi ngày
Chia chặng ngắn hạn (3–7 ngày đầu) -> trung hạn -> về đích để mình dễ đánh giá từng ngày.
### 4. Phác đồ bảo vệ tâm lý khi chao đảo hoặc lỡ vấp ngã
Cách ngắt ngay hiệu ứng sụp đổ dây chuyền (chaser effect) và quay lại quỹ đạo ngay trong ngày hôm sau.`;

  return sendAIMessage({
    systemPrompt,
    aiConfig,
    temperature: 0.38,
    messages: [{ role: 'user', content: prompt }],
  });
}

export async function generatePeriodInsightReport(
  horizon: TimeHorizon,
  data: AppData,
  aiConfig: AIProviderConfig
): Promise<string> {
  const horizonLabels: Record<TimeHorizon, string> = {
    '7d': '7 ngày qua',
    '30d': '30 ngày (1 tháng) qua',
    '90d': '90 ngày (3 tháng) qua',
    '365d': '365 ngày (1 năm) qua',
    all: 'Toàn bộ hành trình tích luỹ nhiều năm',
  };

  const result = analyzeByHorizon(data.dailyLogs, horizon, data.habits);
  const label = horizonLabels[horizon];

  let compressedSeries = 'Chưa có nhiều bản ghi trong giai đoạn này.';
  if (result) {
    const bucketLines = result.chartSeries
      .filter((b) => b.count > 0)
      .map(
        (b) =>
          `• ${b.tooltipTitle}: Điểm Cân Bằng ${b.diemCanBang}/100, Mood ${b.tamTrang}/10, NL ${b.nangLuong}/10, Stress ${b.cangThang}/10, Ngủ ${b.giacNgu}h, Tập TB ${b.vanDong}p/ngày`
      )
      .join('\n');

    const corrLines =
      result.correlations.length > 0
        ? '\nHệ số tương quan thống kê:\n' +
          result.correlations.map((c) => `• ${c.pairLabel} (r=${c.r}): ${c.summary}`).join('\n')
        : '';

    const triggerLines =
      result.triggerImpacts.length > 0
        ? '\nTác nhân thực tế ảnh hưởng tâm trạng:\n' +
          result.triggerImpacts
            .map(
              (t) =>
                `• ${t.trigger} (${t.occurrences} ngày): ${
                  t.moodDelta > 0 ? `+${t.moodDelta}` : t.moodDelta
                } điểm tâm trạng`
            )
            .join('\n')
        : '';

    compressedSeries = `Tổng số ngày ghi nhận: ${result.logsCount} ngày (${result.granularityLabel})
Trung bình toàn kỳ: Điểm Cân Bằng ${result.avgBalance}/100 | Mood ${result.avgMood}/10 | Năng lượng ${result.avgEnergy}/10 | Ngủ ${result.avgSleep}h (Thức khuya sau 00:30: ${result.lateNightCount} đêm) | Stress ${result.avgStress}/10 | Tổng vận động ${result.totalExerciseHours} giờ.
Chuỗi diễn biến theo mốc thời gian:
${bucketLines}${corrLines}${triggerLines}`;
  }

  const systemPrompt = buildHolisticSystemPrompt(data, true, { skill: 'data_detective' });
  const prompt = `Hãy lập một **Báo Cáo Phân Tích Dữ Liệu Thực Tế (${label})** chuẩn xác, không bịa đặt số liệu.
Dữ liệu thống kê thực tế:
${compressedSeries}

Yêu cầu nghiêm ngặt: Chỉ phân tích dựa trên đúng các con số bên trên (nếu số ngày ghi nhận ít, hãy nêu rõ giới hạn cỡ mẫu). Trình bày 4 phần rõ ràng:
1. **Bức tranh thực tế & Sự chuyển dịch**: Điểm tiến bộ có thật và chỉ số cần lưu tâm nhất.
2. **Quy luật ngầm & Tác nhân gốc rễ**: Đọc từ hệ số tương quan và bảng tác nhân thực tế của mình.
3. **Đánh giá nhịp độ Mục tiêu & Sức bền**: Sự cân bằng giữa tiến độ mục tiêu và mức phục hồi sinh học.
4. **3 Hành động đòn bẩy thực tế nhất cho chặng tới**: Cụ thể, khả thi, tích cực thực tế.`;

  return sendAIMessage({
    systemPrompt,
    aiConfig,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  });
}
