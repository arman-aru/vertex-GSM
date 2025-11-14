/**
 * Encryption Utilities
 * 
 * Provides AES-256-GCM encryption/decryption for sensitive data like API keys.
 * Uses a master encryption key from environment variables.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get encryption key from environment or generate a default (dev only)
 */
function getEncryptionKey(): Buffer {
  const masterKey = process.env.ENCRYPTION_KEY;
  
  if (!masterKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY must be set in production");
    }
    // Dev fallback - NOT SECURE, only for local testing
    console.warn("⚠️ Using default encryption key - NOT FOR PRODUCTION");
    return Buffer.from("dev-key-not-secure-change-in-production!!", "utf8").subarray(0, KEY_LENGTH);
  }
  
  // Derive key from master key
  return crypto.pbkdf2Sync(masterKey, "vertexgsm-salt", ITERATIONS, KEY_LENGTH, "sha256");
}

/**
 * Encrypt a plaintext string
 * Returns base64-encoded encrypted data with IV and auth tag
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const tag = cipher.getAuthTag();
    
    // Combine IV + encrypted data + auth tag
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, "hex"),
      tag,
    ]);
    
    return combined.toString("base64");
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt a base64-encoded encrypted string
 * Returns the original plaintext
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";
  
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(ciphertext, "base64");
    
    // Extract IV, encrypted data, and auth tag
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(combined.length - TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Hash a string using SHA-256 (one-way, for comparison only)
 */
export function hash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Helper to encrypt Webex API Key before saving to DB
 */
export function encryptWebexKey(apiKey: string): string {
  return encrypt(apiKey);
}

/**
 * Helper to decrypt Webex API Key when reading from DB
 */
export function decryptWebexKey(encryptedKey: string): string {
  return decrypt(encryptedKey);
}

/**
 * Helper to encrypt DHRU/Supplier API Key
 */
export function encryptSupplierKey(apiKey: string): string {
  return encrypt(apiKey);
}

/**
 * Helper to decrypt DHRU/Supplier API Key
 */
export function decryptSupplierKey(encryptedKey: string): string {
  return decrypt(encryptedKey);
}
