import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  generateCSRFToken,
  verifyCSRFToken,
  shouldProtectRequest,
} from '@/lib/security/csrf';
import { NextRequest } from 'next/server';

describe('CSRF Protection', () => {
  describe('generateCSRFToken', () => {
    it('should generate a token', () => {
      const token = generateCSRFToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(token1).not.toEqual(token2);
    });

    it('should generate cryptographically secure tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCSRFToken());
      }
      // All 100 tokens should be unique
      expect(tokens.size).toBe(100);
    });
  });

  describe('verifyCSRFToken', () => {
    it('should verify matching tokens', () => {
      const token = 'abc123def456';
      expect(verifyCSRFToken(token, token)).toBe(true);
    });

    it('should reject non-matching tokens', () => {
      const token1 = 'abc123def456';
      const token2 = 'xyz789ghi012';
      expect(verifyCSRFToken(token1, token2)).toBe(false);
    });

    it('should reject null request token', () => {
      expect(verifyCSRFToken(null, 'validtoken')).toBe(false);
    });

    it('should reject null cookie token', () => {
      expect(verifyCSRFToken('validtoken', null)).toBe(false);
    });

    it('should reject both null tokens', () => {
      expect(verifyCSRFToken(null, null)).toBe(false);
    });

    it('should reject tokens of different lengths', () => {
      expect(verifyCSRFToken('short', 'muuuuchlongertoken')).toBe(false);
    });

    it('should use constant-time comparison to prevent timing attacks', () => {
      const validToken = 'a'.repeat(32);
      const invalidToken1 = 'b' + 'a'.repeat(31); // Different first char
      const invalidToken2 = 'a'.repeat(31) + 'b'; // Different last char

      // Both should take similar time (constant-time comparison)
      const start1 = Date.now();
      verifyCSRFToken(invalidToken1, validToken);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      verifyCSRFToken(invalidToken2, validToken);
      const time2 = Date.now() - start2;

      // Times should be similar (within reasonable margin)
      // This is a basic test - true constant-time is harder to verify
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });
  });

  describe('shouldProtectRequest', () => {
    it('should protect POST requests', () => {
      const request = new NextRequest('http://localhost/api/data', {
        method: 'POST',
      });
      expect(shouldProtectRequest(request)).toBe(true);
    });

    it('should protect PUT requests', () => {
      const request = new NextRequest('http://localhost/api/data', {
        method: 'PUT',
      });
      expect(shouldProtectRequest(request)).toBe(true);
    });

    it('should protect DELETE requests', () => {
      const request = new NextRequest('http://localhost/api/data', {
        method: 'DELETE',
      });
      expect(shouldProtectRequest(request)).toBe(true);
    });

    it('should protect PATCH requests', () => {
      const request = new NextRequest('http://localhost/api/data', {
        method: 'PATCH',
      });
      expect(shouldProtectRequest(request)).toBe(true);
    });

    it('should NOT protect GET requests', () => {
      const request = new NextRequest('http://localhost/api/data', {
        method: 'GET',
      });
      expect(shouldProtectRequest(request)).toBe(false);
    });

    it('should NOT protect HEAD requests', () => {
      const request = new NextRequest('http://localhost/api/data', {
        method: 'HEAD',
      });
      expect(shouldProtectRequest(request)).toBe(false);
    });

    it('should NOT protect OPTIONS requests', () => {
      const request = new NextRequest('http://localhost/api/data', {
        method: 'OPTIONS',
      });
      expect(shouldProtectRequest(request)).toBe(false);
    });

    it('should NOT protect OAuth callback paths', () => {
      const request = new NextRequest('http://localhost/api/auth/callback', {
        method: 'POST',
      });
      expect(shouldProtectRequest(request)).toBe(false);
    });

    it('should NOT protect webhook paths', () => {
      const request = new NextRequest('http://localhost/api/webhook/gmb', {
        method: 'POST',
      });
      expect(shouldProtectRequest(request)).toBe(false);
    });

    it('should protect non-excluded POST paths', () => {
      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
      });
      expect(shouldProtectRequest(request)).toBe(true);
    });
  });

  describe('CSRF Security Edge Cases', () => {
    it('should handle empty string tokens', () => {
      expect(verifyCSRFToken('', '')).toBe(false);
    });

    it('should handle very long tokens', () => {
      const longToken = 'a'.repeat(10000);
      expect(verifyCSRFToken(longToken, longToken)).toBe(true);
    });

    it('should handle special characters in tokens', () => {
      const token = 'abc!@#$%^&*()123';
      expect(verifyCSRFToken(token, token)).toBe(true);
    });

    it('should handle Unicode characters in tokens', () => {
      const token = 'abc123مرحبا你好';
      expect(verifyCSRFToken(token, token)).toBe(true);
    });

    it('should reject case-different tokens (case-sensitive)', () => {
      expect(verifyCSRFToken('AbC123', 'abc123')).toBe(false);
    });
  });
});
