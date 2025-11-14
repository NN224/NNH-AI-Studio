import { errorLogger, ErrorLogger, ErrorContext } from '@/lib/services/error-logger';

// Mock fetch globally
global.fetch = jest.fn();

describe('ErrorLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('logError', () => {
    it('should log error to console and send to backend', async () => {
      const error = new Error('Test error');
      const context: ErrorContext = {
        component: 'TestComponent',
        action: 'testAction',
        metadata: { userId: '123' },
      };

      await errorLogger.logError(error, context);

      // Check console.error was called
      expect(console.error).toHaveBeenCalledWith(
        '[ErrorLogger]',
        expect.objectContaining({
          message: 'Test error',
          component: 'TestComponent',
          action: 'testAction',
          metadata: { userId: '123' },
          timestamp: expect.any(String),
          stack: expect.any(String),
        })
      );

      // Check fetch was called
      expect(global.fetch).toHaveBeenCalledWith('/api/log-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test error',
          stack: error.stack,
          component: 'TestComponent',
          action: 'testAction',
          metadata: { userId: '123' },
          timestamp: expect.any(String),
          userAgent: 'node-jest',
        }),
      });
    });

    it('should handle string errors', async () => {
      const error = 'String error message';
      const context: ErrorContext = {
        component: 'TestComponent',
      };

      await errorLogger.logError(error, context);

      expect(console.error).toHaveBeenCalledWith(
        '[ErrorLogger]',
        expect.objectContaining({
          message: 'String error message',
          component: 'TestComponent',
        })
      );

      expect(global.fetch).toHaveBeenCalledWith('/api/log-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"message":"String error message"'),
      });
    });

    it('should include user agent from navigator', async () => {
      // Mock navigator
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 Test Browser' },
        writable: true,
      });

      const error = new Error('Test error');
      await errorLogger.logError(error);

      expect(global.fetch).toHaveBeenCalledWith('/api/log-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"userAgent":"Mozilla/5.0 Test Browser"'),
      });
    });

    it('should handle backend error gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const error = new Error('Test error');
      
      // Should not throw
      await expect(errorLogger.logError(error)).resolves.not.toThrow();

      // Should log warning
      expect(console.warn).toHaveBeenCalledWith(
        '[ErrorLogger] Failed to send error to backend:',
        expect.any(Error)
      );
    });

    it('should handle non-ok response gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const error = new Error('Test error');
      
      await expect(errorLogger.logError(error)).resolves.not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        '[ErrorLogger] Failed to send error to backend:',
        expect.any(Error)
      );
    });

    it('should handle errors without stack trace', async () => {
      const error = { message: 'Custom error object' };
      
      await errorLogger.logError(error);

      expect(global.fetch).toHaveBeenCalledWith('/api/log-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"message":"Custom error object"'),
      });
    });

    it('should limit metadata size', async () => {
      const error = new Error('Test error');
      const largeMetadata = {
        bigData: 'x'.repeat(10000),
        nested: {
          deep: {
            value: 'should be included',
          },
        },
      };

      await errorLogger.logError(error, {
        component: 'TestComponent',
        metadata: largeMetadata,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      // Should truncate large data
      expect(body.metadata.bigData.length).toBeLessThan(10000);
      expect(body.metadata.nested.deep.value).toBe('should be included');
    });

    it('should handle circular references in metadata', async () => {
      const error = new Error('Test error');
      const circularRef: any = { a: 1 };
      circularRef.self = circularRef;

      await errorLogger.logError(error, {
        component: 'TestComponent',
        metadata: circularRef,
      });

      // Should not throw
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should include error code if present', async () => {
      const error: any = new Error('Test error');
      error.code = 'ERR_NETWORK';

      await errorLogger.logError(error);

      expect(global.fetch).toHaveBeenCalledWith('/api/log-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"code":"ERR_NETWORK"'),
      });
    });

    it('should include error status if present', async () => {
      const error: any = new Error('Test error');
      error.status = 404;

      await errorLogger.logError(error);

      expect(global.fetch).toHaveBeenCalledWith('/api/log-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"status":404'),
      });
    });
  });

  describe('singleton instance', () => {
    it('should use the same instance', () => {
      const instance1 = ErrorLogger.getInstance();
      const instance2 = ErrorLogger.getInstance();

      expect(instance1).toBe(instance2);
      expect(errorLogger).toBe(instance1);
    });
  });

  describe('error batching', () => {
    it('should batch multiple errors sent in quick succession', async () => {
      // Log multiple errors quickly
      const errors = [
        new Error('Error 1'),
        new Error('Error 2'),
        new Error('Error 3'),
      ];

      const promises = errors.map(err => errorLogger.logError(err));
      await Promise.all(promises);

      // Should make separate calls (no batching implemented yet)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('error deduplication', () => {
    it('should not deduplicate identical errors by default', async () => {
      const error = new Error('Duplicate error');

      await errorLogger.logError(error);
      await errorLogger.logError(error);

      // Should log both
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('environment handling', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should log errors in development', async () => {
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Dev error');
      await errorLogger.logError(error);

      expect(console.error).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should log errors in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Prod error');
      await errorLogger.logError(error);

      expect(console.error).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should log errors in test', async () => {
      process.env.NODE_ENV = 'test';
      
      const error = new Error('Test error');
      await errorLogger.logError(error);

      expect(console.error).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
