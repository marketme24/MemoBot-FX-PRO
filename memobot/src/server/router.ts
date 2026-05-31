import { router, publicProcedure, protectedProcedure, adminProcedure, createSession, invalidateSession } from './_core/context';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import ccxt from 'ccxt';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { engineManager, TradingMode } from './engine_manager';
import { iBrain } from './ibrain';
import { database } from './database';
import { globalRiskEngine } from './risk_engine';
import { BinanceWS } from './binance_ws';

// --- Persistent store file paths ---
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const API_KEYS_FILE = path.join(DATA_DIR, 'api_keys.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function atomicWrite(filePath: string, data: string) {
  ensureDataDir();
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, filePath);
}

// --- AES-256 encryption for API key storage at rest ---
const ENCRYPTION_KEY = crypto.createHash('sha256').update(process.env.API_KEY_ENCRYPTION_KEY || process.env.ADMIN_PASSWORD || 'memobot-default-key').digest();

function encryptValue(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptValue(ciphertext: string): string {
  const [ivHex, encrypted] = ciphertext.split(':');
  if (!ivHex || !encrypted) return ciphertext; // legacy unencrypted value
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return ciphertext; // fallback for legacy unencrypted data
  }
}

// --- Persistent API key storage (encrypted at rest) ---
interface ApiKeyEntry { apiKey: string; apiSecret: string; }
interface EncryptedApiKeyEntry { apiKey: string; apiSecret: string; encrypted?: boolean; }
const apiKeyStore = new Map<string, ApiKeyEntry>();

function loadApiKeys() {
  try {
    if (fs.existsSync(API_KEYS_FILE)) {
      const entries: Record<string, EncryptedApiKeyEntry> = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf-8'));
      for (const [k, v] of Object.entries(entries)) {
        if (v.encrypted) {
          apiKeyStore.set(k, { apiKey: decryptValue(v.apiKey), apiSecret: decryptValue(v.apiSecret) });
        } else {
          // Migrate unencrypted keys — will be re-saved encrypted
          apiKeyStore.set(k, v);
        }
      }
      // Re-save to encrypt any legacy plaintext entries
      saveApiKeys();
    }
  } catch { /* start fresh */ }
}

function saveApiKeys() {
  const obj: Record<string, EncryptedApiKeyEntry> = {};
  for (const [k, v] of apiKeyStore.entries()) {
    obj[k] = { apiKey: encryptValue(v.apiKey), apiSecret: encryptValue(v.apiSecret), encrypted: true };
  }
  atomicWrite(API_KEYS_FILE, JSON.stringify(obj, null, 2));
}

loadApiKeys();

// --- Persistent user credential store with bcrypt ---
interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
}

const userStore = new Map<string, StoredUser>();

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const users: StoredUser[] = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      for (const u of users) userStore.set(u.email, u);
    }
  } catch { /* start fresh */ }
}

function saveUsers() {
  const arr = Array.from(userStore.values());
  atomicWrite(USERS_FILE, JSON.stringify(arr, null, 2));
}

loadUsers();

// Seed admin user from environment (only if not already persisted)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@memobot.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (ADMIN_PASSWORD && !userStore.has(ADMIN_EMAIL)) {
  const adminId = crypto.randomUUID();
  userStore.set(ADMIN_EMAIL, {
    id: adminId,
    email: ADMIN_EMAIL,
    passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
    role: 'admin',
  });
  saveUsers();
}

// --- Login attempt rate limiting ---
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(email: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(email);
  if (entry && now < entry.resetAt && entry.count >= MAX_LOGIN_ATTEMPTS) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Too many login attempts. Try again in ${Math.ceil((entry.resetAt - now) / 60000)} minutes.`,
    });
  }
}

function recordLoginAttempt(email: string) {
  const now = Date.now();
  const entry = loginAttempts.get(email);
  if (!entry || now >= entry.resetAt) {
    loginAttempts.set(email, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count++;
  }
}

function clearLoginAttempts(email: string) {
  loginAttempts.delete(email);
}

export function setApiKeys(userId: string, apiKey: string, apiSecret: string) {
  apiKeyStore.set(userId, { apiKey, apiSecret });
  saveApiKeys();
}

export function getApiKeys(userId: string): { apiKey: string; apiSecret: string } | undefined {
  return apiKeyStore.get(userId);
}

let botLogs: any[] = [
   { id: 1, timestamp: new Date(Date.now() - 5000), message: 'System Initialized', level: 'info', mode: 'global' }
];

(global as any).addBotLog = (message: string, level: string, mode: string) => {
   botLogs.unshift({ id: Math.random(), timestamp: new Date(), message, level, mode });
};

const userInvoicesMap = new Map<string, any[]>();

let tickers = [
  { symbol: 'BTC/USDT', price: 0, change24h: '0', high24h: 0, low24h: 0, volume: '0' },
  { symbol: 'ETH/USDT', price: 0, change24h: '0', high24h: 0, low24h: 0, volume: '0' },
  { symbol: 'SOL/USDT', price: 0, change24h: '0', high24h: 0, low24h: 0, volume: '0' }
];

// Subscribe to real Binance WS prices and update tickers
BinanceWS.onPrice((rawSymbol: string, price: number) => {
  const symbolMap: Record<string, string> = { BTCUSDT: 'BTC/USDT', ETHUSDT: 'ETH/USDT', SOLUSDT: 'SOL/USDT' };
  const mappedSymbol = symbolMap[rawSymbol];
  if (mappedSymbol) {
    const ticker = tickers.find(t => t.symbol === mappedSymbol);
    if (ticker) {
      const oldPrice = ticker.price;
      ticker.price = price;
      if (oldPrice > 0) {
        const changePct = ((price - oldPrice) / oldPrice) * 100;
        ticker.change24h = (changePct >= 0 ? '+' : '') + changePct.toFixed(2);
      }
      if (price > ticker.high24h || ticker.high24h === 0) ticker.high24h = price;
      if (price < ticker.low24h || ticker.low24h === 0) ticker.low24h = price;
    }
  }
});

// Initialize default paper bot for the dashboard to always have something
engineManager.startBot('bot_paper', 'Bot paper', 'paper', 'binance', 'BTC/USDT');

// Initial price fetch via REST for tickers that don't have WS data yet
(async () => {
  try {
    const publicExchange = new ccxt.binance({ enableRateLimit: true });
    const [btc, eth, sol] = await Promise.all([
      publicExchange.fetchTicker('BTC/USDT').catch(() => null),
      publicExchange.fetchTicker('ETH/USDT').catch(() => null),
      publicExchange.fetchTicker('SOL/USDT').catch(() => null),
    ]);
    if (btc?.last) { const t = tickers.find(x => x.symbol === 'BTC/USDT'); if (t) { t.price = btc.last; t.high24h = btc.high || t.high24h; t.low24h = btc.low || t.low24h; } }
    if (eth?.last) { const t = tickers.find(x => x.symbol === 'ETH/USDT'); if (t) { t.price = eth.last; t.high24h = eth.high || t.high24h; t.low24h = eth.low || t.low24h; } }
    if (sol?.last) { const t = tickers.find(x => x.symbol === 'SOL/USDT'); if (t) { t.price = sol.last; t.high24h = sol.high || t.high24h; t.low24h = sol.low || t.low24h; } }
  } catch { /* WS will fill in prices */ }
})();

setInterval(() => {
  // Update Paper Engine prices
  const paperBots = engineManager.getBotsByMode('paper');
  for (const bot of paperBots) {
    if (bot.paperEngine) {
      bot.paperEngine.updatePrices(tickers);
    }
  }

  // Paper bots now rely on the engine_manager strategy loop for trade decisions.
  // Removed random trade injection that was polluting analytics.
}, 3000);

// --- Daily midnight reset for PnL tracking & circuit breaker ---
import { circuitBreaker } from './circuit_breaker';
import { evaluationStateMachine } from './state_machine';

function scheduleMidnightReset() {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setUTCHours(24, 0, 0, 0);
  const msUntilMidnight = nextMidnight.getTime() - now.getTime();

  setTimeout(() => {
    console.log('[SCHEDULER] Midnight UTC reset: clearing daily PnL and circuit breaker.');
    circuitBreaker.resetDaily();
    // Reset daily realized PnL on all real engines
    for (const bot of engineManager.getBotsByMode('real')) {
      if (bot.realEngine) bot.realEngine.dailyRealizedPnl = 0;
    }
    // Cleanup stale state machine evaluations
    evaluationStateMachine.cleanup();
    // Reschedule for next midnight
    scheduleMidnightReset();
  }, msUntilMidnight);
}
scheduleMidnightReset();

// Periodic state machine cleanup (every 5 minutes)
setInterval(() => evaluationStateMachine.cleanup(), 5 * 60 * 1000);

// Initialize portfolio exposure from existing positions
engineManger_initPortfolio();
function engineManger_initPortfolio() {
  try { engineManager.initPortfolioFromPositions(); } catch { /* no positions yet */ }
}

// --- Global risk config (mutable via risk.updateConfig) ---
const globalRiskConfig = {
  globalOverrideEnabled: true,
  maxDailyDrawdown: 5,
  hedgingEnabled: true,
  rebalanceOnExtremeVol: true,
};

const userActivitiesMap = new Map<string, any[]>();
function addUserActivity(userId: string, category: string, message: string, level: string = 'info') {
  const acts = userActivitiesMap.get(userId) || [];
  acts.unshift({ id: Math.random().toString(), timestamp: new Date(), category, message, level });
  userActivitiesMap.set(userId, acts);
}

// Initial populate
addUserActivity('1', 'login', 'User login via standard auth', 'info');
addUserActivity('1', 'settings', 'Changed theme to dark mode', 'info');
addUserActivity('1', 'trade', 'Live BOT executed +0.1000 USDT on BTC/USDT', 'success');
addUserActivity('1', 'billing', 'Auto-billed 0.002 USDT for performance fee successfully', 'success');
addUserActivity('2', 'login', 'User login from new IP address', 'warning');
addUserActivity('2', 'trade', 'Live BOT executed -0.0500 USDT on ETH/USDT', 'error');


const globalBotSettings = {
  voiceEnabled: false,
  notificationEnabled: false
};

export const appRouter = router({
  auth: router({
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(({ input }) => {
        checkRateLimit(input.email);
        const user = userStore.get(input.email);
        if (!user || !bcrypt.compareSync(input.password, user.passwordHash)) {
          recordLoginAttempt(input.email);
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password.',
          });
        }
        clearLoginAttempts(input.email);
        const token = createSession(user.id, user.email, user.role);
        return {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.email.split('@')[0],
            role: user.role,
          }
        };
      }),
    register: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(8) }))
      .mutation(({ input }) => {
        if (userStore.has(input.email)) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User already exists.',
          });
        }
        const userId = crypto.randomUUID();
        const user: StoredUser = {
          id: userId,
          email: input.email,
          passwordHash: bcrypt.hashSync(input.password, 10),
          role: 'user',
        };
        userStore.set(input.email, user);
        saveUsers();
        const token = createSession(userId, input.email, 'user');
        return {
          token,
          user: {
            id: userId,
            email: input.email,
            name: input.email.split('@')[0],
            role: 'user' as const,
          }
        };
      }),
    logout: protectedProcedure.mutation(({ ctx }) => {
      const authHeader = ctx.req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        invalidateSession(authHeader.slice(7));
      }
      return { success: true };
    }),
    me: protectedProcedure.query(({ ctx }) => {
      return {
        id: ctx.session.userId,
        email: ctx.session.email,
        role: ctx.session.role,
      };
    }),
    setApiKeys: protectedProcedure
      .input(z.object({ apiKey: z.string(), apiSecret: z.string() }))
      .mutation(({ ctx, input }) => {
        setApiKeys(ctx.session.userId, input.apiKey, input.apiSecret);
        return { success: true };
      }),
  }),
  admin: router({
    getUsers: adminProcedure.query(() => {
      return Array.from(userStore.values()).map(u => ({
        id: u.id,
        name: u.email.split('@')[0],
        email: u.email,
        role: u.role,
        status: 'active',
        hasApiKeys: apiKeyStore.has(u.id),
      }));
    }),
    addUser: adminProcedure
      .input(z.object({ name: z.string(), email: z.string(), plan: z.string() }))
      .mutation(({ input }) => {
        const usersMap = (global as any).usersMap || new Map([
          ['1', { id: '1', name: 'Maher Fekri', email: 'maher@example.com', subscriptionPlan: 'elite', bots: [{ status: 'running' }], status: 'active' }]
        ]);
        const id = Math.random().toString(36).substring(7);
        const newUser = { id, name: input.name, email: input.email, subscriptionPlan: input.plan, bots: [{ status: 'stopped' }], status: 'active' };
        usersMap.set(id, newUser);
        (global as any).usersMap = usersMap;
        return { success: true, user: newUser };
      }),
    updateUserStatus: adminProcedure
      .input(z.object({ userId: z.string(), status: z.enum(['active', 'suspended', 'deactivated']) }))
      .mutation(({ input }) => {
        const usersMap = (global as any).usersMap;
        const user = usersMap?.get(input.userId);
        if (user) {
          user.status = input.status;
          usersMap.set(input.userId, user);
        }
        return { success: true, status: input.status };
      }),
    getUserActivities: adminProcedure
      .input(z.object({ userId: z.string() }))
      .query(({ input }) => {
        return userActivitiesMap.get(input.userId) || Array.from(userActivitiesMap.values()).flat().slice(0, 10);
      }),
    getUserInvoices: adminProcedure
      .input(z.object({ userId: z.string() }))
      .query(({ input }) => {
        return userInvoicesMap.get(input.userId) || [];
      }),
    markInvoicePaid: adminProcedure
      .input(z.object({ userId: z.string(), invoiceId: z.string() }))
      .mutation(({ input }) => {
        const invs = userInvoicesMap.get(input.userId);
        if (invs) {
          const inv = invs.find(i => i.id === input.invoiceId);
          if (inv) inv.status = 'paid';
          userInvoicesMap.set(input.userId, invs);
        }
        return { success: true };
      }),
    getProfile: protectedProcedure.query(() => {
       const pb = engineManager.getBotsByMode('paper')[0]?.paperEngine?.balance || 0;
       // Fetch real balance from the live engine's cached balance
       let liveBalance = 0;
       const realBots = engineManager.getBotsByMode('real');
       for (const bot of realBots) {
         if (bot.realEngine) {
           liveBalance += bot.realEngine.cachedBalance || 0;
         }
       }
       return {
         liveBalance: liveBalance.toFixed(2),
         paperBalance: pb.toFixed(2)
       }
    }),
    verifyPin: protectedProcedure
      .input(z.object({ pin: z.string().length(4) }))
      .mutation(({ ctx, input }) => {
        const user = Array.from(userStore.values()).find(u => u.id === ctx.session.userId);
        if (!user) return { success: false };
        return { success: bcrypt.compareSync(input.pin, user.passwordHash) };
      }),
    updateSubscription: adminProcedure
      .input(z.object({ userId: z.string(), plan: z.string() }))
      .mutation(({ input }) => {
        const usersMap = (global as any).usersMap;
        const user = usersMap?.get(input.userId);
        if (user) {
          user.subscriptionPlan = input.plan;
          usersMap.set(input.userId, user);
        }
        return { success: true, plan: input.plan };
      }),
    forceStopBot: adminProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(({ input }) => {
        // Mock logic
        return { success: true };
      })
  }),
  ai: router({
    getMarketVerdict: protectedProcedure
      .input(z.object({ symbol: z.string(), lang: z.string().optional() }))
      .query(() => {
        const intel = iBrain.state.marketIntel;
        const verdictMap = { BULLISH: 'Bullish', BEARISH: 'Bearish', SIDEWAYS: 'Neutral' } as const;
        const confidence = Math.round(Math.abs(intel.momentumScore) * 100);
        const reasons: string[] = [];
        if (intel.volatility > 0.5) reasons.push('High Volatility Detected');
        if (intel.trend === 'BULLISH') reasons.push('Upward Trend (SMA Crossover)');
        if (intel.trend === 'BEARISH') reasons.push('Downward Trend (SMA Crossover)');
        if (intel.momentumScore > 0.3) reasons.push('Positive Momentum (RSI + ROC)');
        if (intel.momentumScore < -0.3) reasons.push('Negative Momentum (RSI + ROC)');
        if (intel.riskLevel === 'HIGH' || intel.riskLevel === 'EXTREME') reasons.push(`Risk Level: ${intel.riskLevel}`);
        if (reasons.length === 0) reasons.push('Market Consolidating');
        return {
          verdict: verdictMap[intel.trend],
          confidence,
          summary: `Market is ${intel.trend.toLowerCase()} with ${intel.riskLevel.toLowerCase()} risk. Volatility: ${(intel.volatility * 100).toFixed(1)}%. Liquidity: ${(intel.liquidity * 100).toFixed(1)}%.`,
          reasons
        };
      }),
    getPortfolioOptimization: protectedProcedure
      .input(z.object({ lang: z.string().optional() }))
      .query(() => {
        const intel = iBrain.state.marketIntel;
        const optimizations: { title: string; description: string }[] = [];
        if (intel.volatility > 0.5) {
          optimizations.push({ title: 'Volatility Dampening', description: 'Reduce leverage and position sizes during high volatility.' });
        }
        if (intel.riskLevel === 'HIGH' || intel.riskLevel === 'EXTREME') {
          optimizations.push({ title: 'Risk Reduction', description: 'Move exposure to stablecoins until risk level decreases.' });
        }
        if (intel.trend === 'BULLISH' && intel.momentumScore > 0.3) {
          optimizations.push({ title: 'Trend Alignment', description: 'Increase allocation to trending assets with positive momentum.' });
        }
        if (intel.trend === 'BEARISH') {
          optimizations.push({ title: 'Defensive Posture', description: 'Reduce directional exposure and tighten stop-losses.' });
        }
        if (optimizations.length === 0) {
          optimizations.push({ title: 'Hold Steady', description: 'Market conditions are stable. No rebalancing needed.' });
        }
        return { optimizations };
      })
  }),
  ibrain: router({
    getState: protectedProcedure.query(() => {
      return iBrain.state;
    }),
    runOptimization: protectedProcedure.mutation(() => {
       iBrain.runOptimizationCycle();
       return { success: true };
    })
  }),
  analytics: router({
    performance: protectedProcedure
      .input(z.object({ mode: z.enum(['real', 'paper']).optional() }).optional())
      .query(({ input }) => {
        const mode = input?.mode || 'paper';
        const bots = engineManager.getBotsByMode(mode);
        let totalTrades = 0;
        let totalPnL = 0;
        let wins = 0;
        let losses = 0;
        let totalWinPnl = 0;
        let totalLossPnl = 0;
        let peakBalance = mode === 'paper' ? 100000 : 0;
        let maxDrawdown = 0;

        for (const b of bots) {
           if (mode === 'paper' && b.paperEngine) {
              totalTrades += b.paperEngine.realizedTrades.length;
              totalPnL += b.paperEngine.balance - 100000;
              for (const trade of b.paperEngine.realizedTrades) {
                if (trade.pnl >= 0) { wins++; totalWinPnl += trade.pnl; }
                else { losses++; totalLossPnl += Math.abs(trade.pnl); }
              }
           } else if (mode === 'real' && b.realEngine) {
              totalTrades += b.realEngine.orders.length;
              for (const pos of b.realEngine.positions) {
                 const pnl = pos.realizedPnl + pos.unrealizedPnl - pos.feesPaid;
                 totalPnL += pnl;
                 if (pnl >= 0) { wins++; totalWinPnl += pnl; }
                 else { losses++; totalLossPnl += Math.abs(pnl); }
              }
           }
        }

        // Also incorporate database stats for historical accuracy
        const dbStats = database.getStats();
        if (dbStats.totalTrades > 0) {
          totalTrades += dbStats.totalTrades;
          wins += dbStats.winCount;
          losses += dbStats.lossCount;
          totalPnL += dbStats.totalPnl;
        }

        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? 999 : 0;
        const averageWin = wins > 0 ? totalWinPnl / wins : 0;

        // Compute Sharpe ratio from equity time-series
        const snapshots = database.getBalanceHistory(100);
        let sharpeRatio = 0;
        if (snapshots.length >= 2) {
          const returns: number[] = [];
          for (let i = 1; i < snapshots.length; i++) {
            const r = (snapshots[i].totalEquity - snapshots[i - 1].totalEquity) / snapshots[i - 1].totalEquity;
            returns.push(r);
          }
          const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
          const variance = returns.reduce((a, r) => a + (r - meanReturn) ** 2, 0) / returns.length;
          const stdDev = Math.sqrt(variance);
          if (stdDev > 0) {
            sharpeRatio = (meanReturn / stdDev) * Math.sqrt(252); // annualized
          }
        }

        // Compute max drawdown from equity curve
        if (snapshots.length >= 2) {
          let peak = snapshots[0].totalEquity;
          for (const snap of snapshots) {
            if (snap.totalEquity > peak) peak = snap.totalEquity;
            const dd = (peak - snap.totalEquity) / peak;
            if (dd > maxDrawdown) maxDrawdown = dd;
          }
          maxDrawdown = maxDrawdown * 100; // as percentage
        }

        return {
          winRate: parseFloat(winRate.toFixed(1)),
          profitFactor: parseFloat(profitFactor.toFixed(2)),
          totalPnL: parseFloat(totalPnL.toFixed(2)),
          sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
          totalTrades,
          wins,
          averageWin: parseFloat(averageWin.toFixed(2)),
          maxDrawdown: parseFloat(maxDrawdown.toFixed(2))
        };
      }),
    equityCurve: protectedProcedure
      .input(z.object({ mode: z.enum(['real', 'paper']).optional() }).optional())
      .query(({ input }) => {
        const mode = input?.mode || 'paper';
        // Build equity curve from balance snapshots in database
        const snapshots = database.getBalanceHistory(100);
        if (snapshots.length > 0) {
          return snapshots
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .map(s => ({
              date: new Date(s.timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
              equity: parseFloat(s.totalEquity.toFixed(2))
            }));
        }
        // Fallback: derive from current paper engine balance
        if (mode === 'paper') {
          const bots = engineManager.getBotsByMode('paper');
          const balance = bots[0]?.paperEngine?.balance || 100000;
          return [{ date: new Date().toLocaleDateString('en-US', { weekday: 'short' }), equity: parseFloat(balance.toFixed(2)) }];
        }
        return [];
      }),
    getDailyReport: protectedProcedure.query(() => {
      return {
        trades: database.getState().trades.slice(-50).map(t => ({
          symbol: t.symbol,
          side: t.side,
          price: t.price,
          quantity: t.quantity,
          pnl: t.realizedPnl,
          timestamp: t.timestamp,
        }))
      };
    }),
    exportCSV: protectedProcedure.query(() => {
      const trades = database.getState().trades;
      const header = 'Timestamp,Pair,Side,Price,Quantity,PnL\n';
      const rows = trades.map(t => `${t.timestamp},${t.symbol},${t.side},${t.price},${t.quantity},${t.realizedPnl}`).join('\n');
      return header + rows;
    })
  }),
  trading: router({
    orders: protectedProcedure
      .input(z.object({ mode: z.enum(['real', 'paper']) }))
      .query(async ({ ctx, input }) => {
        if (input.mode === 'real') {
           const keys = getApiKeys(ctx.session.userId);
           if (keys) {
             try {
                const exchange = new ccxt.binance({ 
                   apiKey: keys.apiKey, 
                   secret: keys.apiSecret,
                   enableRateLimit: true,
                   options: { adjustForTimeDifference: true, warnOnFetchOpenOrdersWithoutSymbol: false }
                });
                const [btcOrders, ethOrders, solOrders] = await Promise.all([
                   exchange.fetchOrders('BTC/USDT', undefined, 10).catch(() => []),
                   exchange.fetchOrders('ETH/USDT', undefined, 10).catch(() => []),
                   exchange.fetchOrders('SOL/USDT', undefined, 10).catch(() => [])
                ]);
                const all = [...btcOrders, ...ethOrders, ...solOrders]
                   .sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
                   
                if (all.length > 0) {
                   return all.map(o => ({
                      id: o.id,
                      symbol: o.symbol,
                      side: o.side,
                      price: o.price || 0,
                      status: o.status,
                      timestamp: o.timestamp ? new Date(o.timestamp) : new Date(),
                      fills: o.filled ? [{ price: o.price || 0, qty: o.filled }] : []
                   }));
                }
             } catch(e: any) {
                console.log("Error fetching real orders:", e.message);
             }
           }
        }
        
        const bots = engineManager.getBotsByMode(input.mode);
        let orders: any[] = [];
        for (const b of bots) {
           if (input.mode === 'paper' && b.paperEngine) {
              orders.push(...b.paperEngine.orders);
           } else if (input.mode === 'real' && b.realEngine) {
              orders.push(...b.realEngine.orders);
           }
        }
        return orders.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
      }),
    positions: protectedProcedure
      .input(z.object({ mode: z.enum(['real', 'paper']) }))
      .query(({ input }) => {
        const bots = engineManager.getBotsByMode(input.mode);
        let positions: any[] = [];
        for (const b of bots) {
           if (input.mode === 'paper' && b.paperEngine) {
              positions.push(...b.paperEngine.positions);
           } else if (input.mode === 'real' && b.realEngine) {
              positions.push(...b.realEngine.positions);
           }
        }
        return positions;
      }),
    getTickers: publicProcedure.query(() => tickers.map(t => ({
      ...t,
      price: t.price.toFixed(2),
      high24h: t.high24h.toString(),
      low24h: t.low24h.toString()
    }))),
    execute: protectedProcedure
      .input(z.object({ symbol: z.string(), side: z.enum(['buy', 'sell']), quantity: z.number(), price: z.number().optional(), mode: z.enum(['real', 'paper']) }))
      .mutation(async ({ input }) => {
        const bots = engineManager.getBotsByMode(input.mode);
        const bot = bots[0]; // grab the default one
        
        if (!bot) throw new Error(`No ${input.mode} bot instance available`);

        if (input.mode === 'paper' && bot.paperEngine) {
           bot.paperEngine.placeOrder(input.symbol, input.side, 'market', input.quantity, input.price || 65000);
           botLogs.unshift({ id: Math.random(), timestamp: new Date(), message: `[PAPER SIMULATION] MANUAL: ${input.side.toUpperCase()} ${input.symbol}`, level: 'info', mode: 'paper' });
        } else if (input.mode === 'real' && bot.realEngine) {
           await bot.realEngine.placeOrder(input.symbol, input.side, 'market', input.quantity, input.price);
           botLogs.unshift({ id: Math.random(), timestamp: new Date(), message: `[LIVE TRADE EXECUTED] MANUAL: ${input.side.toUpperCase()} ${input.symbol}`, level: 'success', mode: 'real' });
        }

        return { success: true };
      }),
    testExchangeConnection: protectedProcedure
      .mutation(async ({ ctx }) => {
        const keys = getApiKeys(ctx.session.userId);
        if (!keys) return { success: false, latency: 0, error: 'No API keys configured. Use Settings to store your keys.' };
        try {
          const exchange = new ccxt.binance({ 
             apiKey: keys.apiKey, 
             secret: keys.apiSecret,
             enableRateLimit: true,
             options: { adjustForTimeDifference: true, warnOnFetchOpenOrdersWithoutSymbol: false }
          });
          const start = Date.now();
          await exchange.fetchBalance();
          return { success: true, latency: Date.now() - start };
        } catch (e: any) {
          throw new Error(e.message);
        }
      }),
    getRealBalance: protectedProcedure
      .query(async ({ ctx }) => {
        const keys = getApiKeys(ctx.session.userId);
        if (!keys) return { success: false, balance: null, error: 'No API keys configured.' };
        try {
          const exchange = new ccxt.binance({ 
             apiKey: keys.apiKey, 
             secret: keys.apiSecret,
             enableRateLimit: true,
             options: { adjustForTimeDifference: true, warnOnFetchOpenOrdersWithoutSymbol: false }
          });
          let totalEquiv = 0;
          try {
             // Use Promise.all to fetch both spot and future balances concurrently
             const [spot, futures, margin, funding, savings, tickers] = await Promise.all([
               exchange.fetchBalance({ type: 'spot' }).catch(() => null),
               exchange.fetchBalance({ type: 'future' }).catch(() => null),
               exchange.fetchBalance({ type: 'margin' }).catch(() => null),
               exchange.fetchBalance({ type: 'funding' }).catch(() => null),
               exchange.fetchBalance({ type: 'savings' }).catch(() => null),
               exchange.fetchTickers().catch(() => ({}))
             ]);
             
             const processBalance = (bal: any) => {
                if(bal && bal.total) {
                   for (const currency in bal.total) {
                      const amount = bal.total[currency];
                      if (amount > 0) {
                         if (['USDT', 'USDC', 'FDUSD', 'BUSD'].includes(currency)) {
                            totalEquiv += amount;
                         } else {
                            const pair = `${currency}/USDT`;
                            if (tickers[pair]) {
                               totalEquiv += amount * ((tickers[pair].last as number) || (tickers[pair].close as number) || 0);
                            } else {
                               const btcPair = `${currency}/BTC`;
                               if (tickers[btcPair] && tickers['BTC/USDT']) {
                                  const btcPrice = (tickers[btcPair].last as number) || 0;
                                  const usdtPrice = (tickers['BTC/USDT'].last as number) || 0;
                                  totalEquiv += amount * btcPrice * usdtPrice;
                               }
                            }
                         }
                      }
                   }
                }
             };

             processBalance(spot);
             processBalance(futures);
             processBalance(margin);
             processBalance(funding);
             processBalance(savings);
             
          } catch(e: any) {
             console.log(e.message);
             return { success: false, balance: null, error: e.message };
          }
          return { success: true, balance: totalEquiv };
        } catch (e: any) {
          return { success: false, balance: null, error: e.message };
        }
      })
  }),
  bot: router({
    status: protectedProcedure
      .input(z.object({ mode: z.enum(['real', 'paper']) }).optional())
      .query(({ input }) => {
         const mode = input?.mode || 'paper';
         const bots = engineManager.getBotsByMode(mode);
         const activeBot = bots.find(b => b.id === `bot_${mode}`);
         let totalSignals = 0;
         bots.forEach(b => {
             if (b.mode === 'paper') totalSignals += b.paperEngine?.orders?.length || 0;
             if (b.mode === 'real') totalSignals += b.realEngine?.orders?.length || 0;
         });
         return {
           status: activeBot ? activeBot.status : 'stopped', 
           mode: mode,
           totalSignals,
           voiceEnabled: globalBotSettings.voiceEnabled,
           notificationEnabled: globalBotSettings.notificationEnabled
         };
      }),
    control: protectedProcedure
      .input(z.object({ 
         action: z.enum(['start', 'stop', 'pause', 'restart']),
         mode: z.enum(['real', 'paper']),
         symbol: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
         // For real mode, retrieve API keys from server-side store
         let apiKey: string | undefined;
         let apiSecret: string | undefined;
         if (input.mode === 'real') {
           const keys = getApiKeys(ctx.session.userId);
           apiKey = keys?.apiKey;
           apiSecret = keys?.apiSecret;
         }
         if (input.action === 'start') {
            engineManager.startBot(`bot_${input.mode}`, `Bot ${input.mode}`, input.mode, 'binance', input.symbol || 'BTC/USDT', apiKey, apiSecret);
         } else if (input.action === 'stop') {
            engineManager.stopBot(`bot_${input.mode}`);
         } else if (input.action === 'pause') {
            engineManager.pauseBot(`bot_${input.mode}`);
         } else if (input.action === 'restart') {
            engineManager.restartBot(`bot_${input.mode}`, apiKey, apiSecret);
         }
         
         botLogs.unshift({ id: Math.random(), timestamp: new Date(), message: `Bot ${input.action} command received for mode ${input.mode}`, level: 'info', mode: input.mode });
         const statusMap: any = { start: 'running', restart: 'running', stop: 'stopped', pause: 'paused' };
         return { success: true, status: statusMap[input.action] };
      }),
    update: protectedProcedure
      .input(z.object({ mode: z.enum(['real', 'paper']).optional(), voiceEnabled: z.boolean().optional(), notificationEnabled: z.boolean().optional() }))
      .mutation(({ input }) => {
         if (input.voiceEnabled !== undefined) globalBotSettings.voiceEnabled = input.voiceEnabled;
         if (input.notificationEnabled !== undefined) globalBotSettings.notificationEnabled = input.notificationEnabled;
         return { success: true };
      }),
    logs: protectedProcedure
      .input(z.object({ mode: z.enum(['real', 'paper']).optional() }).optional())
      .query(({ input }) => {
         const filterMode = input?.mode;
         if (!filterMode) return botLogs.slice(0, 50);
         return botLogs.filter((l: any) => l.mode === filterMode || l.mode === 'global').slice(0, 50);
      })
  }),
  risk: router({
    getConfig: protectedProcedure.query(() => ({ ...globalRiskConfig })),
    updateConfig: protectedProcedure
      .input(z.object({
        globalOverrideEnabled: z.boolean().optional(),
        maxDailyDrawdown: z.number().min(0.1).max(50).optional(),
        hedgingEnabled: z.boolean().optional(),
        rebalanceOnExtremeVol: z.boolean().optional(),
      }))
      .mutation(({ input }) => {
        if (input.maxDailyDrawdown !== undefined) {
          globalRiskConfig.maxDailyDrawdown = input.maxDailyDrawdown;
        }
        if (input.globalOverrideEnabled !== undefined) {
          globalRiskConfig.globalOverrideEnabled = input.globalOverrideEnabled;
        }
        if (input.hedgingEnabled !== undefined) {
          globalRiskConfig.hedgingEnabled = input.hedgingEnabled;
        }
        if (input.rebalanceOnExtremeVol !== undefined) {
          globalRiskConfig.rebalanceOnExtremeVol = input.rebalanceOnExtremeVol;
        }
        // Propagate to the actual risk engine so changes take effect
        globalRiskEngine.applyConfigOverride(globalRiskConfig);
        return { success: true };
      })
  })
});

export type AppRouter = typeof appRouter;
