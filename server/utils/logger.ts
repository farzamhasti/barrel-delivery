/**
 * Logger Utility
 * Simple logging utility for the application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let output = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (data) {
      output += ` ${JSON.stringify(data)}`;
    }
    return output;
  }

  debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage('info', message, data));
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage('warn', message, data));
  }

  error(message: string, data?: any): void {
    console.error(this.formatMessage('error', message, data));
  }
}

export const logger = new Logger();
