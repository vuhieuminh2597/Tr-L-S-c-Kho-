import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CalendarRange,
  Check,
  Copy,
  Download,
  FileText,
  Gauge,
  Layers,
  Loader2,
  Moon,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MarkdownText } from '../components/MarkdownText';
import { useApp } from '../context/AppContext';
import { generatePeriodInsightReport } from '../services/aiService';
import {
  analyzeByHorizon,
  buildYearHeatmap,
  computeMonthlyRollups,
  getAvailableYears,
} from '../services/analyticsEngine';
import { exportDailyLogsToCSV } from '../services/storageEngine';
import { TimeHorizon } from '../types';
import { formatShortDate, getTodayStr } from '../utils/dateUtils';

const HORIZON_OPTIONS: { id: TimeHorizon; label: string }[] = [
  { id: '7d', label: '7 ngày' },
  { id: '30d', label: '30 ngày' },
  { id: '90d', label: '3 tháng' },
  { id: '365d', label: '1 năm' },
  { id: 'all', label: 'Tất cả' },
];

const DeltaBadge: React.FC<{ value: number | null; invertGood?: boolean; unit?: string }> = ({
  value,
  invertGood = false,
  unit = '',
}) => {
  if (value === null || value === 0) return null;
  const isGood = invertGood ? value < 0 : value > 0;
  const sign = value > 0 ? '+' : '';
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
        isGood
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
      }`}
    >
      {value > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {sign}
      {value}
      {unit}
    </span>
  );
};

export const AnalyticsPage: React.FC = () => {
  const {
    data,
    aiConfig,
    hasActiveApiKey,
    addInsightReport,
    deleteInsightReport,
    setActiveTab,
    loadLongTermSampleData,
  } = useApp();

  const [horizon, setHorizon] = useState<TimeHorizon>('30d');
  const availableYears = useMemo(() => getAvailableYears(data.dailyLogs), [data.dailyLogs]);
  const [selectedYear, setSelectedYear] = useState<number>(() => availableYears[0] || new Date().getFullYear());
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const today = getTodayStr();
  const companionName = data.profile.companionName || 'Tâm An';

  const result = useMemo(
    () => analyzeByHorizon(data.dailyLogs, horizon, data.habits),
    [data.dailyLogs, horizon, data.habits]
  );

  const monthlyRollups = useMemo(
    () => computeMonthlyRollups(data.dailyLogs, data.habits),
    [data.dailyLogs, data.habits]
  );

  const yearHeatmapWeeks = useMemo(
    () => buildYearHeatmap(data.dailyLogs, selectedYear),
    [data.dailyLogs, selectedYear]
  );

  const handleGenerateAIReport = async () => {
    if (!hasActiveApiKey) {
      setReportError('Hãy gắn API Key miễn phí trong Cài đặt để tạo Báo cáo phân tích chuyên sâu.');
      return;
    }
    setReportError(null);
    setGeneratingReport(true);
    try {
      const content = await generatePeriodInsightReport(horizon, data, aiConfig);
      const labelObj = HORIZON_OPTIONS.find((h) => h.id === horizon);
      addInsightReport({
        id: `rep-${Date.now()}`,
        periodLabel: `Phân tích ${labelObj?.label || horizon} (đến ${formatShortDate(today)})`,
        content,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Lỗi tạo báo cáo phân tích.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const getMoodCellColor = (inYear: boolean, mood?: number) => {
    if (!inYear) return 'bg-transparent';
    if (!mood) return 'bg-slate-200/70 dark:bg-slate-800/80';
    if (mood >= 8) return 'bg-emerald-500';
    if (mood >= 6) return 'bg-teal-400';
    if (mood >= 4) return 'bg-amber-400';
    return 'bg-rose-400';
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Thanh chọn kỳ dữ liệu chuẩn ngón cái iPhone 17 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Phân Tích Dữ Liệu Đa Năm
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Tự động gom nhóm thông minh để phân tích nhanh qua nhiều tháng, nhiều năm
          </p>
        </div>

        <div className="grid grid-cols-5 sm:inline-flex p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-0.5">
          {HORIZON_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setHorizon(opt.id)}
              className={`py-2 px-2 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold transition text-center ${
                horizon === opt.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!result ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 sm:p-10 text-center space-y-3.5">
          <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="font-bold text-base">Chưa có dữ liệu nhật ký trong giai đoạn này</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Bạn có thể bắt đầu ghi nhật ký hôm nay, hoặc nạp thử bộ dữ liệu mô phỏng 6 tháng (180 ngày) để kiểm nghiệm tốc độ gom nhóm biểu đồ đa tháng/năm ngay trên iPhone 17!
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              onClick={() => setActiveTab('checkin')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-bold"
            >
              Ghi nhật ký ngay
            </button>
            <button
              onClick={() => loadLongTermSampleData(180)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-bold"
            >
              Thử dữ liệu 6 tháng (180 ngày)
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 5 Chỉ số trung bình kỳ + So sánh tăng/giảm so với kỳ trước */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="col-span-2 lg:col-span-1 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-emerald-100 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5" /> Điểm Cân Bằng
                </span>
                <DeltaBadge value={result.deltas.balance} />
              </div>
              <div className="text-2xl font-extrabold mt-1">{result.avgBalance}/100</div>
              <p className="text-[11px] text-emerald-100/90 mt-0.5">
                Chỉ số Tâm-Sinh-Lý tổng hợp
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-slate-500">TB Tâm trạng</span>
                <DeltaBadge value={result.deltas.mood} />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {result.avgMood}/10
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {result.logsCount} ngày ghi nhận
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-slate-500">TB Năng lượng</span>
                <DeltaBadge value={result.deltas.energy} />
              </div>
              <div className="text-2xl font-extrabold text-amber-500 mt-1">
                {result.avgEnergy}/10
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tổng tập {result.totalExerciseHours} giờ
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-slate-500">TB Giấc ngủ</span>
                <DeltaBadge value={result.deltas.sleep} unit="h" />
              </div>
              <div className="text-2xl font-extrabold text-indigo-500 mt-1">
                {result.avgSleep}h
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Chuẩn sinh học 7.5–8h/đêm
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-slate-500">TB Căng thẳng</span>
                <DeltaBadge value={result.deltas.stress} invertGood />
              </div>
              <div className="text-2xl font-extrabold text-rose-500 mt-1">
                {result.avgStress}/10
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">So sánh kỳ liền trước</p>
            </div>
          </div>

          {/* Biểu đồ 1: Thích ứng đa tầng (Ngày / Tuần / Tháng / Quý) */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-sm sm:text-lg">
                  Xu hướng Tâm trạng, Năng lượng & Stress
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Layers className="w-3 h-3 text-emerald-500" />
                {result.granularityLabel}
              </span>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={result.chartSeries}
                  margin={{ top: 8, right: 6, left: -24, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.tooltipTitle || ''
                    }
                    contentStyle={{
                      borderRadius: '14px',
                      border: 'none',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.14)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    connectNulls
                    type="monotone"
                    dataKey="tamTrang"
                    name="Tâm trạng"
                    stroke="#10b981"
                    strokeWidth={2.75}
                    fillOpacity={1}
                    fill="url(#colorMood)"
                  />
                  <Area
                    connectNulls
                    type="monotone"
                    dataKey="nangLuong"
                    name="Năng lượng"
                    stroke="#f59e0b"
                    strokeWidth={2.25}
                    fillOpacity={1}
                    fill="url(#colorEnergy)"
                  />
                  <Area
                    connectNulls
                    type="monotone"
                    dataKey="cangThang"
                    name="Căng thẳng"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Khu vực 2 cột: Biểu đồ Giấc ngủ/Vận động & Ma trận Tương quan Dài hạn */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm sm:text-base">
                  Nhịp Giấc ngủ (giờ) & Vận động TB (phút)
                </h3>
              </div>
              <div className="h-60 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={result.chartSeries}
                    margin={{ top: 8, right: 6, left: -24, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" orientation="left" domain={[0, 12]} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.tooltipTitle || ''
                      }
                      contentStyle={{
                        borderRadius: '14px',
                        border: 'none',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.14)',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                      yAxisId="left"
                      dataKey="giacNgu"
                      name="Giờ ngủ"
                      fill="#6366f1"
                      radius={[5, 5, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="vanDong"
                      name="Phút tập/ngày"
                      fill="#14b8a6"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ma trận tương quan thống kê Pearson */}
            <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Ma Trận Tương Quan Dài Hạn
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Phát hiện tự động quy luật riêng của cơ thể bạn (hệ số Pearson)
                </p>
              </div>

              {result.correlations.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">
                  Cần tối thiểu 5 ngày ghi chép có biến thiên để tính toán hệ số tương quan thống kê chính xác.
                </p>
              ) : (
                <div className="space-y-3">
                  {result.correlations.slice(0, 4).map((c) => {
                    const pct = Math.round(Math.abs(c.r) * 100);
                    return (
                      <div
                        key={c.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold">{c.pairLabel}</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            r = {c.r > 0 ? `+${c.r}` : c.r}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                          {c.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bản đồ nhiệt cả năm 365 ngày (Chuyển đổi qua từng năm) */}
          <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Bản Đồ Nhiệt Tâm Sinh Lý 365 Ngày — Năm {selectedYear}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vuốt ngang nhẹ nhàng trên iPhone để nhìn trọn hành trình xuyên suốt cả năm
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {availableYears.map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      selectedYear === yr
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            <div className="ios-scroll-x overflow-x-auto pb-1">
              <div className="inline-flex gap-[3px] min-w-max">
                {yearHeatmapWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-[3px]">
                    {week.map((cell) => (
                      <div
                        key={cell.date}
                        title={
                          cell.inYear
                            ? `${cell.date}: ${
                                cell.mood ? `Tâm trạng ${cell.mood}/10` : 'Chưa ghi'
                              }`
                            : ''
                        }
                        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px] ${getMoodCellColor(
                          cell.inYear,
                          cell.mood
                        )}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span>Chú thích:</span>
                <span className="inline-flex items-center gap-1">
                  <i className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" /> Thấp
                </span>
                <span className="inline-flex items-center gap-1">
                  <i className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Vừa
                </span>
                <span className="inline-flex items-center gap-1">
                  <i className="w-2.5 h-2.5 rounded-sm bg-teal-400 inline-block" /> Tốt
                </span>
                <span className="inline-flex items-center gap-1">
                  <i className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Rất tốt
                </span>
              </div>

              <button
                type="button"
                onClick={() => exportDailyLogsToCSV(data.dailyLogs, data.habits)}
                className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <Download className="w-3.5 h-3.5" /> Xuất bảng CSV đa năm
              </button>
            </div>
          </section>

          {/* Phân tích Nguyên nhân Gốc rễ (Trigger Impacts) */}
          {result.triggerImpacts.length > 0 && (
            <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-3.5">
              <div>
                <h3 className="font-bold text-sm sm:text-base">
                  Thống Kê Tác Nhân Ảnh Hưởng Trực Tiếp Tới Tâm Trạng
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Các yếu tố làm tăng hoặc giảm điểm tâm trạng so với mức trung bình của bạn
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.triggerImpacts.map((item) => {
                  const positive = item.moodDelta > 0;
                  return (
                    <div
                      key={item.trigger}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm truncate">
                          {item.trigger}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Xuất hiện {item.occurrences} ngày • TB {item.avgMoodWithTrigger}/10
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-extrabold px-2.5 py-1 rounded-full ${
                          positive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {positive ? `+${item.moodDelta}` : item.moodDelta} điểm
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Lưu trữ Tổng kết Từng Tháng qua Nhiều Năm */}
          {monthlyRollups.length > 0 && (
            <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <CalendarRange className="w-4 h-4 text-sky-500" />
                  Sổ Lưu Trữ Tổng Kết Theo Tháng ({monthlyRollups.length} tháng)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bảng chỉ mục nén giúp bạn và {companionName} đối chiếu sự trưởng thành qua từng tháng, từng năm
                </p>
              </div>

              <div className="ios-scroll-x overflow-x-auto">
                <table className="w-full min-w-[520px] text-xs sm:text-sm">
                  <thead>
                    <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 text-left">
                      <th className="pb-2.5 font-semibold">Tháng</th>
                      <th className="pb-2.5 font-semibold text-center">Số ngày</th>
                      <th className="pb-2.5 font-semibold text-center">Tâm trạng</th>
                      <th className="pb-2.5 font-semibold text-center">Năng lượng</th>
                      <th className="pb-2.5 font-semibold text-center">TB Ngủ</th>
                      <th className="pb-2.5 font-semibold text-center">Stress</th>
                      <th className="pb-2.5 font-semibold text-right">Tổng tập</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {monthlyRollups.slice(0, 24).map((m) => (
                      <tr key={m.monthKey}>
                        <td className="py-3 font-bold text-slate-800 dark:text-slate-100">
                          {m.monthLabel}
                        </td>
                        <td className="py-3 text-center text-slate-500">{m.daysLogged}</td>
                        <td className="py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {m.avgMood}/10
                        </td>
                        <td className="py-3 text-center font-semibold text-amber-600 dark:text-amber-400">
                          {m.avgEnergy}/10
                        </td>
                        <td className="py-3 text-center font-semibold text-indigo-600 dark:text-indigo-400">
                          {m.avgSleep}h
                        </td>
                        <td className="py-3 text-center text-rose-500 font-semibold">
                          {m.avgStress}/10
                        </td>
                        <td className="py-3 text-right font-medium">
                          {Math.round((m.totalExerciseMinutes / 60) * 10) / 10} giờ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {/* BÁO CÁO TỔNG KẾT CHUYÊN SÂU BẰNG AI */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Báo Cáo Phân Tích Chuyên Sâu Từ {companionName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sử dụng thuật toán nén đa tầng để AI phân tích mượt mà dù dữ liệu dài hàng năm
            </p>
          </div>

          <button
            onClick={handleGenerateAIReport}
            disabled={generatingReport}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-sm transition disabled:opacity-60"
          >
            {generatingReport ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            AI Phân tích ({HORIZON_OPTIONS.find((h) => h.id === horizon)?.label})
          </button>
        </div>

        {reportError && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs sm:text-sm flex items-center justify-between gap-3">
            <span>{reportError}</span>
            {!hasActiveApiKey && (
              <button
                onClick={() => setActiveTab('settings')}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold"
              >
                Gắn API Key
              </button>
            )}
          </div>
        )}

        {data.insightReports.length === 0 ? (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs sm:text-sm text-slate-500 text-center">
            Chưa có bản báo cáo tổng kết nào được lưu. Chọn mốc thời gian (7 ngày / 3 tháng / 1 năm / Tất cả) rồi nhấn nút bên trên để {companionName} lập báo cáo nhé!
          </div>
        ) : (
          <div className="space-y-4">
            {data.insightReports.map((rep) => (
              <div
                key={rep.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {rep.periodLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{new Date(rep.createdAt).toLocaleString('vi-VN')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(rep.content);
                        setCopiedId(rep.id);
                        window.setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                      title="Sao chép báo cáo"
                    >
                      {copiedId === rep.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteInsightReport(rep.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600"
                      title="Xoá báo cáo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <MarkdownText content={rep.content} className="text-slate-700 dark:text-slate-200" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
