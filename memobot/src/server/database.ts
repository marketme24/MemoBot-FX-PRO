// src/server/database.ts
import fs from 'fs';
import path from 'path';

interface DatabaseConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
}

interface TradeRecord {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  quoteQty: number;
  commission: number;
  commissionAsset: string;
  realizedPnl: number;
  mode: 'real' | 'paper';
  status: string;
  timestamp: string;
  orderId: string;
  strategy?: string;
}

interface BalanceSnapshot {
  id: string;
  totalEquity: number;
  availableBalance: number;
  unrealizedPnl: number;
  timestamp: string;
}

interface DatabaseState {
  trades: TradeRecord[];
  balanceSnapshots: BalanceSnapshot[];
  metadata: {
    createdAt: string;
    lastUpdated: string;
    version: string;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'memobot_db.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDbConfig(): DatabaseConfig {
  return {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'memobot_db',
  };
}

class Database {
  private state: DatabaseState;
  private saveDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    ensureDataDir();
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('[DATABASE] Failed to load state, starting fresh:', e);
    }
    return {
      trades: [],
      balanceSnapshots: [],
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  }

  private save() {
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveDebounce = setTimeout(() => {
      try {
        this.state.metadata.lastUpdated = new Date().toISOString();
        const data = JSON.stringify(this.state, null, 2);
        // Atomic write: write to temp file then rename to prevent corruption
        const tmpPath = DB_PATH + '.tmp';
        fs.writeFileSync(tmpPath, data);
        fs.renameSync(tmpPath, DB_PATH);
      } catch (e) {
        console.error('[DATABASE] Failed to persist state:', e);
      }
    }, 500);
  }

  public insertTrade(trade: Omit<TradeRecord, 'id'>): TradeRecord {
    const record: TradeRecord = {
      id: `TRD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      ...trade,
    };
    this.state.trades.push(record);
    this.save();
    return record;
  }

  public getTradesBySymbol(symbol: string, limit = 100): TradeRecord[] {
    return this.state.trades
      .filter((t) => t.symbol === symbol)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public getTradesByMode(mode: 'real' | 'paper', limit = 100): TradeRecord[] {
    return this.state.trades
      .filter((t) => t.mode === mode)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public getRecentTrades(limit = 50): TradeRecord[] {
    return this.state.trades
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public insertBalanceSnapshot(snapshot: Omit<BalanceSnapshot, 'id'>): BalanceSnapshot {
    const record: BalanceSnapshot = {
      id: `BAL-${Date.now()}`,
      ...snapshot,
    };
    this.state.balanceSnapshots.push(record);
    if (this.state.balanceSnapshots.length > 2880) {
      this.state.balanceSnapshots = this.state.balanceSnapshots.slice(-2880);
    }
    this.save();
    return record;
  }

  public getBalanceHistory(limit = 100): BalanceSnapshot[] {
    return this.state.balanceSnapshots
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public getDailyPnl(date?: string): number {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.state.trades
      .filter((t) => t.timestamp.startsWith(targetDate))
      .reduce((sum, t) => sum + t.realizedPnl, 0);
  }

  public getTradeCount(): number {
    return this.state.trades.length;
  }

  public getConfig(): DatabaseConfig {
    return getDbConfig();
  }

  public getStats() {
    const trades = this.state.trades;
    const wins = trades.filter((t) => t.realizedPnl > 0);
    const losses = trades.filter((t) => t.realizedPnl < 0);
    const totalPnl = trades.reduce((s, t) => s + t.realizedPnl, 0);
    const totalFees = trades.reduce((s, t) => s + t.commission, 0);

    return {
      totalTrades: trades.length,
      winCount: wins.length,
      lossCount: losses.length,
      winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
      totalPnl,
      totalFees,
      netPnl: totalPnl - totalFees,
      avgWin: wins.length > 0 ? wins.reduce((s, t) => s + t.realizedPnl, 0) / wins.length : 0,
      avgLoss: losses.length > 0 ? losses.reduce((s, t) => s + t.realizedPnl, 0) / losses.length : 0,
      lastUpdated: this.state.metadata.lastUpdated,
    };
  }
}

export const database = new Database();
