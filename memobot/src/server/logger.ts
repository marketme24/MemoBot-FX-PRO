// src/server/logger.ts
import fs from 'fs';
import path from 'path';

export type LogCategory = 'engine' | 'execution' | 'reconciliation' | 'error';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: Record<string, unknown>;
}

const LOG_DIR = path.join(process.cwd(), 'logs');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10 MB per file before rotation

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function getLogFilePath(category: LogCategory): string {
  return path.join(LOG_DIR, `${category}_${getDateString()}.log`);
}

function rotateIfNeeded(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size >= MAX_LOG_SIZE) {
        const rotatedPath = filePath.replace('.log', `_${Date.now()}.log.bak`);
        fs.renameSync(filePath, rotatedPath);
      }
    }
  } catch (e) {
    // rotation failure is non-fatal
  }
}

function formatEntry(entry: LogEntry): string {
  const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category.toUpperCase()}] ${entry.message}${dataStr}\n`;
}

class Logger {
  private buffer: Map<LogCategory, string[]> = new Map();
  private flushInterval: ReturnType<typeof setInterval>;

  constructor() {
    ensureLogDir();
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  private write(entry: LogEntry) {
    const line = formatEntry(entry);

    // Console output for non-debug
    if (entry.level !== 'debug') {
      const colorMap: Record<LogLevel, string> = {
        debug: '\x1b[90m',
        info: '\x1b[36m',
        warn: '\x1b[33m',
        error: '\x1b[31m',
        fatal: '\x1b[41m\x1b[37m',
      };
      const reset = '\x1b[0m';
      console.log(`${colorMap[entry.level]}${line.trim()}${reset}`);
    }

    // Buffer for batch file writes
    const existing = this.buffer.get(entry.category) || [];
    existing.push(line);
    this.buffer.set(entry.category, existing);

    // Immediate flush for errors
    if (entry.level === 'error' || entry.level === 'fatal') {
      this.flushCategory(entry.category);
    }
  }

  private flushCategory(category: LogCategory) {
    const lines = this.buffer.get(category);
    if (!lines || lines.length === 0) return;

    try {
      const filePath = getLogFilePath(category);
      rotateIfNeeded(filePath);
      fs.appendFileSync(filePath, lines.join(''));
      this.buffer.set(category, []);
    } catch (e) {
      console.error(`[LOGGER] Failed to flush ${category}:`, e);
    }
  }

  private flush() {
    const categories: LogCategory[] = ['engine', 'execution', 'reconciliation', 'error'];
    for (const cat of categories) {
      this.flushCategory(cat);
    }
  }

  public engine(level: LogLevel, message: string, data?: Record<string, unknown>) {
    this.write({ timestamp: new Date().toISOString(), level, category: 'engine', message, data });
  }

  public execution(level: LogLevel, message: string, data?: Record<string, unknown>) {
    this.write({ timestamp: new Date().toISOString(), level, category: 'execution', message, data });
  }

  public reconciliation(level: LogLevel, message: string, data?: Record<string, unknown>) {
    this.write({ timestamp: new Date().toISOString(), level, category: 'reconciliation', message, data });
  }

  public error(message: string, data?: Record<string, unknown>) {
    this.write({ timestamp: new Date().toISOString(), level: 'error', category: 'error', message, data });
  }

  public fatal(message: string, data?: Record<string, unknown>) {
    this.write({ timestamp: new Date().toISOString(), level: 'fatal', category: 'error', message, data });
    this.flush();
  }

  public info(category: LogCategory, message: string, data?: Record<string, unknown>) {
    this.write({ timestamp: new Date().toISOString(), level: 'info', category, message, data });
  }

  public warn(category: LogCategory, message: string, data?: Record<string, unknown>) {
    this.write({ timestamp: new Date().toISOString(), level: 'warn', category, message, data });
  }

  public cleanup() {
    clearInterval(this.flushInterval);
    this.flush();
  }
}

export const logger = new Logger();
