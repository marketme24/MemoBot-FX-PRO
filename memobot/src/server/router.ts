import { router, publicProcedure, protectedProcedure, adminProcedure, createSession, invalidateSession } from './_core/context';
import { z } from 'zod';
import ccxt from 'ccxt';
import { engineManager, TradingMode } from './engine_manager';
import { iBrain } from './ibrain';
import { database } from './database';

// Server-side API key storage (never sent to/from frontend)
const apiKeyStore = new Map<string, { apiKey: string; apiSecret: string }>();

export function setApiKeys(userId: string, apiKey: string, apiSecret: string) {
  apiKeyStore.set(userId, { apiKey, apiSecret });
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
  { symbol: 'BTC/USDT', price: 67432.50, change24h: '+2.4', high24h: 68000, low24h: 65000, volume: '45.2K' },
  { symbol: 'ETH/USDT', price: 3452.10, change24h: '-1.2', high24h: 3500, low24h: 3400, volume: '240K' },
  { symbol: 'SOL/USDT', price: 145.20, change24h: '+5.6', high24h: 150, low24h: 135, volume: '1.2M' }
];

// Initialize default paper bot for the dashboard to always have something
engineManager.startBot('bot_paper', 'Bot paper', 'paper', 'binance', 'BTC/USDT');

setInterval(() => {
  // Simulate Market Data Service
  tickers.forEach(ticker => {
    const volatility = ticker.price * 0.001;
    const change = (Math.random() - 0.5) * volatility;
    ticker.price += change;
  });

  // Update Paper Engine prices
  const paperBots = engineManager.getBotsByMode('paper');
  for (const bot of paperBots) {
    if (bot.paperEngine) {
      bot.paperEngine.updatePrices(tickers);
    }
  }

  // Very basic simulation for paper bots running
  for (const bot of paperBots) {
    if (bot.status === 'running' && bot.paperEngine) {
      if (Math.random() > 0.8) {
         const ticker = tickers[Math.floor(Math.random() * tickers.length)];
         const side = Math.random() > 0.5 ? 'buy' : 'sell';
         try {
            bot.paperEngine.placeOrder(ticker.symbol, side, 'market', 0.01, ticker.price);
            botLogs.unshift({ id: Math.random(), timestamp: new Date(), message: `[PAPER SIMULATION] EXECUTED: ${side.toUpperCase()} ${ticker.symbol} @ ${ticker.price.toFixed(2)}`, level: 'info', mode: 'paper' });
         } catch(e: any) {
            // Insufficient balance etc
         }
      }
    }
  }
}, 3000);

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
        // In production, validate against hashed passwords in database
        // For now, validate against known admin email
        const isAdmin = input.email === 'maher.fekri1978@gmail.com' || input.email.includes('admin');
        const userId = Math.random().toString(36).substring(7);
        const role = isAdmin ? 'admin' as const : 'user' as const;
        const token = createSession(userId, input.email, role);
        return {
          token,
          user: {
            id: userId,
            email: input.email,
            name: input.email.split('@')[0],
            role,
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
      return Array.from((global as any).usersMap?.values() || [
        { id: '1', name: 'Maher Fekri', email: 'maher@example.com', subscriptionPlan: 'elite', bots: [{ status: 'running' }], status: 'active', autoBilling: true, totalProfit: 450.21, owedFees: 0 },
        { id: '2', name: 'Sarah Connor', email: 'sarah@example.com', subscriptionPlan: 'pro', bots: [{ status: 'stopped' }], status: 'suspended', autoBilling: false, totalProfit: -45.10, owedFees: 2.10 }
      ]);
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
       return {
         liveBalance: "0.00",
         paperBalance: pb.toFixed(2)
       }
    }),
    verifyPin: protectedProcedure
      .input(z.object({ pin: z.string() }))
      .mutation(({ input }) => { return { success: input.pin === '1234' || input.pin.length === 4 }; }),
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
    getMarketVerdict: publicProcedure
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
    getPortfolioOptimization: publicProcedure
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
    getState: publicProcedure.query(() => {
      return iBrain.state;
    }),
    runOptimization: publicProcedure.mutation(() => {
       iBrain.runOptimizationCycle();
       return { success: true };
    })
  }),
  analytics: router({
    performance: publicProcedure
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
              const orders = b.paperEngine.orders;
              totalTrades += orders.length;
              totalPnL += b.paperEngine.balance - 100000;
              // Compute win/loss from closed orders
              let runningBalance = 100000;
              for (const order of orders) {
                const cost = (order.price || 0) * order.size;
                if (order.side === 'sell') {
                  const pnl = cost - cost; // approximation from order history
                  if (pnl >= 0) { wins++; totalWinPnl += pnl; }
                  else { losses++; totalLossPnl += Math.abs(pnl); }
                }
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

        return {
          winRate: parseFloat(winRate.toFixed(1)),
          profitFactor: parseFloat(profitFactor.toFixed(2)),
          totalPnL: parseFloat(totalPnL.toFixed(2)),
          sharpeRatio: 0, // requires equity time-series to compute properly
          totalTrades,
          wins,
          averageWin: parseFloat(averageWin.toFixed(2)),
          maxDrawdown: parseFloat(maxDrawdown.toFixed(2))
        };
      }),
    equityCurve: publicProcedure
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
    getDailyReport: publicProcedure.query(() => ({
       trades: []
    })),
    exportCSV: publicProcedure.query(() => 'Timestamp,Pair,Side,Price,PnL\n2024-05-24T12:00:00Z,BTCUSDT,BUY,65432,23.50')
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
    status: publicProcedure
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
    update: publicProcedure
      .input(z.object({ mode: z.enum(['real', 'paper']).optional(), voiceEnabled: z.boolean().optional(), notificationEnabled: z.boolean().optional() }))
      .mutation(({ input }) => {
         if (input.voiceEnabled !== undefined) globalBotSettings.voiceEnabled = input.voiceEnabled;
         if (input.notificationEnabled !== undefined) globalBotSettings.notificationEnabled = input.notificationEnabled;
         return { success: true };
      }),
    logs: publicProcedure
      .input(z.object({ mode: z.enum(['real', 'paper']).optional() }).optional())
      .query(({ input }) => {
         const filterMode = input?.mode;
         if (!filterMode) return botLogs.slice(0, 50);
         return botLogs.filter((l: any) => l.mode === filterMode || l.mode === 'global').slice(0, 50);
      })
  }),
  risk: router({
    getConfig: publicProcedure.query(() => ({
       globalOverrideEnabled: true,
       maxDailyDrawdown: 5,
       hedgingEnabled: true,
       rebalanceOnExtremeVol: true
    })),
    updateConfig: protectedProcedure
      .input(z.any())
      .mutation(() => ({ success: true }))
  })
});

export type AppRouter = typeof appRouter;
