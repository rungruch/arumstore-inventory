import CryptoJS from 'crypto-js';

// Secret key for encryption/decryption - In production, this should be in environment variables
const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET || 'arumstore-tracking-secret-2024';

/**
 * Encrypts a tracking ID for secure URL sharing
 * @param trackingId - The original tracking ID to encrypt
 * @returns Encrypted tracking ID (URL-safe base64)
 */
export function encryptTrackingId(trackingId: string): string {
  try {
    // Encrypt the tracking ID
    const encrypted = CryptoJS.AES.encrypt(trackingId, SECRET_KEY).toString();
    
    // Convert to URL-safe base64
    const urlSafe = btoa(encrypted)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return urlSafe;
  } catch (error) {
    console.error('Error encrypting tracking ID:', error);
    throw new Error('Failed to encrypt tracking ID');
  }
}

/**
 * Decrypts an encrypted tracking ID
 * @param encryptedTrackingId - The encrypted tracking ID (URL-safe base64)
 * @returns Original tracking ID
 */
export function decryptTrackingId(encryptedTrackingId: string): string {
  try {
    // Convert from URL-safe base64 back to regular base64
    let base64 = encryptedTrackingId
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode base64 and decrypt
    const encrypted = atob(base64);
    const decrypted = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    const originalTrackingId = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!originalTrackingId) {
      throw new Error('Invalid encrypted tracking ID');
    }
    
    return originalTrackingId;
  } catch (error) {
    console.error('Error decrypting tracking ID:', error);
    throw new Error('Failed to decrypt tracking ID - invalid or corrupted data');
  }
}

/**
 * Validates if a string is a valid encrypted tracking ID format
 * @param encryptedId - The string to validate
 * @returns True if valid format, false otherwise
 */
export function isValidEncryptedFormat(encryptedId: string): boolean {
  // Check if it's URL-safe base64 format (only contains A-Z, a-z, 0-9, -, _)
  const urlSafeBase64Regex = /^[A-Za-z0-9\-_]+$/;
  return urlSafeBase64Regex.test(encryptedId) && encryptedId.length > 20; // Minimum reasonable length
}

/**
 * Generates an encrypted tracking URL
 * @param trackingId - The original tracking ID
 * @param baseUrl - Base URL for the tracking page (optional, defaults to current origin)
 * @returns Complete encrypted tracking URL
 */
export function generateEncryptedTrackingUrl(trackingId: string, baseUrl?: string): string {
  const encryptedId = encryptTrackingId(trackingId);
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${origin}/tracking?encrypted_id=${encryptedId}`;
}
