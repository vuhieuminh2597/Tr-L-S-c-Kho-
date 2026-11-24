import { AppData, GistSyncConfig } from '../types';
import { normalizeAppData, smartMergeAppData } from '../utils/dataNormalizer';
import { decryptTextIfNeeded, encryptText } from './cryptoService';

const GIST_FILENAME = 'tam_an_personal_data.json';

export async function pushDataToGist(
  data: AppData,
  config: GistSyncConfig
): Promise<{ gistId: string; syncedAt: string }> {
  const token = config.githubToken.trim();
  if (!token) {
    throw new Error('Vui lòng nhập GitHub Personal Access Token (quyền gist) trước khi đồng bộ.');
  }

  const normalized = normalizeAppData(data);
  const rawJson = JSON.stringify(normalized);
  const contentToUpload = config.encryptionPassphrase.trim()
    ? await encryptText(rawJson, config.encryptionPassphrase.trim())
    : rawJson;

  const isUpdate = Boolean(config.gistId.trim());
  const url = isUpdate
    ? `https://api.github.com/gists/${config.gistId.trim()}`
    : 'https://api.github.com/gists';

  const assistantLabel = normalized.profile.companionName?.trim() || 'Trợ lý AI';

  const response = await fetch(url, {
    method: isUpdate ? 'PATCH' : 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: `${assistantLabel} — Dữ liệu Sức khoẻ, Tâm lý & Mục tiêu cá nhân (Riêng tư)`,
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: contentToUpload,
        },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `Lỗi kết nối GitHub Gist (${response.status}): Kiểm tra lại Token hoặc Gist ID. ${errText.slice(0, 100)}`
    );
  }

  const result = await response.json();
  return {
    gistId: result.id as string,
    syncedAt: new Date().toISOString(),
  };
}

export async function pullDataFromGist(config: GistSyncConfig): Promise<AppData> {
  const token = config.githubToken.trim();
  const gistId = config.gistId.trim();

  if (!token || !gistId) {
    throw new Error('Cần có cả GitHub Token và Gist ID để tải dữ liệu từ đám mây về thiết bị.');
  }

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Không tìm thấy Gist hoặc Token không hợp lệ (Mã lỗi ${response.status}).`);
  }

  const result = await response.json();
  const fileObj =
    result.files?.[GIST_FILENAME] ||
    (Object.values(result.files || {})[0] as { content?: string } | undefined);

  if (!fileObj || typeof fileObj.content !== 'string') {
    throw new Error('Không tìm thấy tệp dữ liệu hợp lệ bên trong Gist này.');
  }

  const plainJson = await decryptTextIfNeeded(
    fileObj.content,
    config.encryptionPassphrase.trim()
  );
  const parsed = JSON.parse(plainJson) as AppData;

  if (!parsed || typeof parsed !== 'object' || !parsed.profile) {
    throw new Error('Cấu trúc dữ liệu tải về không tương thích với ứng dụng.');
  }

  return normalizeAppData(parsed);
}

/**
 * Đồng bộ 2 chiều an toàn:
 * Nếu đã có Gist ID -> Tải bản trên mây về, hợp nhất thông minh với máy hiện tại rồi mới đẩy bản đầy đủ nhất lên.
 */
export async function syncTwoWayWithGist(
  localData: AppData,
  config: GistSyncConfig
): Promise<{ mergedData: AppData; gistId: string; syncedAt: string }> {
  const hasExistingGist = Boolean(config.gistId.trim());
  let merged = normalizeAppData(localData);

  if (hasExistingGist) {
    try {
      const remoteData = await pullDataFromGist(config);
      merged = smartMergeAppData(merged, remoteData);
    } catch (err) {
      // Nếu lỗi sai mật khẩu giải mã thì phải dừng ngay để không ghi đè hỏng bản mã hoá trên mây
      if (err instanceof Error && err.message.includes('mật khẩu')) {
        throw err;
      }
      throw err;
    }
  }

  const res = await pushDataToGist(merged, config);
  return {
    mergedData: merged,
    gistId: res.gistId,
    syncedAt: res.syncedAt,
  };
}
