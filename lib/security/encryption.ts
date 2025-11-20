import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended length for GCM
const AUTH_TAG_LENGTH = 16;

export class EncryptionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'EncryptionError';
    if (options?.cause) {
      // @ts-ignore optional cause for older runtimes
      this.cause = options.cause;
    }
  }
}

function decodeKey(rawKey: string): Buffer {
  const attempts: Array<() => Buffer> = [
    () => Buffer.from(rawKey, 'base64'),
    () => Buffer.from(rawKey, 'hex'),
    () => Buffer.from(rawKey, 'utf8'),
  ];

  for (const attempt of attempts) {
    try {
      const buffer = attempt();
      if (buffer.length === 32) {
        return buffer;
      }
    } catch {
      // Ignore decoding errors and try next format
    }
  }

  throw new EncryptionError(
    'Invalid ENCRYPTION_KEY. Provide a 32-byte value (base64, hex, or UTF-8).'
  );
}

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new EncryptionError('ENCRYPTION_KEY is not configured');
  }

  return decodeKey(key);
}

export function encryptToken(token: string): string {
  if (!token) {
    throw new EncryptionError('Cannot encrypt empty token');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Structure: [IV | AUTH_TAG | CIPHERTEXT]
  const payload = Buffer.concat([iv, authTag, encrypted]);
  return payload.toString('base64');
}

export function decryptToken(encryptedToken?: string | null): string | null {
  if (!encryptedToken) {
    return null;
  }

  try {
    const payload = Buffer.from(encryptedToken, 'base64');
    if (payload.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new EncryptionError('Encrypted token payload is malformed');
    }

    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    throw new EncryptionError('Failed to decrypt token', { cause: error });
  }
}

/**
 * Resolves token value by decrypting if it appears to be encrypted
 *
 * @param token - Token value (must be encrypted)
 * @param options - Options including context for logging
 * @returns Decrypted token value or null if token is null/undefined
 * @throws EncryptionError if decryption fails - caller must handle re-authentication
 *
 * Security: Does NOT fall back to plaintext on decryption failure.
 * Callers must catch errors and trigger user re-authentication flow.
 *
 * Example:
 * ```typescript
 * try {
 *   const token = resolveTokenValue(account.access_token, { context: 'gmb_accounts' });
 * } catch (error) {
 *   // Token decryption failed - trigger re-authentication
 *   await deactivateAccount(accountId);
 *   throw new ApiError('Please reconnect your account', 401);
 * }
 * ```
 */
export function resolveTokenValue(
  token?: string | null,
  options?: { context?: string }
): string | null {
  if (!token) {
    return null;
  }

  try {
    return decryptToken(token);
  } catch (error) {
    const contextSuffix = options?.context ? ` (${options.context})` : '';
    console.error(
      `[Encryption] Token decryption failed${contextSuffix}. Re-authentication required.`,
      error instanceof Error ? error.message : 'Unknown error'
    );

    throw new EncryptionError(
      'Token decryption failed - re-authentication required. ' +
      'فشل فك تشفير الرمز - يُرجى إعادة المصادقة.',
      { cause: error }
    );
  }
}
