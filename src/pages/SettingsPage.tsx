import {
  CheckCircle2,
  Cloud,
  CloudDownload,
  CloudUpload,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  UserCog,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AI_PROVIDERS_META,
  computePhysiologicalProfile,
  fetchLiveModelsFromProvider,
  ModelOption,
  resolveUserAge,
  sendAIMessage,
} from '../services/aiService';
import { AI_SKILLS_CATALOG, DEFAULT_ENABLED_SKILLS } from '../services/aiSkills';
import { exportDailyLogsToCSV } from '../services/storageEngine';
import { AIProviderId, AppData, PronounStyle } from '../types';

const LIVE_MODELS_CACHE_KEY = 'tam_an_live_models_v1';

export const SettingsPage: React.FC = () => {
  const {
    data,
    storageDiag,
    aiConfig,
    aiConn,
    verifyAIConnectionNow,
    gistConfig,
    syncStatus,
    syncMessage,
    updateProfile,
    updateAIConfig,
    updateGistConfig,
    syncToCloudNow,
    restoreFromCloudNow,
    importJsonData,
    loadSampleData,
    loadLongTermSampleData,
    resetAllData,
  } = useApp();

  const [showApiKey, setShowApiKey] = useState(false);
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [liveModelsMap, setLiveModelsMap] = useState<Partial<Record<AIProviderId, ModelOption[]>>>(
    () => {
      try {
        const cached = localStorage.getItem(LIVE_MODELS_CACHE_KEY);
        return cached ? JSON.parse(cached) : {};
      } catch {
        return {};
      }
    }
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeProviderId = aiConfig.activeProvider;
  const activeMeta = AI_PROVIDERS_META[activeProviderId];
  const activeProviderSetting = aiConfig.providers[activeProviderId];
  const currentModelOptions: ModelOption[] =
    liveModelsMap[activeProviderId] && liveModelsMap[activeProviderId]!.length > 0
      ? liveModelsMap[activeProviderId]!
      : activeMeta.suggestedModels;

  const handleFetchLiveModels = async () => {
    setFetchingModels(true);
    setTestResult(null);
    try {
      const models = await fetchLiveModelsFromProvider(
        activeProviderId,
        activeProviderSetting?.apiKey || '',
        activeProviderSetting?.baseUrl
      );
      const nextMap = { ...liveModelsMap, [activeProviderId]: models };
      setLiveModelsMap(nextMap);
      localStorage.setItem(LIVE_MODELS_CACHE_KEY, JSON.stringify(nextMap));

      // Nếu model hiện tại không nằm trong danh sách sống vừa quét, tự động chọn model tốt nhất đầu danh sách
      const currentSelected = activeProviderSetting?.model?.trim();
      if (!currentSelected || !models.some((m) => m.value === currentSelected)) {
        handleProviderFieldChange('model', models[0].value);
      }

      setTestResult({
        ok: true,
        text: `Đã cập nhật trực tiếp ${models.length} model đang hoạt động từ máy chủ ${activeMeta.name}!`,
      });
    } catch (err) {
      setTestResult({
        ok: false,
        text: err instanceof Error ? err.message : 'Không thể quét danh sách model.',
      });
    } finally {
      setFetchingModels(false);
    }
  };

  const handleProviderSelect = (id: AIProviderId) => {
    setTestResult(null);
    updateAIConfig({
      ...aiConfig,
      activeProvider: id,
    });
  };

  const handleProviderFieldChange = (
    field: 'apiKey' | 'model' | 'baseUrl',
    value: string
  ) => {
    updateAIConfig({
      ...aiConfig,
      providers: {
        ...aiConfig.providers,
        [activeProviderId]: {
          ...aiConfig.providers[activeProviderId],
          [field]: value,
        },
      },
    });
  };

  const handleTestAIConnection = async () => {
    setTestingAI(true);
    setTestResult(null);
    try {
      const reply = await sendAIMessage({
        aiConfig,
        systemPrompt: 'Bạn là trợ lý thân thiện. Hãy trả lời thật ngắn gọn trong 1 câu tiếng Việt.',
        messages: [
          { role: 'user', content: 'Xin chào! Kiểm tra kết nối thành công chưa?' },
        ],
      });
      setTestResult({ ok: true, text: `Kết nối mượt mà! Phản hồi thử: "${reply}"` });
    } catch (err) {
      setTestResult({
        ok: false,
        text: err instanceof Error ? err.message : 'Kết nối thất bại.',
      });
    } finally {
      setTestingAI(false);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tam-an-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData;
        if (!parsed || !parsed.profile || !parsed.dailyLogs) {
          alert('Tệp JSON không đúng cấu trúc dữ liệu của ứng dụng.');
          return;
        }
        importJsonData(parsed);
        alert('Đã khôi phục dữ liệu từ tệp JSON thành công!');
      } catch {
        alert('Không thể đọc tệp JSON này.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
          Cài Đặt, Đa Nguồn AI & Đồng Bộ
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Tối ưu riêng cho iPhone 17 & kiến trúc lưu trữ IndexedDB bền bỉ suốt nhiều năm
        </p>
      </div>

      {/* HƯỚNG DẪN CÀI APP LÊN MÀN HÌNH CHÍNH IPHONE 17 & SỨC KHOẺ BỘ NHỚ ĐA NĂM */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base sm:text-lg">
              Trải nghiệm như App gốc 120Hz trên iPhone 17
            </h3>
            <p className="text-xs sm:text-sm text-emerald-50/95 leading-relaxed">
              Mở link web bằng <strong>Safari</strong> trên iPhone 17 → nhấn nút <strong>Chia sẻ (Share)</strong> ở thanh dưới → chọn <strong>“Thêm vào MH chính” (Add to Home Screen)</strong>. Web sẽ chạy tràn viền chuẩn Dynamic Island, mượt 120Hz và được iOS bảo vệ dữ liệu không bao giờ tự xoá bộ nhớ đệm!
            </p>
          </div>
        </div>

        {storageDiag && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-3 rounded-2xl bg-black/15 backdrop-blur-sm">
              <div className="text-[11px] text-emerald-100 flex items-center gap-1">
                <Database className="w-3 h-3" /> Lõi lưu trữ
              </div>
              <div className="font-bold text-sm mt-0.5">{storageDiag.engine}</div>
            </div>

            <div className="p-3 rounded-2xl bg-black/15 backdrop-blur-sm">
              <div className="text-[11px] text-emerald-100">Tổng ngày tích luỹ</div>
              <div className="font-bold text-sm mt-0.5">{storageDiag.totalDaysLogged} ngày</div>
            </div>

            <div className="p-3 rounded-2xl bg-black/15 backdrop-blur-sm">
              <div className="text-[11px] text-emerald-100">Dung lượng hiện tại</div>
              <div className="font-bold text-sm mt-0.5">{storageDiag.estimatedSizeKB} KB</div>
            </div>

            <div className="p-3 rounded-2xl bg-black/15 backdrop-blur-sm">
              <div className="text-[11px] text-emerald-100">Chuỗi thời gian</div>
              <div className="font-bold text-xs mt-0.5 truncate">
                {storageDiag.oldestDate
                  ? `${storageDiag.oldestDate} → ${storageDiag.newestDate}`
                  : 'Chưa có bản ghi'}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 1. CẤU HÌNH ĐA NGUỒN AI */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">1. Lựa chọn & Tự động Kết nối AI</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động xác thực kết nối mỗi khi bạn mở web mà không tốn hạn mức token
              </p>
            </div>
          </div>

          {/* Đèn tín hiệu xác thực kết nối thời gian thực */}
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
              aiConn.status === 'connected'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : aiConn.status === 'connecting'
                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                : aiConn.status === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}
          >
            {aiConn.status === 'connected' ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span>
                  Đã kết nối {activeMeta.name}
                  {aiConn.latencyMs ? ` (${aiConn.latencyMs}ms)` : ''}
                </span>
              </>
            ) : aiConn.status === 'connecting' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tự động kết nối...</span>
              </>
            ) : aiConn.status === 'error' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Kết nối thất bại</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Chưa nhập API Key</span>
              </>
            )}

            {aiConn.status !== 'unconfigured' && aiConn.status !== 'connecting' && (
              <button
                type="button"
                onClick={() => void verifyAIConnectionNow()}
                className="ml-1 p-0.5 hover:opacity-75"
                title="Kiểm tra kết nối lại ngay"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {aiConn.status === 'error' && aiConn.message && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm">
            <strong>Chi tiết lỗi API:</strong> {aiConn.message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(AI_PROVIDERS_META) as AIProviderId[]).map((id) => {
            const meta = AI_PROVIDERS_META[id];
            const isSelected = activeProviderId === id;
            const hasKey = Boolean(aiConfig.providers[id]?.apiKey?.trim());
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleProviderSelect(id)}
                className={`p-4 rounded-2xl border text-left transition ${
                  isSelected
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm">{meta.name}</span>
                  {hasKey && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                      Đã nhập Key
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{meta.badge}</p>
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-bold flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-600" /> Cấu hình {activeMeta.name}
            </span>
            <a
              href={activeMeta.keyGuideUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Lấy API Key tại đây <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
              API Key ({activeMeta.name})
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                placeholder={activeMeta.keyPlaceholder}
                value={activeProviderSetting?.apiKey || ''}
                onChange={(e) => handleProviderFieldChange('apiKey', e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Chọn mô hình ({currentModelOptions.length} sẵn có)
                </label>
                <button
                  type="button"
                  onClick={() => void handleFetchLiveModels()}
                  disabled={fetchingModels}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-60"
                >
                  <RefreshCw className={`w-3 h-3 ${fetchingModels ? 'animate-spin' : ''}`} />
                  Quét Model mới nhất từ API
                </button>
              </div>
              <select
                value={
                  currentModelOptions.some(
                    (m) => m.value === activeProviderSetting?.model
                  )
                    ? activeProviderSetting.model
                    : ''
                }
                onChange={(e) =>
                  e.target.value && handleProviderFieldChange('model', e.target.value)
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm"
              >
                <option value="" disabled>
                  -- Chọn mô hình --
                </option>
                {currentModelOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                Mã Model đang dùng (có thể tự gõ tuỳ ý)
              </label>
              <input
                type="text"
                value={activeProviderSetting?.model || ''}
                onChange={(e) => handleProviderFieldChange('model', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono"
              />
            </div>
          </div>

          {activeMeta.supportsCustomBaseUrl && (
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                Base URL (Mặc định OpenAI hoặc endpoint tương thích chuẩn OpenAI)
              </label>
              <input
                type="text"
                placeholder="https://api.openai.com/v1"
                value={activeProviderSetting?.baseUrl || ''}
                onChange={(e) => handleProviderFieldChange('baseUrl', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleTestAIConnection}
              disabled={testingAI}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition disabled:opacity-60"
            >
              {testingAI ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              Kiểm tra kết nối AI
            </button>

            {testResult && (
              <span
                className={`text-xs sm:text-sm font-medium ${
                  testResult.ok
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {testResult.text}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 2. ĐỒNG BỘ ĐA THIẾT BỊ QUA GITHUB SECRET GIST */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                2. Đồng bộ iPhone 17 ↔ Máy tính qua GitHub Secret Gist
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đồng bộ đám mây 0đ kèm mã hoá đầu-cuối AES-GCM 256-bit
              </p>
            </div>
          </div>

          <a
            href="https://github.com/settings/tokens/new?description=TamAnPersonalSync&scopes=gist"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            Tạo GitHub Gist Token <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
              GitHub Personal Access Token (quyền `gist`)
            </label>
            <div className="relative">
              <input
                type={showGithubToken ? 'text' : 'password'}
                placeholder="ghp_..."
                value={gistConfig.githubToken}
                onChange={(e) =>
                  updateGistConfig({ ...gistConfig, githubToken: e.target.value })
                }
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowGithubToken((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showGithubToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
              Gist ID (Để trống lần đầu — tự tạo Gist riêng tư mới)
            </label>
            <input
              type="text"
              placeholder="Tự động điền sau lần đẩy lên đầu tiên..."
              value={gistConfig.gistId}
              onChange={(e) => updateGistConfig({ ...gistConfig, gistId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> Mật khẩu mã hoá AES-GCM (Tuỳ chọn)
            </label>
            <input
              type="password"
              placeholder="Nhập mật khẩu giống nhau trên cả iPhone & PC..."
              value={gistConfig.encryptionPassphrase}
              onChange={(e) =>
                updateGistConfig({ ...gistConfig, encryptionPassphrase: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={gistConfig.autoSync}
              onChange={(e) =>
                updateGistConfig({ ...gistConfig, autoSync: e.target.checked })
              }
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span className="text-xs sm:text-sm font-medium">
              Tự động đồng bộ lên Gist mỗi khi cập nhật dữ liệu
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            disabled={syncStatus === 'syncing'}
            onClick={() => void syncToCloudNow().catch(() => {})}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold transition disabled:opacity-60"
          >
            {syncStatus === 'syncing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CloudUpload className="w-4 h-4" />
            )}
            Đẩy dữ liệu lên Gist
          </button>

          <button
            type="button"
            disabled={syncStatus === 'syncing'}
            onClick={() => void restoreFromCloudNow().catch(() => {})}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-bold transition disabled:opacity-60"
          >
            <CloudDownload className="w-4 h-4" />
            Tải từ Gist về máy này
          </button>

          {syncMessage && (
            <span
              className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${
                syncStatus === 'error'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {syncStatus === 'success' && <CheckCircle2 className="w-4 h-4" />}
              {syncMessage}
            </span>
          )}
        </div>
      </section>

      {/* 3. CÁ NHÂN HOÁ HỒ SƠ & NGƯỜI BẠN AI */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                3. Cá nhân hoá Hồ sơ & Người bạn Đồng hành
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Giúp người bạn AI xưng hô tự nhiên và thấu hiểu đúng thể trạng, tính cách của bạn
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
            <CheckCircle2 className="w-3.5 h-3.5" /> Tự động lưu tức thì
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
              Tên gọi của bạn
            </label>
            <input
              type="text"
              value={data.profile.userName}
              onChange={(e) => updateProfile({ userName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
              Tên của Người bạn AI
            </label>
            <input
              type="text"
              value={data.profile.companionName}
              onChange={(e) => updateProfile({ companionName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
              Cách xưng hô (AI - Bạn)
            </label>
            <select
              value={data.profile.pronounStyle}
              onChange={(e) => updateProfile({ pronounStyle: e.target.value as PronounStyle })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            >
              <option value="minh_ban">Mình — Bạn (Ấm áp, cân bằng)</option>
              <option value="to_cau">Tớ — Cậu (Thân thiết, gần gũi)</option>
              <option value="anh_em">Anh — Em (Chở che, tin cậy)</option>
              <option value="em_anh">Em — Anh (Nhẹ nhàng, khích lệ)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
              Độ tuổi
            </label>
            <input
              type="number"
              min={6}
              max={110}
              placeholder="VD: 27"
              value={resolveUserAge(data.profile) ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                const currentYear = new Date().getFullYear();
                updateProfile({
                  age: val,
                  birthYear:
                    val && val >= 5 && val <= 110 ? currentYear - val : undefined,
                });
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
              Chiều cao (cm)
            </label>
            <input
              type="number"
              min={100}
              max={250}
              placeholder="VD: 168"
              value={data.profile.heightCm ?? ''}
              onChange={(e) =>
                updateProfile({
                  heightCm: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
              Cân nặng (kg)
            </label>
            <input
              type="number"
              step={0.5}
              min={25}
              max={250}
              placeholder="VD: 65"
              value={data.profile.weightKg ?? ''}
              onChange={(e) =>
                updateProfile({
                  weightKg: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
              Quốc tịch / Văn hoá
            </label>
            <input
              type="text"
              placeholder="VD: Việt Nam"
              value={data.profile.nationality ?? 'Việt Nam'}
              onChange={(e) => updateProfile({ nationality: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
          </div>
        </div>

        {/* Tính cách để AI điều chỉnh tâm lý & phương án hành động */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
            Đặc điểm tính cách của bạn (Giúp AI thấu hiểu tâm lý & đưa ra phương án phù hợp nhất)
          </label>
          <input
            type="text"
            placeholder="VD: Hướng nội, cầu toàn, thích sự rõ ràng, đôi khi hay suy nghĩ nhiều (overthinking)..."
            value={data.profile.personality ?? ''}
            onChange={(e) => updateProfile({ personality: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
          />
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {[
              'Hướng nội (Introvert)',
              'Hướng ngoại (Extrovert)',
              'Cầu toàn',
              'Hay suy nghĩ nhiều (Overthinking)',
              'Thực tế & Lý trí',
              'Giàu cảm xúc & Nhạy cảm',
              'Thích kế hoạch rõ ràng',
              'Dễ mất tập trung',
            ].map((trait) => {
              const current = data.profile.personality || '';
              const isIncluded = current.toLowerCase().includes(trait.toLowerCase());
              return (
                <button
                  key={trait}
                  type="button"
                  onClick={() => {
                    if (isIncluded) return;
                    const next = current.trim() ? `${current.trim()}, ${trait}` : trait;
                    updateProfile({ personality: next });
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                    isIncluded
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-400'
                  }`}
                >
                  + {trait}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
            Đôi nét về bản thân & bối cảnh công việc / cuộc sống hiện tại
          </label>
          <textarea
            rows={2}
            placeholder="VD: Mình làm việc văn phòng ngồi nhiều, hay thức khuya, muốn cải thiện sức bền và rèn kỷ luật phát triển bản thân..."
            value={data.profile.bioOrFocus}
            onChange={(e) => updateProfile({ bioOrFocus: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
          />
        </div>

        {/* Tóm tắt thể trạng sinh học tự động cho AI */}
        {(() => {
          const phys = computePhysiologicalProfile(data.profile);
          if (!phys.bmi && !phys.age) return null;
          return (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-emerald-900 dark:text-emerald-200 space-x-1">
                <strong>Chỉ số thể trạng AI ghi nhận:</strong>
                {phys.age && <span>{phys.age} tuổi •</span>}
                {phys.bmi && (
                  <span>
                    BMI <span className="font-extrabold">{phys.bmi}</span> — {phys.bmiCategory}
                  </span>
                )}
              </div>
              <div className="text-emerald-700 dark:text-emerald-300 font-semibold">
                {phys.optimalHeartRateZone && (
                  <span>Nhịp tim tập bền: {phys.optimalHeartRateZone} • </span>
                )}
                Nước: ~{phys.recommendedWaterLiters} lít ({phys.recommendedWaterGlasses} cốc/ngày)
              </div>
            </div>
          );
        })()}

        {/* BỘ KỸ NĂNG CHUYÊN SÂU & NGUYÊN TẮC CHỐNG BỊA CHUYỆN CỦA AI */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Bộ Kỹ Năng Thực Tế & Khoá Chống Bịa Chuyện (Zero-Hallucination)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI bị khoá chặt vào số liệu thật của bạn (nhiệt độ chuẩn 0.3–0.42), tích cực thực tế và không suy diễn bịa đặt
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {AI_SKILLS_CATALOG.map((sk) => {
              const currentSkills = data.profile.enabledSkills || DEFAULT_ENABLED_SKILLS;
              const isEnabled = currentSkills.includes(sk.id);
              return (
                <button
                  key={sk.id}
                  type="button"
                  onClick={() => {
                    const next = isEnabled
                      ? currentSkills.filter((id) => id !== sk.id)
                      : [...currentSkills, sk.id];
                    // Đảm bảo luôn còn ít nhất 1 kỹ năng bật
                    if (next.length > 0) {
                      updateProfile({ enabledSkills: next });
                    }
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    isEnabled
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800/80'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-65'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs sm:text-sm">
                      {sk.emoji} {sk.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isEnabled
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      {isEnabled ? 'Đang bật' : 'Tắt'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                    {sk.summary}
                  </p>
                </button>
              );
            })}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
              Nguyên tắc thực tế riêng bạn dặn AI (AI bắt buộc tuân thủ ở mọi câu trả lời)
            </label>
            <textarea
              rows={2}
              placeholder="VD: Mình bị đau khớp gối nên không gợi ý chạy bộ; trả lời thẳng vào trọng tâm dưới 180 từ; không khen sáo rỗng..."
              value={data.profile.customAIRules ?? ''}
              onChange={(e) => updateProfile({ customAIRules: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
          </div>
        </div>
      </section>

      {/* 4. SAO LƯU FILE JSON / EXCEL CSV ĐA NĂM & QUẢN TRỊ DỮ LIỆU */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-base">4. Xuất dữ liệu đa năm & Sao lưu dự phòng</h3>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold transition"
          >
            <Download className="w-4 h-4" /> Xuất toàn bộ (.json)
          </button>

          <button
            type="button"
            onClick={() => exportDailyLogsToCSV(data.dailyLogs, data.habits)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm font-semibold transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Xuất bảng Excel/Numbers (.csv)
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold transition"
          >
            <Upload className="w-4 h-4" /> Nhập tệp (.json)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportJsonFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={loadSampleData}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-100/80 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Mẫu 7 ngày
          </button>

          <button
            type="button"
            onClick={() => loadLongTermSampleData(180)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-100/80 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Mô phỏng 6 tháng (180 ngày)
          </button>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Làm mới sạch
            </button>
          ) : (
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  resetAllData();
                  setConfirmReset(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                Xác nhận xoá
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-semibold"
              >
                Huỷ
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
