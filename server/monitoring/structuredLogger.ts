/**
 * Structured Logging System
 * Centralized logging with request tracing and forecast tracing
 */

import fs from 'fs';
import path from 'path';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
  traceId?: string;
  requestId?: string;
  forecastId?: string;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
  };
}

interface RequestTrace {
  requestId: string;
  method: string;
  endpoint: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  userId?: string;
  error?: string;
  logs: LogEntry[];
}

interface ForecastTrace {
  forecastId: string;
  zoneId: string;
  timestamp: number;
  source: 'ml' | 'heuristic' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  accuracy?: number;
  latency: number;
  success: boolean;
  error?: string;
  reasoning: string;
  learningStatus: 'early_learning' | 'learning' | 'trained' | 'production';
  logs: LogEntry[];
}

/**
 * Structured Logger
 * Centralized logging with tracing capabilities
 */
export class StructuredLogger {
  private logsDir = '.manus-logs';
  private requestTraces: Map<string, RequestTrace> = new Map();
  private forecastTraces: Map<string, ForecastTrace> = new Map();
  private currentRequestId: string | null = null;
  private currentForecastId: string | null = null;

  constructor() {
    this.ensureLogsDirectory();
  }

  /**
   * Ensure logs directory exists
   */
  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start request trace
   */
  startRequestTrace(method: string, endpoint: string, userId?: string): string {
    const requestId = this.generateId();
    const trace: RequestTrace = {
      requestId,
      method,
      endpoint,
      startTime: Date.now(),
      userId,
      logs: [],
    };

    this.requestTraces.set(requestId, trace);
    this.currentRequestId = requestId;
    return requestId;
  }

  /**
   * End request trace
   */
  endRequestTrace(requestId: string, statusCode: number, error?: string): RequestTrace {
    const trace = this.requestTraces.get(requestId);
    if (!trace) {
      throw new Error(`Request trace not found: ${requestId}`);
    }

    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.statusCode = statusCode;
    if (error) {
      trace.error = error;
    }

    this.currentRequestId = null;
    return trace;
  }

  /**
   * Start forecast trace
   */
  startForecastTrace(
    zoneId: string,
    source: 'ml' | 'heuristic' | 'fallback',
    learningStatus: 'early_learning' | 'learning' | 'trained' | 'production'
  ): string {
    const forecastId = this.generateId();
    const trace: ForecastTrace = {
      forecastId,
      zoneId,
      timestamp: Date.now(),
      source,
      confidence: 'medium',
      latency: 0,
      success: false,
      reasoning: '',
      learningStatus,
      logs: [],
    };

    this.forecastTraces.set(forecastId, trace);
    this.currentForecastId = forecastId;
    return forecastId;
  }

  /**
   * End forecast trace
   */
  endForecastTrace(
    forecastId: string,
    success: boolean,
    confidence: 'high' | 'medium' | 'low',
    reasoning: string,
    accuracy?: number,
    error?: string
  ): ForecastTrace {
    const trace = this.forecastTraces.get(forecastId);
    if (!trace) {
      throw new Error(`Forecast trace not found: ${forecastId}`);
    }

    trace.latency = Date.now() - trace.timestamp;
    trace.success = success;
    trace.confidence = confidence;
    trace.reasoning = reasoning;
    if (accuracy !== undefined) {
      trace.accuracy = accuracy;
    }
    if (error) {
      trace.error = error;
    }

    this.currentForecastId = null;
    return trace;
  }

  /**
   * Log message with context
   */
  log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      requestId: this.currentRequestId || undefined,
      forecastId: this.currentForecastId || undefined,
    };

    // Add to current traces
    if (this.currentRequestId) {
      const trace = this.requestTraces.get(this.currentRequestId);
      if (trace) {
        trace.logs.push(entry);
      }
    }

    if (this.currentForecastId) {
      const trace = this.forecastTraces.get(this.currentForecastId);
      if (trace) {
        trace.logs.push(entry);
      }
    }

    // Write to appropriate log file
    this.writeToLogFile(entry);

    // Console output
    this.consoleLog(level, message, context);
  }

  /**
   * Write to log file
   */
  private writeToLogFile(entry: LogEntry): void {
    const logFile = path.join(this.logsDir, `${entry.level}.log`);
    const line = JSON.stringify(entry) + '\n';

    try {
      fs.appendFileSync(logFile, line);

      // Trim log file if it gets too large (>1MB)
      const stats = fs.statSync(logFile);
      if (stats.size > 1024 * 1024) {
        const content = fs.readFileSync(logFile, 'utf-8');
        const lines = content.split('\n');
        const trimmed = lines.slice(-Math.floor(lines.length * 0.6)).join('\n');
        fs.writeFileSync(logFile, trimmed);
      }
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Console output
   */
  private consoleLog(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, any>
  ): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (level === 'error') {
      console.error(prefix, message, context || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, context || '');
    } else if (level === 'debug') {
      if (process.env.DEBUG) {
        console.log(prefix, message, context || '');
      }
    } else {
      console.log(prefix, message, context || '');
    }
  }

  /**
   * Get request trace
   */
  getRequestTrace(requestId: string): RequestTrace | null {
    return this.requestTraces.get(requestId) || null;
  }

  /**
   * Get forecast trace
   */
  getForecastTrace(forecastId: string): ForecastTrace | null {
    return this.forecastTraces.get(forecastId) || null;
  }

  /**
   * Get all request traces
   */
  getAllRequestTraces(): RequestTrace[] {
    return Array.from(this.requestTraces.values());
  }

  /**
   * Get all forecast traces
   */
  getAllForecastTraces(): ForecastTrace[] {
    return Array.from(this.forecastTraces.values());
  }

  /**
   * Export trace to file
   */
  exportTrace(type: 'request' | 'forecast', id: string): string {
    const filename = `${type}-trace-${id}.json`;
    const filepath = path.join(this.logsDir, filename);

    if (type === 'request') {
      const trace = this.getRequestTrace(id);
      if (!trace) {
        throw new Error(`Request trace not found: ${id}`);
      }
      fs.writeFileSync(filepath, JSON.stringify(trace, null, 2));
    } else {
      const trace = this.getForecastTrace(id);
      if (!trace) {
        throw new Error(`Forecast trace not found: ${id}`);
      }
      fs.writeFileSync(filepath, JSON.stringify(trace, null, 2));
    }

    return filepath;
  }

  /**
   * Clear old traces (keep last 1000)
   */
  clearOldTraces(): void {
    const maxTraces = 1000;

    if (this.requestTraces.size > maxTraces) {
      const entries = Array.from(this.requestTraces.entries());
      const sorted = entries.sort((a, b) => a[1].startTime - b[1].startTime);
      const toDelete = sorted.slice(0, sorted.length - maxTraces);

      toDelete.forEach(([key]) => {
        this.requestTraces.delete(key);
      });
    }

    if (this.forecastTraces.size > maxTraces) {
      const entries = Array.from(this.forecastTraces.entries());
      const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = sorted.slice(0, sorted.length - maxTraces);

      toDelete.forEach(([key]) => {
        this.forecastTraces.delete(key);
      });
    }
  }
}

// Export singleton instance
export const structuredLogger = new StructuredLogger();
