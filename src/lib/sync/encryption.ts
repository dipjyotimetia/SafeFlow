// AES-256-GCM Encryption for data sync
// Uses Web Crypto API for browser-native encryption

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for GCM
const SALT_LENGTH = 16;
const LEGACY_KDF_ITERATIONS = 100000;
const CURRENT_KDF_ITERATIONS = 310000; // OWASP/NIST-aligned modern baseline
const KDF_TYPE = 'PBKDF2';
const KDF_HASH = 'SHA-256';
const ENCRYPTION_VERSION = 2;
const PASSWORD_HASH_ITERATIONS = LEGACY_KDF_ITERATIONS;

export interface EncryptedData {
  ciphertext: string; // base64
  iv: string; // base64
  salt: string; // base64
  version: number;
  kdfType?: 'PBKDF2';
  kdfIterations?: number;
  kdfHash?: 'SHA-256';
}

/**
 * Derive a cryptographic key from a password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
  options?: {
    iterations?: number;
    hash?: 'SHA-256';
  }
): Promise<CryptoKey> {
  const iterations = options?.iterations ?? LEGACY_KDF_ITERATIONS;
  const hash = options?.hash ?? KDF_HASH;
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    KDF_TYPE,
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: KDF_TYPE,
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash,
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random salt for key derivation
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a random IV for AES-GCM
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Convert Uint8Array to base64 string
 */
function arrayToBase64(array: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < array.length; i += chunkSize) {
    binary += String.fromCharCode(...array.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToArray(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encrypt(data: string, password: string): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(data);

  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKey(password, salt, {
    iterations: CURRENT_KDF_ITERATIONS,
    hash: KDF_HASH,
  });

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    plaintext
  );

  return {
    ciphertext: arrayToBase64(new Uint8Array(ciphertext)),
    iv: arrayToBase64(iv),
    salt: arrayToBase64(salt),
    version: ENCRYPTION_VERSION,
    kdfType: KDF_TYPE,
    kdfIterations: CURRENT_KDF_ITERATIONS,
    kdfHash: KDF_HASH,
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
  const salt = base64ToArray(encryptedData.salt);
  const iv = base64ToArray(encryptedData.iv);
  const ciphertext = base64ToArray(encryptedData.ciphertext);

  const key = await deriveKey(password, salt, {
    iterations: encryptedData.kdfIterations ?? LEGACY_KDF_ITERATIONS,
    hash: encryptedData.kdfHash ?? KDF_HASH,
  });

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Generate a hash of the encryption password for verification
 * This is stored to verify the password without decrypting the data
 */
export async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = salt ? base64ToArray(salt) : generateSalt();
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  const key = await crypto.subtle.importKey('raw', passwordBytes, KDF_TYPE, false, ['deriveBits']);

  const hashBits = await crypto.subtle.deriveBits(
    {
      name: KDF_TYPE,
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: PASSWORD_HASH_ITERATIONS,
      hash: KDF_HASH,
    },
    key,
    256
  );

  return {
    hash: arrayToBase64(new Uint8Array(hashBits)),
    salt: arrayToBase64(saltBytes),
  };
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  return hash === storedHash;
}

/**
 * Generate a random encryption key (for use as a passphrase)
 */
export function generateRandomKey(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}
