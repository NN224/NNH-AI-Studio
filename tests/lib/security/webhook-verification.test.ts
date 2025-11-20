import { describe, it, expect, beforeEach } from '@jest/globals';
import crypto from 'crypto';
import {
  verifyGoogleWebhookSignature,
  validateWebhookPayload,
  extractLocationInfo,
} from '../../../lib/security/webhook-verification';

describe('Webhook Security - Signature Verification', () => {
  const validSecret = 'test-webhook-secret-for-testing';
  const testPayload = JSON.stringify({
    name: 'accounts/123456/locations/789012',
    notificationTypes: ['NEW_REVIEW'],
  });

  function createValidSignature(payload: string, secret: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
    return `${timestamp}.${signature}`;
  }

  function createOldSignature(payload: string, secret: string, ageInSeconds: number): string {
    const timestamp = Math.floor(Date.now() / 1000) - ageInSeconds;
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
    return `${timestamp}.${signature}`;
  }

  describe('Valid Signatures', () => {
    it('should accept webhook with valid signature', () => {
      const signature = createValidSignature(testPayload, validSecret);
      const isValid = verifyGoogleWebhookSignature(testPayload, signature, validSecret);

      expect(isValid).toBe(true);
    });

    it('should accept signature with current timestamp', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${testPayload}`;
      const sig = crypto.createHmac('sha256', validSecret).update(signedPayload, 'utf8').digest('hex');
      const signature = `${timestamp}.${sig}`;

      const isValid = verifyGoogleWebhookSignature(testPayload, signature, validSecret);
      expect(isValid).toBe(true);
    });

    it('should accept signature within 5 minute window', () => {
      // 4 minutes old (within 5 minute window)
      const signature = createOldSignature(testPayload, validSecret, 240);
      const isValid = verifyGoogleWebhookSignature(testPayload, signature, validSecret);

      expect(isValid).toBe(true);
    });
  });

  describe('Invalid Signatures', () => {
    it('should reject webhook without signature', () => {
      const isValid = verifyGoogleWebhookSignature(testPayload, null, validSecret);
      expect(isValid).toBe(false);
    });

    it('should reject webhook with empty signature', () => {
      const isValid = verifyGoogleWebhookSignature(testPayload, '', validSecret);
      expect(isValid).toBe(false);
    });

    it('should reject webhook with invalid signature format', () => {
      const isValid = verifyGoogleWebhookSignature(testPayload, 'invalid-format', validSecret);
      expect(isValid).toBe(false);
    });

    it('should reject webhook with wrong secret', () => {
      const signature = createValidSignature(testPayload, 'wrong-secret');
      const isValid = verifyGoogleWebhookSignature(testPayload, signature, validSecret);

      expect(isValid).toBe(false);
    });

    it('should reject webhook with tampered payload', () => {
      const signature = createValidSignature(testPayload, validSecret);
      const tamperedPayload = testPayload.replace('NEW_REVIEW', 'TAMPERED');

      const isValid = verifyGoogleWebhookSignature(tamperedPayload, signature, validSecret);
      expect(isValid).toBe(false);
    });

    it('should reject webhook with tampered signature', () => {
      const signature = createValidSignature(testPayload, validSecret);
      const tamperedSignature = signature.replace(/[0-9]/, '0'); // Change one digit

      const isValid = verifyGoogleWebhookSignature(testPayload, tamperedSignature, validSecret);
      expect(isValid).toBe(false);
    });

    it('should reject webhook without secret', () => {
      const signature = createValidSignature(testPayload, validSecret);
      const isValid = verifyGoogleWebhookSignature(testPayload, signature, '');

      expect(isValid).toBe(false);
    });
  });

  describe('Replay Attack Prevention', () => {
    it('should reject signature older than 5 minutes', () => {
      // 6 minutes old (outside 5 minute window)
      const signature = createOldSignature(testPayload, validSecret, 360);
      const isValid = verifyGoogleWebhookSignature(testPayload, signature, validSecret);

      expect(isValid).toBe(false);
    });

    it('should reject signature 10 minutes old', () => {
      const signature = createOldSignature(testPayload, validSecret, 600);
      const isValid = verifyGoogleWebhookSignature(testPayload, signature, validSecret);

      expect(isValid).toBe(false);
    });

    it('should reject signature with invalid timestamp', () => {
      const signature = 'not-a-number.somehexstring';
      const isValid = verifyGoogleWebhookSignature(testPayload, signature, validSecret);

      expect(isValid).toBe(false);
    });

    it('should reject signature with future timestamp (clock skew attack)', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 400; // 6+ minutes in future
      const signedPayload = `${futureTimestamp}.${testPayload}`;
      const sig = crypto.createHmac('sha256', validSecret).update(signedPayload, 'utf8').digest('hex');
      const signature = `${futureTimestamp}.${sig}`;

      const isValid = verifyGoogleWebhookSignature(testPayload, signature, validSecret);
      expect(isValid).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty payload', () => {
      const signature = createValidSignature('', validSecret);
      const isValid = verifyGoogleWebhookSignature('', signature, validSecret);

      expect(isValid).toBe(true); // Valid signature for empty payload
    });

    it('should handle very long payload', () => {
      const longPayload = JSON.stringify({
        name: 'accounts/123/locations/456',
        notificationTypes: Array(1000).fill('NEW_REVIEW'),
      });

      const signature = createValidSignature(longPayload, validSecret);
      const isValid = verifyGoogleWebhookSignature(longPayload, signature, validSecret);

      expect(isValid).toBe(true);
    });

    it('should handle Unicode characters in payload', () => {
      const unicodePayload = JSON.stringify({
        name: 'accounts/123/locations/456',
        notificationTypes: ['NEW_REVIEW'],
        text: '你好世界 مرحبا بالعالم 🌍',
      });

      const signature = createValidSignature(unicodePayload, validSecret);
      const isValid = verifyGoogleWebhookSignature(unicodePayload, signature, validSecret);

      expect(isValid).toBe(true);
    });
  });
});

describe('Webhook Security - Payload Validation', () => {
  describe('Valid Payloads', () => {
    it('should accept valid NEW_REVIEW payload', () => {
      const payload = {
        name: 'accounts/123456/locations/789012',
        notificationTypes: ['NEW_REVIEW'],
      };

      expect(validateWebhookPayload(payload)).toBe(true);
    });

    it('should accept valid NEW_QUESTIONS payload', () => {
      const payload = {
        name: 'accounts/123456/locations/789012',
        notificationTypes: ['NEW_QUESTIONS'],
      };

      expect(validateWebhookPayload(payload)).toBe(true);
    });

    it('should accept multiple notification types', () => {
      const payload = {
        name: 'accounts/123456/locations/789012',
        notificationTypes: ['NEW_REVIEW', 'NEW_QUESTIONS', 'LOCATION_VERIFICATION'],
      };

      expect(validateWebhookPayload(payload)).toBe(true);
    });

    it('should accept all valid notification types', () => {
      const validTypes = [
        'NEW_REVIEW',
        'UPDATED_REVIEW',
        'NEW_QUESTIONS',
        'UPDATED_QUESTIONS',
        'NEW_ANSWERS',
        'UPDATED_ANSWERS',
        'LOCATION_VERIFICATION',
        'VOICE_OF_MERCHANT',
        'GOOGLE_UPDATE',
        'DUPLICATE',
      ];

      const payload = {
        name: 'accounts/123456/locations/789012',
        notificationTypes: validTypes,
      };

      expect(validateWebhookPayload(payload)).toBe(true);
    });
  });

  describe('Invalid Payloads', () => {
    it('should reject null payload', () => {
      expect(validateWebhookPayload(null)).toBe(false);
    });

    it('should reject undefined payload', () => {
      expect(validateWebhookPayload(undefined)).toBe(false);
    });

    it('should reject non-object payload', () => {
      expect(validateWebhookPayload('string')).toBe(false);
      expect(validateWebhookPayload(123)).toBe(false);
      expect(validateWebhookPayload(true)).toBe(false);
    });

    it('should reject payload without name', () => {
      const payload = {
        notificationTypes: ['NEW_REVIEW'],
      };

      expect(validateWebhookPayload(payload)).toBe(false);
    });

    it('should reject payload without notificationTypes', () => {
      const payload = {
        name: 'accounts/123456/locations/789012',
      };

      expect(validateWebhookPayload(payload)).toBe(false);
    });

    it('should reject payload with empty notificationTypes', () => {
      const payload = {
        name: 'accounts/123456/locations/789012',
        notificationTypes: [],
      };

      expect(validateWebhookPayload(payload)).toBe(false);
    });

    it('should reject payload with non-array notificationTypes', () => {
      const payload = {
        name: 'accounts/123456/locations/789012',
        notificationTypes: 'NEW_REVIEW',
      };

      expect(validateWebhookPayload(payload)).toBe(false);
    });

    it('should reject payload with invalid notification type', () => {
      const payload = {
        name: 'accounts/123456/locations/789012',
        notificationTypes: ['INVALID_TYPE'],
      };

      expect(validateWebhookPayload(payload)).toBe(false);
    });

    it('should reject payload with mixed valid and invalid types', () => {
      const payload = {
        name: 'accounts/123456/locations/789012',
        notificationTypes: ['NEW_REVIEW', 'INVALID_TYPE'],
      };

      expect(validateWebhookPayload(payload)).toBe(false);
    });

    it('should reject payload with non-string notification type', () => {
      const payload = {
        name: 'accounts/123456/locations/789012',
        notificationTypes: [123, 'NEW_REVIEW'],
      };

      expect(validateWebhookPayload(payload)).toBe(false);
    });
  });
});

describe('Webhook Security - Location Info Extraction', () => {
  it('should extract accountId and locationId from valid name', () => {
    const payload = {
      name: 'accounts/123456/locations/789012',
      notificationTypes: ['NEW_REVIEW'],
    };

    const info = extractLocationInfo(payload);

    expect(info).toEqual({
      accountId: '123456',
      locationId: '789012',
    });
  });

  it('should extract from different account and location IDs', () => {
    const payload = {
      name: 'accounts/999888/locations/111222',
      notificationTypes: ['NEW_QUESTIONS'],
    };

    const info = extractLocationInfo(payload);

    expect(info).toEqual({
      accountId: '999888',
      locationId: '111222',
    });
  });

  it('should return null for invalid name format', () => {
    const payload = {
      name: 'invalid-format',
      notificationTypes: ['NEW_REVIEW'],
    };

    const info = extractLocationInfo(payload);
    expect(info).toBeNull();
  });

  it('should return null for missing name', () => {
    const payload = {
      notificationTypes: ['NEW_REVIEW'],
    };

    const info = extractLocationInfo(payload);
    expect(info).toBeNull();
  });

  it('should return null for non-numeric IDs', () => {
    const payload = {
      name: 'accounts/abc/locations/xyz',
      notificationTypes: ['NEW_REVIEW'],
    };

    const info = extractLocationInfo(payload);
    expect(info).toBeNull();
  });

  it('should return null for incomplete resource path', () => {
    const payload = {
      name: 'accounts/123456',
      notificationTypes: ['NEW_REVIEW'],
    };

    const info = extractLocationInfo(payload);
    expect(info).toBeNull();
  });
});
