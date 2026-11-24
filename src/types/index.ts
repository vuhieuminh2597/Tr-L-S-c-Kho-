export type AIProviderId = 'gemini' | 'groq' | 'openrouter' | 'openai';

export type AIConnectionStatus = 'unconfigured' | 'connecting' | 'connected' | 'error';

export interface AIConnectionState {
  status: AIConnectionStatus;
  provider: AIProviderId;
  verifiedModel?: string;
  latencyMs?: number;
  message?: string;
  verifiedAt?: string;
}

export interface SingleProviderSetting {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface AIProviderConfig {
  activeProvider: AIProviderId;
  sharePersonalContext: boolean;
  providers: Record<AIProviderId, SingleProviderSetting>;
}

export interface GistSyncConfig {
  githubToken: string;
  gistId: string;
  autoSync: boolean;
  encryptionPassphrase: string;
  lastSyncedAt?: string;
}

export type PronounStyle = 'minh_ban' | 'to_cau' | 'anh_em' | 'em_anh';

export type AISkillId =
  | 'auto'
  | 'bio_rhythm'
  | 'cbt_mindfulness'
  | 'micro_goals'
  | 'data_detective'
  | 'burnout_shield'
  | 'honest_companion';

export interface UserProfile {
  userName: string;
  companionName: string;
  pronounStyle: PronounStyle;
  bioOrFocus: string;
  age?: number;
  birthYear?: number;
  heightCm?: number;
  weightKg?: number;
  nationality?: string;
  personality?: string;
  enabledSkills?: Exclude<AISkillId, 'auto'>[];
  customAIRules?: string; // Nguyên tắc thực tế riêng người dùng dặn AI (VD: đau gối không chạy bộ, ưu tiên ngắn gọn...)
}

export type BedtimeSlot = 'before_2230' | '2230_2330' | '2330_0030' | 'after_0030';

export interface DailyLog {
  date: string; // YYYY-MM-DD
  // Tâm lý & tinh thần
  mood: number; // 1 - 10
  stress: number; // 1 - 10
  emotions: string[];
  triggers?: string[]; // Tác nhân chính ảnh hưởng tâm sinh lý trong ngày
  focusHours?: number;
  // Sinh lý & thể chất
  sleepHours: number;
  sleepQuality: number; // 1 - 5
  bedtimeSlot?: BedtimeSlot; // Khung giờ đi ngủ (nhịp sinh học Circadian)
  energy: number; // 1 - 10
  waterGlasses: number;
  exerciseMinutes: number;
  exerciseType?: string;
  weightKg?: number;
  physicalNotes?: string;
  // Nhật ký & suy ngẫm
  journal: string;
  gratitude?: string;
  aiReflection?: string;
  updatedAt: string;
}

export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
}

export type GoalCategory = 'health' | 'mind' | 'career' | 'finance' | 'personal';

export type GoalTrackingType = 'streak_days' | 'milestones' | 'numeric';

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  whyItMatters: string;
  targetDate?: string;
  trackingType?: GoalTrackingType;
  // 1. Theo dõi hành trình ngày kỷ luật / cai thói quen xấu
  targetDays?: number;
  checkInDates?: string[]; // YYYY-MM-DD giữ vững / có thực hiện
  slipDates?: string[]; // YYYY-MM-DD lỡ trượt chân (để học quy luật & tính lại chuỗi hiện tại mà không mất tổng ngày thắng)
  // 2. Theo dõi theo cột mốc công việc
  milestones: GoalMilestone[];
  // 3. Theo dõi con số định lượng cụ thể
  currentValue?: number;
  targetValue?: number;
  unitLabel?: string;
  // Tỉ lệ hoàn thành tổng hợp tự động (0 - 100)
  progress: number;
  status: 'active' | 'completed' | 'paused';
  aiAdvice?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Habit {
  id: string;
  title: string;
  icon: string;
  category: 'health' | 'mind' | 'growth';
  linkedGoalId?: string;
  completedDates: string[]; // YYYY-MM-DD[]
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface AIInsightReport {
  id: string;
  periodLabel: string;
  content: string;
  createdAt: string;
}

export interface AppData {
  version: number;
  updatedAt: string;
  theme: 'light' | 'dark';
  profile: UserProfile;
  dailyLogs: Record<string, DailyLog>;
  goals: Goal[];
  habits: Habit[];
  chatThreads: ChatThread[];
  insightReports: AIInsightReport[];
  deletedIds?: string[]; // Ngăn mục đã xoá tự khôi phục lại khi hợp nhất 2 thiết bị
  dailyBriefing?: {
    date: string;
    content: string;
  };
}

export type NavTab = 'dashboard' | 'checkin' | 'goals' | 'analytics' | 'chat' | 'settings';

export type TimeHorizon = '7d' | '30d' | '90d' | '365d' | 'all';

export interface StorageDiagnostics {
  engine: 'IndexedDB' | 'LocalStorage';
  isPersisted: boolean;
  totalDaysLogged: number;
  oldestDate: string | null;
  newestDate: string | null;
  estimatedSizeKB: number;
}
