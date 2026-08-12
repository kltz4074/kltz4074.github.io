import { CONFIG } from "./config.js";
import { base64ToBytes, bytesToBase64 } from "./utils.js";

/**
 * Local encrypted token vault.
 *
 * The secret phrase is never saved. PBKDF2 derives a key from it, then
 * AES-GCM authenticates and encrypts the GitHub token stored in localStorage.
 */
export async function deriveVaultKey(
  phrase,
  salt,
  usages,
  iterations = CONFIG.iterations,
) {
  const sourceKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(phrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    sourceKey,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

export async function encryptToken(token, phrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKey(phrase, salt, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token),
  );
  return {
    version: 1,
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: CONFIG.iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptToken(vault, phrase) {
  if (
    !vault ||
    vault.version !== 1 ||
    !Number.isSafeInteger(vault.iterations) ||
    vault.iterations < 100000 ||
    vault.iterations > 2000000
  ) {
    throw new Error("Формат локального хранилища не поддерживается.");
  }
  const salt = base64ToBytes(vault.salt);
  const iv = base64ToBytes(vault.iv);
  const key = await deriveVaultKey(phrase, salt, ["decrypt"], vault.iterations);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      base64ToBytes(vault.ciphertext),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("Неверная секретная фраза.");
  }
}

export function getVault() {
  try {
    const value = localStorage.getItem(CONFIG.vaultKey);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function saveVault(vault) {
  localStorage.setItem(CONFIG.vaultKey, JSON.stringify(vault));
}
