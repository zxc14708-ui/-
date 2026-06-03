const STORAGE_KEYS = [
  'portfolio_stocks_v2',
  'portfolio_accounts_v2',
  'portfolio_snapshots_v1',
  'portfolio_trades_v1',
] as const;

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'] as KeyUsage[],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' } as Pbkdf2Params,
    keyMaterial,
    { name: 'AES-GCM', length: 256 } as AesDerivedKeyParams,
    false,
    ['encrypt', 'decrypt'] as KeyUsage[],
  );
}

function bufToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64ToBuf(b64: string): Uint8Array {
  return new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
}

export async function encryptPortfolio(passphrase: string): Promise<string> {
  const data: Record<string, unknown> = {};
  for (const key of STORAGE_KEYS) {
    const v = localStorage.getItem(key);
    if (v) data[key] = JSON.parse(v);
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveKey(passphrase, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(JSON.stringify(data)),
  );

  // layout: salt(16) + iv(12) + ciphertext
  const combined = new Uint8Array(16 + 12 + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(new Uint8Array(ciphertext), 28);
  return bufToB64(combined.buffer);
}

export async function decryptPortfolio(
  encryptedB64: string,
  passphrase: string,
): Promise<void> {
  const combined  = b64ToBuf(encryptedB64);
  const salt      = combined.slice(0, 16);
  const iv        = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const aesKey = await deriveKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ciphertext,
  );

  const data = JSON.parse(new TextDecoder().decode(decrypted)) as Record<string, unknown>;
  for (const key of STORAGE_KEYS) {
    if (key in data) localStorage.setItem(key, JSON.stringify(data[key]));
  }
}

export function generateSyncKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
