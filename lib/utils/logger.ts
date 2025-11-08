/**
 * Structured logging utility for production use
 * Replaces console.log with environment-aware logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      metadata,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!this.isDevelopment) {
      return level === 'warn' || level === 'error';
    }
    // In development, log everything
    return true;
  }

  debug(message: string, context?: string, metadata?: Record<string, any>) {
    if (this.shouldLog('debug')) {
      const entry = this.formatMessage('debug', message, context, metadata);
      console.debug(`[${entry.context || 'DEBUG'}]`, entry.message, metadata || '');
    }
  }

  info(message: string, context?: string, metadata?: Record<string, any>) {
    if (this.shouldLog('info')) {
      const entry = this.formatMessage('info', message, context, metadata);
      console.info(`[${entry.context || 'INFO'}]`, entry.message, metadata || '');
    }
  }

  warn(message: string, context?: string, metadata?: Record<string, any>) {
    if (this.shouldLog('warn')) {
      const entry = this.formatMessage('warn', message, context, metadata);
      console.warn(`[${entry.context || 'WARN'}]`, entry.message, metadata || '');
    }
  }

  error(message: string, context?: string, metadata?: Record<string, any>) {
    // Always log errors
    const entry = this.formatMessage('error', message, context, metadata);
    console.error(`[${entry.context || 'ERROR'}]`, entry.message, metadata || '');
    
    // In production, you could send errors to an error tracking service here
    // e.g., Sentry, LogRocket, etc.
    if (!this.isDevelopment) {
      // TODO: Integrate with error tracking service
      // Example: Sentry.captureException(new Error(message), { extra: metadata });
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for server-side use
export default logger;

