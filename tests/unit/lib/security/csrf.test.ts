import { generateCSRFToken, validateCSRF } from '@/lib/security/csrf';
import { NextRequest } from 'next/server';

// Mock crypto module
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('test-random-bytes')),
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'test-hmac-signature'),
  })),
}));

describe('CSRF Protection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.CSRF_SECRET = 'test-csrf-secret';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateCSRFToken', () => {
    it('should generate a token with valid format', () => {
      const token = generateCSRFToken();
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token).toContain('.');
      
      const [tokenPart, signature] = token.split('.');
      expect(tokenPart).toBeTruthy();
      expect(signature).toBeTruthy();
    });

    it('should generate unique tokens', () => {
      const crypto = require('crypto');
      let callCount = 0;
      crypto.randomBytes.mockImplementation(() => 
        Buffer.from(`test-random-bytes-${callCount++}`)
      );

      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should include timestamp in token', () => {
      const beforeTime = Date.now();
      const token = generateCSRFToken();
      const afterTime = Date.now();
      
      const [tokenPart] = token.split('.');
      const decoded = JSON.parse(Buffer.from(tokenPart, 'base64').toString());
      
      expect(decoded.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(decoded.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('validateCSRF', () => {
    it('should validate request with valid CSRF token in header', async () => {
      const token = generateCSRFToken();
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'X-CSRF-Token': token,
        },
      });

      const result = await validateCSRF(request);
      
      expect(result.valid).toBe(true);
      expect(result.token).toBe(token);
    });

    it('should validate request with valid CSRF token in cookie', async () => {
      const token = generateCSRFToken();
      const request = new NextRequest('http://localhost:3000/api/test');
      
      // Mock cookies
      jest.spyOn(request.cookies, 'get').mockReturnValue({
        name: 'csrf-token',
        value: token,
      });

      const result = await validateCSRF(request);
      
      expect(result.valid).toBe(true);
      expect(result.token).toBe(token);
    });

    it('should fail validation with missing token', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');

      const result = await validateCSRF(request);
      
      expect(result.valid).toBe(false);
      expect(result.token).toBeTruthy(); // Should generate new token
    });

    it('should fail validation with invalid token format', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'X-CSRF-Token': 'invalid-token-format',
        },
      });

      const result = await validateCSRF(request);
      
      expect(result.valid).toBe(false);
    });

    it('should fail validation with expired token', async () => {
      // Create a token with old timestamp
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const tokenData = {
        random: 'test-random',
        timestamp: oldTimestamp,
      };
      const tokenString = Buffer.from(JSON.stringify(tokenData)).toString('base64');
      const token = `${tokenString}.test-signature`;

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'X-CSRF-Token': token,
        },
      });

      const result = await validateCSRF(request);
      
      expect(result.valid).toBe(false);
    });

    it('should fail validation with tampered token', async () => {
      const token = generateCSRFToken();
      const [tokenPart, signature] = token.split('.');
      
      // Tamper with the token data
      const decoded = JSON.parse(Buffer.from(tokenPart, 'base64').toString());
      decoded.random = 'tampered-value';
      const tamperedTokenPart = Buffer.from(JSON.stringify(decoded)).toString('base64');
      const tamperedToken = `${tamperedTokenPart}.${signature}`;

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'X-CSRF-Token': tamperedToken,
        },
      });

      const result = await validateCSRF(request);
      
      expect(result.valid).toBe(false);
    });

    it('should handle missing CSRF secret gracefully', async () => {
      delete process.env.CSRF_SECRET;
      
      const request = new NextRequest('http://localhost:3000/api/test');
      
      // Should not throw, but validation should fail
      const result = await validateCSRF(request);
      
      expect(result.valid).toBe(false);
    });

    it('should prioritize header token over cookie token', async () => {
      const headerToken = generateCSRFToken();
      const cookieToken = 'different-token';
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'X-CSRF-Token': headerToken,
        },
      });
      
      // Mock cookies
      jest.spyOn(request.cookies, 'get').mockReturnValue({
        name: 'csrf-token',
        value: cookieToken,
      });

      const result = await validateCSRF(request);
      
      expect(result.valid).toBe(true);
      expect(result.token).toBe(headerToken);
    });
  });

  describe('CSRF Token Lifecycle', () => {
    it('should maintain token validity within 24 hours', async () => {
      const token = generateCSRFToken();
      
      // Mock time to be 23 hours later
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + (23 * 60 * 60 * 1000));
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'X-CSRF-Token': token,
        },
      });

      const result = await validateCSRF(request);
      
      expect(result.valid).toBe(true);
      
      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should reject token after 24 hours', async () => {
      const token = generateCSRFToken();
      
      // Mock time to be 25 hours later
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + (25 * 60 * 60 * 1000));
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'X-CSRF-Token': token,
        },
      });

      const result = await validateCSRF(request);
      
      expect(result.valid).toBe(false);
      
      // Restore Date.now
      Date.now = originalDateNow;
    });
  });
});
