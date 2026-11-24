// Mã hoá đầu-cuối (AES-GCM 256-bit) trực tiếp trên trình duyệt bằng Web Crypto API
// Đảm bảo kể cả khi lưu trên GitHub Secret Gist, nội dung nhật ký vẫn riêng tư tuyệt đối

interface EncryptedPayload {
  __encrypted: true;
  v: 1;
  salt: string;
  iv: string;
  ciphertext: string;
}

function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 120000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptText(plainText: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encoded = new TextEncoder().encode(plainText);

  const encryptedBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    encoded
  );

  const payload: EncryptedPayload = {
    __encrypted: true,
    v: 1,
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(encryptedBuf),
  };

  return JSON.stringify(payload, null, 2);
}

export async function decryptTextIfNeeded(rawContent: string, passphrase: string): Promise<string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('Dữ liệu đồng bộ không đúng định dạng JSON.');
  }

  if (
    parsed &&
    typeof parsed === 'object' &&
    '__encrypted' in parsed &&
    (parsed as EncryptedPayload).__encrypted === true
  ) {
    if (!passphrase) {
      throw new Error('Dữ liệu trên Gist đã được mã hoá. Vui lòng nhập Mật khẩu giải mã trong Cài đặt.');
    }
    const payload = parsed as EncryptedPayload;
    const salt = base64ToUint8Array(payload.salt);
    const iv = base64ToUint8Array(payload.iv);
    const cipherBytes = base64ToUint8Array(payload.ciphertext);
    const key = await deriveKey(passphrase, salt);

    try {
      const decryptedBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        key,
        cipherBytes.buffer as ArrayBuffer
      );
      return new TextDecoder().decode(decryptedBuf);
    } catch {
      throw new Error('Sai mật khẩu mã hoá! Không thể giải mã dữ liệu từ GitHub Gist.');
    }
  }

  return rawContent;
}
