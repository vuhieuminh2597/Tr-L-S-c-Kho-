import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { sanitizeAIConfigModels, verifyProviderHandshake } from '../services/aiService';
import { pullDataFromGist, syncTwoWayWithGist } from '../services/gistSyncService';
import {
  computeStorageDiagnostics,
  loadAppDataFromStorage,
  requestPersistentStorage,
  saveAppDataToStorage,
} from '../services/storageEngine';
import {
  AIConnectionState,
  AIInsightReport,
  AIProviderConfig,
  AppData,
  ChatThread,
  DailyLog,
  GistSyncConfig,
  Goal,
  Habit,
  NavTab,
  StorageDiagnostics,
  UserProfile,
} from '../types';
import {
  normalizeAppData,
  smartMergeAppData,
  syncCompanionNameInSystemTexts,
} from '../utils/dataNormalizer';
import { getTodayStr } from '../utils/dateUtils';
import {
  createDemoSampleData,
  createInitialCleanData,
  createLongTermDemoData,
} from '../utils/sampleData';

const STORAGE_DATA_FALLBACK_KEY = 'tam_an_app_data_v1';
const STORAGE_AI_KEY = 'tam_an_ai_config_v1';
const STORAGE_GIST_KEY = 'tam_an_gist_config_v1';

const DEFAULT_AI_CONFIG: AIProviderConfig = {
  activeProvider: 'gemini',
  sharePersonalContext: true,
  providers: {
    gemini: { apiKey: '', model: 'gemini-3.8-flash' },
    groq: { apiKey: '', model: 'openai/gpt-oss-120b' },
    openrouter: { apiKey: '', model: 'openrouter/free' },
    openai: { apiKey: '', model: 'gpt-6-luna', baseUrl: 'https://api.openai.com/v1' },
  },
};

const DEFAULT_GIST_CONFIG: GistSyncConfig = {
  githubToken: '',
  gistId: '',
  autoSync: false,
  encryptionPassphrase: '',
};

interface AppContextValue {
  data: AppData;
  isHydrated: boolean;
  storageDiag: StorageDiagnostics | null;
  aiConfig: AIProviderConfig;
  gistConfig: GistSyncConfig;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncMessage: string;
  hasActiveApiKey: boolean;
  aiConn: AIConnectionState;
  verifyAIConnectionNow: () => Promise<AIConnectionState>;
  // Data mutators
  toggleTheme: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  upsertDailyLog: (log: DailyLog) => void;
  saveGoals: (goals: Goal[], deletedId?: string) => void;
  saveHabits: (habits: Habit[], deletedId?: string) => void;
  toggleHabitDate: (habitId: string, dateStr?: string) => void;
  saveChatThreads: (threads: ChatThread[], deletedId?: string) => void;
  addInsightReport: (report: AIInsightReport) => void;
  deleteInsightReport: (reportId: string) => void;
  setDailyBriefing: (date: string, content: string) => void;
  // Config mutators
  updateAIConfig: (next: AIProviderConfig) => void;
  updateGistConfig: (next: GistSyncConfig) => void;
  // Sync & Backup actions
  syncToCloudNow: () => Promise<void>;
  restoreFromCloudNow: () => Promise<void>;
  importJsonData: (imported: AppData) => void;
  loadSampleData: () => void;
  loadLongTermSampleData: (days?: number) => void;
  resetAllData: () => void;
  // Quick helper to start a chat prompt from anywhere
  pendingChatPrompt: string | null;
  triggerChatWithPrompt: (prompt: string) => void;
  clearPendingChatPrompt: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DATA_FALLBACK_KEY);
      if (saved) {
        return normalizeAppData(JSON.parse(saved) as Partial<AppData>);
      }
    } catch {
      // ignore
    }
    return createInitialCleanData();
  });

  const [isHydrated, setIsHydrated] = useState(false);
  const [storageDiag, setStorageDiag] = useState<StorageDiagnostics | null>(null);

  const [aiConfig, setAiConfigState] = useState<AIProviderConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AI_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AIProviderConfig;
        const merged = sanitizeAIConfigModels({
          ...DEFAULT_AI_CONFIG,
          ...parsed,
          providers: {
            ...DEFAULT_AI_CONFIG.providers,
            ...(parsed.providers || {}),
          },
        });
        localStorage.setItem(STORAGE_AI_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch {
      // ignore
    }
    return DEFAULT_AI_CONFIG;
  });

  const [gistConfig, setGistConfigState] = useState<GistSyncConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_GIST_KEY);
      if (saved) {
        return { ...DEFAULT_GIST_CONFIG, ...(JSON.parse(saved) as GistSyncConfig) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_GIST_CONFIG;
  });

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | null>(null);
  const [aiConn, setAiConn] = useState<AIConnectionState>(() => {
    const active = aiConfig.activeProvider;
    const hasKey = Boolean(aiConfig.providers[active]?.apiKey?.trim());
    return {
      status: hasKey ? 'connecting' : 'unconfigured',
      provider: active,
      message: hasKey ? 'Đang tự động kết nối API...' : 'Chưa gắn API Key',
    };
  });

  const latestAiConfigRef = useRef<AIProviderConfig>(aiConfig);
  latestAiConfigRef.current = aiConfig;

  const latestDataRef = useRef<AppData>(data);
  latestDataRef.current = data;

  const latestGistRef = useRef<GistSyncConfig>(gistConfig);
  latestGistRef.current = gistConfig;

  const idbWriteTimerRef = useRef<number | null>(null);
  const autoSyncTimerRef = useRef<number | null>(null);
  // Theo dõi phiên bản dữ liệu thay đổi từ người dùng để tránh vòng lặp tự đồng bộ vô tận
  const localMutationTickRef = useRef<number>(0);
  const [mutationTick, setMutationTick] = useState<number>(0);

  // Nạp dữ liệu từ IndexedDB + Tự động hợp nhất từ Gist khi mở ứng dụng (nếu bật AutoSync)
  useEffect(() => {
    let mounted = true;
    (async () => {
      await requestPersistentStorage();
      const stored = await loadAppDataFromStorage();
      let initialData = stored ? normalizeAppData(stored) : latestDataRef.current;

      if (mounted && stored) {
        setData(initialData);
      }
      if (mounted) {
        setIsHydrated(true);
      }

      // Nếu người dùng đã bật Tự động đồng bộ & có sẵn Gist ID -> tự kéo dữ liệu mới nhất từ thiết bị kia về hợp nhất ngay khi mở web
      const gCfg = latestGistRef.current;
      if (gCfg.autoSync && gCfg.githubToken.trim() && gCfg.gistId.trim()) {
        try {
          if (mounted) setSyncStatus('syncing');
          const remoteData = await pullDataFromGist(gCfg);
          const merged = smartMergeAppData(initialData, remoteData);
          if (mounted) {
            setData(merged);
            await saveAppDataToStorage(merged);
            setSyncStatus('success');
            setSyncMessage('Đã đồng bộ dữ liệu mới nhất từ đám mây');
          }
        } catch {
          if (mounted) setSyncStatus('idle');
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Ghi chốt xuống bộ nhớ ngay khi chuyển ứng dụng hoặc vuốt thoát trên iPhone 17
  useEffect(() => {
    const flushImmediately = () => {
      if (idbWriteTimerRef.current) {
        window.clearTimeout(idbWriteTimerRef.current);
        idbWriteTimerRef.current = null;
      }
      void saveAppDataToStorage(latestDataRef.current);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushImmediately();
      }
    };

    window.addEventListener('pagehide', flushImmediately);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushImmediately);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Áp dụng Dark Mode + màu thanh trạng thái Safari iOS
  useEffect(() => {
    const root = document.documentElement;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (data.theme === 'dark') {
      root.classList.add('dark');
      metaTheme?.setAttribute('content', '#020617');
    } else {
      root.classList.remove('dark');
      metaTheme?.setAttribute('content', '#ffffff');
    }
  }, [data.theme]);

  // Đồng bộ tự động tiêu đề Tab trình duyệt theo tên Người bạn AI
  useEffect(() => {
    const activeCompanion = data.profile.companionName?.trim() || 'Tâm An';
    document.title = `${activeCompanion} — Trợ Lý Sức Khoẻ, Tâm Lý & Đồng Hành Mục Tiêu`;
  }, [data.profile.companionName]);

  // Ghi bất đồng bộ sang IndexedDB (debounce 250ms)
  useEffect(() => {
    if (!isHydrated) return;

    if (idbWriteTimerRef.current) {
      window.clearTimeout(idbWriteTimerRef.current);
    }

    idbWriteTimerRef.current = window.setTimeout(async () => {
      await saveAppDataToStorage(data);
      const diag = await computeStorageDiagnostics(data);
      setStorageDiag(diag);
    }, 250);

    return () => {
      if (idbWriteTimerRef.current) {
        window.clearTimeout(idbWriteTimerRef.current);
      }
    };
  }, [data, isHydrated]);

  const updateAIConfig = useCallback((next: AIProviderConfig) => {
    setAiConfigState(next);
    localStorage.setItem(STORAGE_AI_KEY, JSON.stringify(next));
  }, []);

  const verifyAIConnectionNow = useCallback(async (): Promise<AIConnectionState> => {
    const cfg = latestAiConfigRef.current;
    const active = cfg.activeProvider;
    const key = cfg.providers[active]?.apiKey?.trim();
    if (!key) {
      const unconf: AIConnectionState = {
        status: 'unconfigured',
        provider: active,
        message: 'Chưa gắn API Key',
      };
      setAiConn(unconf);
      return unconf;
    }

    setAiConn({
      status: 'connecting',
      provider: active,
      message: 'Đang xác thực kết nối máy chủ AI...',
    });

    const res = await verifyProviderHandshake(cfg);
    setAiConn(res.state);

    // Nếu model cũ không có trên Key nhưng tìm được model sống thay thế, tự động cập nhật luôn
    if (
      res.state.status === 'connected' &&
      res.resolvedModel &&
      res.resolvedModel !== cfg.providers[active]?.model
    ) {
      const healed: AIProviderConfig = {
        ...cfg,
        providers: {
          ...cfg.providers,
          [active]: {
            ...cfg.providers[active],
            model: res.resolvedModel,
          },
        },
      };
      setAiConfigState(healed);
      localStorage.setItem(STORAGE_AI_KEY, JSON.stringify(healed));
    }

    return res.state;
  }, []);

  // TỰ ĐỘNG CONNECT & XÁC THỰC API NGAY KHI MỞ WEB (và mỗi khi đổi Provider / sửa API Key)
  const activeKeySignature = `${aiConfig.activeProvider}:${
    aiConfig.providers[aiConfig.activeProvider]?.apiKey || ''
  }:${aiConfig.providers[aiConfig.activeProvider]?.baseUrl || ''}`;

  useEffect(() => {
    const active = aiConfig.activeProvider;
    const hasKey = Boolean(aiConfig.providers[active]?.apiKey?.trim());
    if (!hasKey) {
      setAiConn({
        status: 'unconfigured',
        provider: active,
        message: 'Chưa gắn API Key',
      });
      return;
    }

    setAiConn((prev) => ({
      ...prev,
      status: 'connecting',
      provider: active,
      message: 'Đang tự động kết nối API...',
    }));

    const timer = window.setTimeout(() => {
      void verifyAIConnectionNow();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [activeKeySignature, aiConfig.activeProvider, verifyAIConnectionNow]);

  const updateGistConfig = useCallback((next: GistSyncConfig) => {
    setGistConfigState(next);
    localStorage.setItem(STORAGE_GIST_KEY, JSON.stringify(next));
  }, []);

  // Tự động đồng bộ 2 chiều lên Gist CHỈ KHI có thay đổi dữ liệu thực từ người dùng (mutationTick > 0)
  useEffect(() => {
    if (
      !isHydrated ||
      mutationTick === 0 ||
      !gistConfig.autoSync ||
      !gistConfig.githubToken.trim()
    ) {
      return;
    }

    if (autoSyncTimerRef.current) {
      window.clearTimeout(autoSyncTimerRef.current);
    }

    autoSyncTimerRef.current = window.setTimeout(async () => {
      try {
        setSyncStatus('syncing');
        const res = await syncTwoWayWithGist(latestDataRef.current, latestGistRef.current);
        setData(res.mergedData);
        const updatedGist: GistSyncConfig = {
          ...latestGistRef.current,
          gistId: res.gistId,
          lastSyncedAt: res.syncedAt,
        };
        setGistConfigState(updatedGist);
        localStorage.setItem(STORAGE_GIST_KEY, JSON.stringify(updatedGist));
        setSyncStatus('success');
        setSyncMessage('Đã tự động hợp nhất & đồng bộ đám mây');
      } catch (err) {
        setSyncStatus('error');
        setSyncMessage(err instanceof Error ? err.message : 'Lỗi tự động đồng bộ');
      }
    }, 4000);

    return () => {
      if (autoSyncTimerRef.current) {
        window.clearTimeout(autoSyncTimerRef.current);
      }
    };
  }, [mutationTick, gistConfig.autoSync, gistConfig.githubToken, isHydrated]);

  const touchData = useCallback(
    (updater: (prev: AppData) => AppData, deletedId?: string) => {
      setData((prev) => {
        const next = updater(prev);
        const deletedIds = deletedId
          ? Array.from(new Set([...(next.deletedIds || []), deletedId])).slice(-500)
          : next.deletedIds || [];
        return {
          ...next,
          deletedIds,
          updatedAt: new Date().toISOString(),
        };
      });
      localMutationTickRef.current += 1;
      setMutationTick(localMutationTickRef.current);
    },
    []
  );

  const toggleTheme = useCallback(() => {
    touchData((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  }, [touchData]);

  const updateProfile = useCallback(
    (profilePatch: Partial<UserProfile>) => {
      touchData((prev) =>
        syncCompanionNameInSystemTexts({
          ...prev,
          profile: { ...prev.profile, ...profilePatch },
        })
      );
    },
    [touchData]
  );

  const upsertDailyLog = useCallback(
    (log: DailyLog) => {
      touchData((prev) => {
        // Nếu người dùng nhập cân nặng mới trong ngày gần nhất, tự động đồng bộ vào Hồ sơ cá nhân để BMI luôn chuẩn
        const allDates = Object.keys(prev.dailyLogs).sort();
        const newestDate = allDates.length > 0 ? allDates[allDates.length - 1] : log.date;
        const shouldSyncWeight =
          log.weightKg && log.weightKg > 15 && log.date >= newestDate;

        return {
          ...prev,
          profile: shouldSyncWeight
            ? { ...prev.profile, weightKg: log.weightKg }
            : prev.profile,
          dailyLogs: {
            ...prev.dailyLogs,
            [log.date]: {
              ...log,
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
    },
    [touchData]
  );

  const saveGoals = useCallback(
    (goals: Goal[], deletedId?: string) => {
      touchData((prev) => ({ ...prev, goals }), deletedId);
    },
    [touchData]
  );

  const saveHabits = useCallback(
    (habits: Habit[], deletedId?: string) => {
      touchData((prev) => ({ ...prev, habits }), deletedId);
    },
    [touchData]
  );

  const toggleHabitDate = useCallback(
    (habitId: string, dateStr = getTodayStr()) => {
      touchData((prev) => ({
        ...prev,
        habits: prev.habits.map((h) => {
          if (h.id !== habitId) return h;
          const exists = h.completedDates.includes(dateStr);
          const completedDates = exists
            ? h.completedDates.filter((d) => d !== dateStr)
            : [...h.completedDates, dateStr].sort();
          return { ...h, completedDates };
        }),
      }));
    },
    [touchData]
  );

  const saveChatThreads = useCallback(
    (chatThreads: ChatThread[], deletedId?: string) => {
      touchData((prev) => ({ ...prev, chatThreads }), deletedId);
    },
    [touchData]
  );

  const addInsightReport = useCallback(
    (report: AIInsightReport) => {
      touchData((prev) => ({
        ...prev,
        insightReports: [report, ...prev.insightReports],
      }));
    },
    [touchData]
  );

  const deleteInsightReport = useCallback(
    (reportId: string) => {
      touchData(
        (prev) => ({
          ...prev,
          insightReports: prev.insightReports.filter((r) => r.id !== reportId),
        }),
        reportId
      );
    },
    [touchData]
  );

  const setDailyBriefing = useCallback(
    (date: string, content: string) => {
      touchData((prev) => ({
        ...prev,
        dailyBriefing: { date, content },
      }));
    },
    [touchData]
  );

  const syncToCloudNow = useCallback(async () => {
    setSyncStatus('syncing');
    setSyncMessage('Đang hợp nhất & đồng bộ 2 chiều với GitHub Gist...');
    try {
      const res = await syncTwoWayWithGist(latestDataRef.current, latestGistRef.current);
      setData(res.mergedData);
      await saveAppDataToStorage(res.mergedData);
      const nextGist: GistSyncConfig = {
        ...latestGistRef.current,
        gistId: res.gistId,
        lastSyncedAt: res.syncedAt,
      };
      updateGistConfig(nextGist);
      setSyncStatus('success');
      setSyncMessage('Đồng bộ 2 chiều thành công (không ghi đè mất dữ liệu)!');
    } catch (err) {
      setSyncStatus('error');
      const msg = err instanceof Error ? err.message : 'Đồng bộ thất bại';
      setSyncMessage(msg);
      throw err;
    }
  }, [updateGistConfig]);

  const restoreFromCloudNow = useCallback(async () => {
    setSyncStatus('syncing');
    setSyncMessage('Đang tải & hợp nhất dữ liệu từ GitHub Secret Gist...');
    try {
      const remoteData = await pullDataFromGist(latestGistRef.current);
      const merged = smartMergeAppData(latestDataRef.current, remoteData);
      setData(merged);
      await saveAppDataToStorage(merged);
      const nextGist: GistSyncConfig = {
        ...latestGistRef.current,
        lastSyncedAt: new Date().toISOString(),
      };
      updateGistConfig(nextGist);
      setSyncStatus('success');
      setSyncMessage('Đã tải & hợp nhất dữ liệu từ Gist thành công!');
    } catch (err) {
      setSyncStatus('error');
      const msg = err instanceof Error ? err.message : 'Tải dữ liệu thất bại';
      setSyncMessage(msg);
      throw err;
    }
  }, [updateGistConfig]);

  const importJsonData = useCallback((imported: AppData) => {
    const merged = smartMergeAppData(latestDataRef.current, imported);
    setData(merged);
    void saveAppDataToStorage(merged);
  }, []);

  const loadSampleData = useCallback(() => {
    touchData((prev) => createDemoSampleData(prev.theme, prev.profile));
  }, [touchData]);

  const loadLongTermSampleData = useCallback(
    (days = 180) => {
      touchData((prev) => createLongTermDemoData(days, prev.theme, prev.profile));
    },
    [touchData]
  );

  const resetAllData = useCallback(() => {
    localStorage.removeItem(STORAGE_DATA_FALLBACK_KEY);
    setData((prev) => ({
      ...createInitialCleanData(prev.profile),
      theme: prev.theme,
    }));
  }, []);

  const triggerChatWithPrompt = useCallback((prompt: string) => {
    setPendingChatPrompt(prompt);
    setActiveTab('chat');
  }, []);

  const clearPendingChatPrompt = useCallback(() => {
    setPendingChatPrompt(null);
  }, []);

  const hasActiveApiKey = Boolean(
    aiConfig.providers[aiConfig.activeProvider]?.apiKey?.trim()
  );

  return (
    <AppContext.Provider
      value={{
        data,
        isHydrated,
        storageDiag,
        aiConfig,
        gistConfig,
        activeTab,
        setActiveTab,
        syncStatus,
        syncMessage,
        hasActiveApiKey,
        aiConn,
        verifyAIConnectionNow,
        toggleTheme,
        updateProfile,
        upsertDailyLog,
        saveGoals,
        saveHabits,
        toggleHabitDate,
        saveChatThreads,
        addInsightReport,
        deleteInsightReport,
        setDailyBriefing,
        updateAIConfig,
        updateGistConfig,
        syncToCloudNow,
        restoreFromCloudNow,
        importJsonData,
        loadSampleData,
        loadLongTermSampleData,
        resetAllData,
        pendingChatPrompt,
        triggerChatWithPrompt,
        clearPendingChatPrompt,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp phải được sử dụng bên trong AppProvider');
  }
  return ctx;
}
