import type { DeployerAccount } from './types';

/**
 * Simple encryption/decryption utilities for deployer account vault
 * Uses PIN-based encryption with crypto-js compatible approach
 *
 * WARNING: This is basic protection for convenience, not military-grade encryption.
 * Private keys are still stored in browser localStorage.
 */

/**
 * Hash a PIN for storage/comparison
 * Uses SHA-256 via Web Crypto API
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Derive encryption key from PIN
 * Uses PBKDF2 for key derivation
 */
async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt deployer accounts with PIN
 */
export async function encryptAccounts(
  accounts: DeployerAccount[],
  pin: string
): Promise<string> {
  try {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Derive key from PIN
    const key = await deriveKey(pin, salt);

    // Encrypt data
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(accounts));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    throw new Error('Failed to encrypt accounts');
  }
}

/**
 * Decrypt deployer accounts with PIN
 */
export async function decryptAccounts(
  encryptedData: string,
  pin: string
): Promise<DeployerAccount[]> {
  try {
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    // Derive key from PIN
    const key = await deriveKey(pin, salt);

    // Decrypt data
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);

    // Parse JSON
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decrypted);
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Failed to decrypt accounts - incorrect PIN?');
  }
}

/**
 * Validate PIN format (4 digits)
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
