import crypto from 'crypto';

/**
 * Standardize phone number into E.164-compatible string
 * e.g. " +1 (555) 234-5678 " -> "+15552345678"
 */
export function normalizePhoneNumber(rawPhone: string): string {
  let cleaned = rawPhone.trim().replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

/**
 * Creates a deterministic SHA-256 hash of a normalized phone number for blind lookups
 */
export function hashPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
