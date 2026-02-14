import { describe, expect, it } from "vitest";
import { decrypt, encrypt, verifyPassword, hashPassword, type EncryptedData } from "@/lib/sync/encryption";

const ALGORITHM = "AES-GCM";
const LEGACY_ITERATIONS = 100000;

function toBase64(array: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
}

async function legacyEncrypt(data: string, password: string): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: LEGACY_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    { name: ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(data)
  );

  return {
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
    salt: toBase64(salt),
    version: 1,
  };
}

describe("sync encryption compatibility", () => {
  it("includes modern KDF metadata for new encrypted payloads", async () => {
    const encrypted = await encrypt('{"ok":true}', "StrongPass123!");

    expect(encrypted.version).toBe(2);
    expect(encrypted.kdfType).toBe("PBKDF2");
    expect(encrypted.kdfHash).toBe("SHA-256");
    expect(encrypted.kdfIterations).toBeGreaterThan(100000);
  });

  it("decrypts legacy payloads without KDF metadata", async () => {
    const password = "LegacyPass123!";
    const payload = '{"version":1,"accounts":[]}';
    const encryptedLegacy = await legacyEncrypt(payload, password);

    const decrypted = await decrypt(encryptedLegacy, password);
    expect(decrypted).toBe(payload);
  });

  it("keeps password hashing verification compatibility", async () => {
    const password = "CompatPass123!";
    const { hash, salt } = await hashPassword(password);

    const ok = await verifyPassword(password, hash, salt);
    const bad = await verifyPassword("wrong-password", hash, salt);

    expect(ok).toBe(true);
    expect(bad).toBe(false);
  });
});
