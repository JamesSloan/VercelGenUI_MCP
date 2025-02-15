export interface LoggerConfig {
  debug?: boolean;
}

export class Logger {
  private isDebugEnabled: boolean;

  constructor(config: LoggerConfig = {}) {
    this.isDebugEnabled = config.debug || false;
  }

  info(...args: any[]): void {
    console.log('[INFO]', ...args);
  }

  error(...args: any[]): void {
    console.error('[ERROR]', ...args);
  }

  warn(...args: any[]): void {
    console.warn('[WARN]', ...args);
  }

  logDebug(...args: any[]): void {
    if (this.isDebugEnabled) {
      console.debug('[DEBUG]', ...args);
    }
  }
} 