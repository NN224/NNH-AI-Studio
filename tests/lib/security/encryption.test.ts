describe('lib/security/encryption', () => {
  const KEY = Buffer.alloc(32, 1).toString('base64');
  let encryption: typeof import('@/lib/security/encryption');

  beforeEach(async () => {
    jest.resetModules();
    process.env.ENCRYPTION_KEY = KEY;
    encryption = await import('@/lib/security/encryption');
  });

  it('encrypts and decrypts tokens symmetrically', () => {
    const plaintext = 'test-token-value';
    const encrypted = encryption.encryptToken(plaintext);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(plaintext);

    const decrypted = encryption.decryptToken(encrypted);
    expect(decrypted).toEqual(plaintext);
  });

  it('returns null when decrypting nullish tokens', () => {
    expect(encryption.decryptToken(null)).toBeNull();
    expect(encryption.decryptToken(undefined)).toBeNull();
  });

  it('throws when decrypting malformed payloads', () => {
    expect(() => encryption.decryptToken('invalid-token')).toThrow('Failed to decrypt token');
  });

  it('throws when encrypting empty tokens', () => {
    expect(() => encryption.encryptToken('')).toThrow('Cannot encrypt empty token');
  });

  // SECURITY FIX: No longer falls back to plaintext - throws error instead
  it('throws error on decryption failure, not return plaintext', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const corruptedToken = 'corrupted-encrypted-token-xxx';

    expect(() => {
      encryption.resolveTokenValue(corruptedToken, { context: 'test' });
    }).toThrow('Token decryption failed');

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('throws error with bilingual message on decryption failure', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const badToken = 'bad-token-value';

    try {
      encryption.resolveTokenValue(badToken, { context: 'test' });
      fail('Should have thrown EncryptionError');
    } catch (error: any) {
      expect(error.message).toContain('Token decryption failed');
      expect(error.message).toContain('re-authentication required');
      expect(error.message).toContain('يُرجى إعادة المصادقة');
      expect(error.name).toBe('EncryptionError');
    }

    errorSpy.mockRestore();
  });

  it('returns null for null/undefined tokens without throwing', () => {
    expect(encryption.resolveTokenValue(null)).toBeNull();
    expect(encryption.resolveTokenValue(undefined)).toBeNull();
  });

  it('successfully decrypts properly encrypted tokens', () => {
    const plaintext = 'my-access-token-12345';
    const encrypted = encryption.encryptToken(plaintext);
    const resolved = encryption.resolveTokenValue(encrypted, { context: 'test' });

    expect(resolved).toEqual(plaintext);
  });
});
