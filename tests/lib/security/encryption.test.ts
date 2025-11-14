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

  it('falls back to plaintext for legacy tokens when resolved', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const legacyValue = 'legacy-plain-token';
    expect(encryption.resolveTokenValue(legacyValue)).toEqual(legacyValue);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

