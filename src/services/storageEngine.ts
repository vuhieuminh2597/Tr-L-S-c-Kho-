import { AppData, DailyLog, Habit, StorageDiagnostics } from '../types';
import { BEDTIME_LABELS, computeLifeBalanceScore } from './analyticsEngine';

const DB_NAME = 'tam_an_longterm_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_store';
const MAIN_DATA_KEY = 'primary_app_data';
const LEGACY_LOCALSTORAGE_KEY = 'tam_an_app_data_v1';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Trình duyệt không hỗ trợ IndexedDB'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Không thể mở cơ sở dữ liệu IndexedDB'));
    };
  });

  return dbPromise;
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      if (already) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // Safari iOS có thể từ chối âm thầm nếu chưa thêm ra Màn hình chính
  }
  return false;
}

export async function checkIsStoragePersisted(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persisted) {
      return await navigator.storage.persisted();
    }
  } catch {
    // ignore
  }
  return false;
}

export async function loadAppDataFromStorage(): Promise<AppData | null> {
  try {
    const db = await openDatabase();
    const fromIdb = await new Promise<AppData | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(MAIN_DATA_KEY);
      req.onsuccess = () => resolve(req.result as AppData | undefined);
      req.onerror = () => reject(req.error);
    });

    if (fromIdb && fromIdb.profile) {
      return fromIdb;
    }

    // Tự động di chuyển dữ liệu cũ từ localStorage sang IndexedDB (nếu có)
    const legacyRaw = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as AppData;
      if (parsed && parsed.profile) {
        await saveAppDataToStorage(parsed);
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Fallback đọc dữ liệu từ localStorage:', err);
    try {
      const legacyRaw = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
      if (legacyRaw) {
        return JSON.parse(legacyRaw) as AppData;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export async function saveAppDataToStorage(data: AppData): Promise<void> {
  // Đồng bộ song song bản đệm nhanh vào localStorage (trong giới hạn dung lượng trình duyệt)
  try {
    localStorage.setItem(LEGACY_LOCALSTORAGE_KEY, JSON.stringify(data));
  } catch {
    // Khi dữ liệu sau nhiều năm vượt quá 5MB của localStorage, IndexedDB bên dưới vẫn lưu trọn vẹn 100%
  }

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(data, MAIN_DATA_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Lưu IndexedDB gặp sự cố, đang dùng bản dự phòng localStorage:', err);
  }
}

export async function computeStorageDiagnostics(data: AppData): Promise<StorageDiagnostics> {
  const dates = Object.keys(data.dailyLogs).sort();
  const isPersisted = await checkIsStoragePersisted();
  let engine: 'IndexedDB' | 'LocalStorage' = 'IndexedDB';
  try {
    await openDatabase();
  } catch {
    engine = 'LocalStorage';
  }

  const serializedLength = JSON.stringify(data).length;
  const estimatedSizeKB = Math.max(1, Math.round((serializedLength * 2) / 1024));

  return {
    engine,
    isPersisted,
    totalDaysLogged: dates.length,
    oldestDate: dates.length > 0 ? dates[0] : null,
    newestDate: dates.length > 0 ? dates[dates.length - 1] : null,
    estimatedSizeKB,
  };
}

export function exportDailyLogsToCSV(
  dailyLogs: Record<string, DailyLog>,
  habits: Habit[] = []
): void {
  const sortedLogs = Object.values(dailyLogs).sort((a, b) => a.date.localeCompare(b.date));
  const headers = [
    'Ngày',
    'Điểm Cân Bằng (0-100)',
    'Tâm trạng (1-10)',
    'Căng thẳng (1-10)',
    'Giờ ngủ',
    'Khung giờ đi ngủ',
    'Chất lượng ngủ (1-5)',
    'Năng lượng (1-10)',
    'Giờ tập trung sâu',
    'Nước uống (cốc)',
    'Vận động (phút)',
    'Hình thức vận động',
    'Cân nặng (kg)',
    'Cảm xúc',
    'Tác nhân ảnh hưởng',
    'Ghi chú cơ thể',
    'Điều biết ơn',
    'Nhật ký',
  ];

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return /[",\n]/.test(str) ? `"${str}"` : str;
  };

  const rows = sortedLogs.map((log) => {
    const habitRatio =
      habits.length > 0
        ? habits.filter((h) => h.completedDates.includes(log.date)).length / habits.length
        : 0.5;
    const balance = computeLifeBalanceScore(log, habitRatio);
    return [
      log.date,
      balance,
      log.mood,
      log.stress,
      log.sleepHours,
      log.bedtimeSlot ? BEDTIME_LABELS[log.bedtimeSlot] : '',
      log.sleepQuality,
      log.energy,
      log.focusHours ?? '',
      log.waterGlasses,
      log.exerciseMinutes,
      log.exerciseType ?? '',
      log.weightKg ?? '',
      log.emotions.join('; '),
      (log.triggers || []).join('; '),
      log.physicalNotes ?? '',
      log.gratitude ?? '',
      log.journal ?? '',
    ]
      .map(escapeCsv)
      .join(',');
  });

  // Thêm BOM \uFEFF để Excel & Apple Numbers trên iPhone/Mac hiển thị chuẩn tiếng Việt
  const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tam-an-du-lieu-da-nam-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
