// src/server/config.ts
import fs from 'fs';
import path from 'path';

export interface TradingConfig {
  testMode: {
    enabled: boolean;
    symbol: string;
    tradeAmountUsdt: number;
    holdSeconds: number;
    maxRounds: number;
    useTestnet: boolean;
    logLevel: string;
  };
  trading: {
    defaultSymbol: string;
    defaultMode: string;
    allowedSymbols: string[];
    maxOpenPositions: number;
    defaultOrderType: string;
  };
  risk: {
    maxDrawdownPct: number;
    maxLeverage: number;
    maxPositionSizePct: number;
    maxPortfolioExposurePct: number;
    minConfidence: number;
    maxDailyLossUsdt: number;
  };
  circuitBreaker: {
    warningDrawdownPct: number;
    criticalDrawdownPct: number;
    maxConsecutiveLosses: number;
    cooldownMs: number;
  };
  exchange: {
    id: string;
    rateLimit: boolean;
    maxRetries: number;
    retryDelayMs: number;
    timeoutMs: number;
  };
  fees: {
    spotTakerPct: number;
    spotMakerPct: number;
    performanceFeePct: number;
  };
}

const CONFIG_PATH = path.join(process.cwd(), 'config', 'trading_params.json');

function validateConfig(config: Record<string, unknown>): boolean {
  if (!config.testMode || typeof config.testMode !== 'object') {
    throw new Error('Invalid config: testMode section missing or not an object');
  }
  if (!config.trading || typeof config.trading !== 'object') {
    throw new Error('Invalid config: trading section missing or not an object');
  }
  if (!config.risk || typeof config.risk !== 'object') {
    throw new Error('Invalid config: risk section missing or not an object');
  }
  if (!config.exchange || typeof config.exchange !== 'object') {
    throw new Error('Invalid config: exchange section missing or not an object');
  }

  const risk = config.risk as Record<string, unknown>;
  if (typeof risk.maxDrawdownPct !== 'number' || risk.maxDrawdownPct <= 0 || risk.maxDrawdownPct > 100) {
    throw new Error('Invalid config: risk.maxDrawdownPct must be between 0 and 100');
  }
  if (typeof risk.maxLeverage !== 'number' || risk.maxLeverage < 1 || risk.maxLeverage > 125) {
    throw new Error('Invalid config: risk.maxLeverage must be between 1 and 125');
  }

  return true;
}

export function loadTradingConfig(): TradingConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`[CONFIG] FATAL: Config file not found at ${CONFIG_PATH}`);
    console.error(`[CONFIG] Create it with: cp config/trading_params.json.example config/trading_params.json`);
    console.warn('[CONFIG] Using built-in defaults');

    return getDefaultConfig();
  }

  try {
    const rawConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(rawConfig);
    validateConfig(config);
    console.log('[CONFIG] Loaded successfully from', CONFIG_PATH);
    return config as TradingConfig;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[CONFIG] Failed to load config:', message);
    console.warn('[CONFIG] Using built-in defaults');
    return getDefaultConfig();
  }
}

function getDefaultConfig(): TradingConfig {
  return {
    testMode: {
      enabled: false,
      symbol: 'BTC/USDT',
      tradeAmountUsdt: 20,
      holdSeconds: 30,
      maxRounds: 1,
      useTestnet: false,
      logLevel: 'verbose',
    },
    trading: {
      defaultSymbol: 'BTC/USDT',
      defaultMode: 'paper',
      allowedSymbols: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
      maxOpenPositions: 5,
      defaultOrderType: 'market',
    },
    risk: {
      maxDrawdownPct: 5,
      maxLeverage: 10,
      maxPositionSizePct: 10,
      maxPortfolioExposurePct: 40,
      minConfidence: 0.6,
      maxDailyLossUsdt: 5000,
    },
    circuitBreaker: {
      warningDrawdownPct: 3,
      criticalDrawdownPct: 5,
      maxConsecutiveLosses: 5,
      cooldownMs: 300_000,
    },
    exchange: {
      id: 'binance',
      rateLimit: true,
      maxRetries: 3,
      retryDelayMs: 2000,
      timeoutMs: 30000,
    },
    fees: {
      spotTakerPct: 0.1,
      spotMakerPct: 0.1,
      performanceFeePct: 2.0,
    },
  };
}

let cachedConfig: TradingConfig | null = null;

export function getTradingConfig(): TradingConfig {
  if (!cachedConfig) {
    cachedConfig = loadTradingConfig();
  }
  return cachedConfig;
}

export function reloadConfig(): TradingConfig {
  cachedConfig = null;
  return getTradingConfig();
}
