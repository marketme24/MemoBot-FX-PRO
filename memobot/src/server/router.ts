import { router, publicProcedure } from './_core/context';
import { z } from 'zod';
import ccxt from 'ccxt';
import { engineManager, TradingMode } from './engine_manager';
import { globalRiskEngine } from './risk_engine';
import { circuitBreaker } from './circuit_breaker';

let botLogs: any[] = [
   { id: 1, timestamp: new Date(Date.now() - 5000), message: 'System Initialized', level: 'info', mode: 'global' }
];

const MAX_BOT_LOGS = 1000;
function pushBotLog(entry: any) {
   botLogs.unshift(entry);
   if (botLogs.length > MAX_BOT_LOGS) botLogs.length = MAX_BOT_LOGS;
}

(global as any).addBotLog = (message: string, level: string, mode: string) => {
   pushBotLog({ id: Math.random(), timestamp: new Date(), message, level, mode });
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
            pushBotLog({ id: Math.random(), timestamp: new Date(), message: `[PAPER SIMULATION] EXECUTED: ${side.toUpperCase()} ${ticker.symbol} @ ${ticker.price.toFixed(2)}`, level: 'info', mode: 'paper' });
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
  admin: router({
    getUsers: publicProcedure.query(() => {
      if (!(global as any).usersMap) {
        (global as any).usersMap = new Map<string, any>([
          ['1', { id: '1', name: 'Maher Fekri', email: 'maher@example.com', subscriptionPlan: 'elite', bots: [{ status: 'running' }], status: 'active', autoBilling: true, totalProfit: 450.21, owedFees: 0 }],
          ['2', { id: '2', name: 'Sarah Connor', email: 'sarah@example.com', subscriptionPlan: 'pro', bots: [{ status: 'stopped' }], status: 'suspended', autoBilling: false, totalProfit: -45.10, owedFees: 2.10 }]
        ]);
      }
      return Array.from(((global as any).usersMap as Map<string, any>).values());
    }),
    addUser: publicProcedure
      .input(z.object({ name: z.string(), email: z.string(), plan: z.string() }))
      .mutation(({ input }) => {
        const usersMap = (global as any).usersMap || new Map<string, any>([
          ['1', { id: '1', name: 'Maher Fekri', email: 'maher@example.com', subscriptionPlan: 'elite', bots: [{ status: 'running' }], status: 'active', autoBilling: true, totalProfit: 450.21, owedFees: 0 }],
          ['2', { id: '2', name: 'Sarah Connor', email: 'sarah@example.com', subscriptionPlan: 'pro', bots: [{ status: 'stopped' }], status: 'suspended', autoBilling: false, totalProfit: -45.10, owedFees: 2.10 }]
        ]);
        const id = Math.random().toString(36).substring(7);
        const newUser = { id, name: input.name, email: input.email, subscriptionPlan: input.plan, bots: [{ status: 'stopped' }], status: 'active' };
        usersMap.set(id, newUser);
        (global as any).usersMap = usersMap;
        return { success: true, user: newUser };
      }),
    updateUserStatus: publicProcedure
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
    getUserActivities: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(({ input }) => {
        return userActivitiesMap.get(input.userId) || Array.from(userActivitiesMap.values()).flat().slice(0, 10);
      }),
    getUserInvoices: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(({ input }) => {
        return userInvoicesMap.get(input.userId) || [];
      }),
    markInvoicePaid: publicProcedure
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
    getProfile: publicProcedure.query(() => {
       const pb = engineManager.getBotsByMode('paper')[0]?.paperEngine?.balance || 0;
       return {
         liveBalance: "0.00",
         paperBalance: pb.toFixed(2)
       }
    }),
    verifyPin: publicProcedure
      .input(z.object({ pin: z.string() }))
      .mutation(({ input }) => { return { success: input.pin === '1234' || input.pin.length === 4 }; }),
    updateSubscription: publicProcedure
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
    forceStopBot: publicProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(({ input }) => {
        // Mock logic
        return { success: true };
      })
  }),
  ai: router({
    getMarketVerdict: publicProcedure
      .input(z.object({ symbol: z.string(), lang: z.string().optional() }))
      .query(() => ({
        verdict: 'Bullish',
        confidence: 87.5,
        summary: 'Momentum oscillators signal an unbroken uptrend. Neural network prediction correlates with 99% bullish volume delta.',
        reasons: ['RSI Divergence', 'Volume Spike', 'MACD Crossover']
      })),
    getPortfolioOptimization: publicProcedure
      .input(z.object({ lang: z.string().optional() }))
      .query(() => ({
         optimizations: [
            { title: 'Neural Allocation', description: 'Re-distribute 10% from SOL to BTC based on sentiment.' },
            { title: 'Volatility Dampening', description: 'Decrease leverage on short-term trades by 2x.' }
         ]
      }))
  }),
  ibrain: router({
    getState: publicProcedure.query(() => {
      // Need to import iBrain from ./ibrain
      // To avoid failing if import missing, I will do it inline or at top of file
      return (global as any).__iBrainState || {
         marketIntel: { volatility: 0.5, trend: 'SIDEWAYS', liquidity: 0.8, momentumScore: 0, riskLevel: 'MEDIUM' },
         strategyStates: {},
         memoryStats: { totalMemories: 0, lastOptimizationCycle: new Date().toISOString() },
         decisionLogs: []
      };
    }),
    runOptimization: publicProcedure.mutation(() => {
       if ((global as any).__iBrainRunOptimization) {
           (global as any).__iBrainRunOptimization();
       }
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
        for (const b of bots) {
           if (mode === 'paper' && b.paperEngine) {
              totalTrades += b.paperEngine.orders.length;
              totalPnL += b.paperEngine.balance - 100000;
           } else if (mode === 'real' && b.realEngine) {
              totalTrades += b.realEngine.orders.length;
              let pnl = 0;
              for (const pos of b.realEngine.positions) {
                 pnl += pos.realizedPnl + pos.unrealizedPnl - pos.feesPaid;
              }
              totalPnL = pnl; 
           }
        }
        return {
          winRate: 72.4, profitFactor: 2.1, totalPnL, sharpeRatio: 1.8, totalTrades, 
          wins: Math.floor(totalTrades * 0.724), averageWin: 45.2, maxDrawdown: 4.2
        };
      }),
    equityCurve: publicProcedure
      .input(z.object({ mode: z.enum(['real', 'paper']).optional() }).optional())
      .query(({ input }) => {
        const mode = input?.mode || 'paper';
        if (mode === 'real') {
           return [];
        }
        return [
          { date: 'Mon', equity: 100000 },
          { date: 'Tue', equity: 100200 },
          { date: 'Wed', equity: 99150 },
          { date: 'Thu', equity: 99400 },
          { date: 'Fri', equity: 99236 },
        ];
      }),
    getDailyReport: publicProcedure.query(() => ({
       trades: []
    })),
    exportCSV: publicProcedure.query(() => 'Timestamp,Pair,Side,Price,PnL\n2024-05-24T12:00:00Z,BTCUSDT,BUY,65432,23.50')
  }),
  trading: router({
    orders: publicProcedure
      .input(z.object({ mode: z.enum(['real', 'paper']), apiKey: z.string().optional(), apiSecret: z.string().optional() }))
      .query(async ({ input }) => {
        if (input.mode === 'real' && input.apiKey && input.apiSecret) {
           try {
              const exchange = new ccxt.binance({ 
                 apiKey: input.apiKey, 
                 secret: input.apiSecret,
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
    positions: publicProcedure
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
    execute: publicProcedure
      .input(z.object({ symbol: z.string(), side: z.enum(['buy', 'sell']), quantity: z.number(), price: z.number().optional(), mode: z.enum(['real', 'paper']) }))
      .mutation(async ({ input }) => {
        const bots = engineManager.getBotsByMode(input.mode);
        const bot = bots[0]; // grab the default one
        
        if (!bot) throw new Error(`No ${input.mode} bot instance available`);

        // Enforce circuit breaker and risk engine on manual trades too
        if (!circuitBreaker.canTrade()) {
           throw new Error(`Circuit breaker active: ${circuitBreaker.getStatus().state}`);
        }

        const refPrice = input.price || 65000;
        const accountBalance = input.mode === 'paper'
           ? (bot.paperEngine?.balance || 100000)
           : (bot.realEngine?.balanceCache || 0);
        const riskResult = globalRiskEngine.evaluateTrade({
           symbol: input.symbol,
           action: input.side.toUpperCase() as 'BUY' | 'SELL',
           requestedSize: input.quantity * refPrice,
           requestedLeverage: 1,
           confidence: 0.7,
           accountBalance,
           openPositionsValue: 0,
        });
        if (!riskResult.approved) {
           throw new Error(`Risk engine reject: ${riskResult.reason}`);
        }
        const finalQty = refPrice > 0 ? riskResult.modifiedSize / refPrice : input.quantity;

        if (input.mode === 'paper' && bot.paperEngine) {
           bot.paperEngine.placeOrder(input.symbol, input.side, 'market', finalQty, refPrice);
           pushBotLog({ id: Math.random(), timestamp: new Date(), message: `[PAPER SIMULATION] MANUAL: ${input.side.toUpperCase()} ${input.symbol}`, level: 'info', mode: 'paper' });
        } else if (input.mode === 'real' && bot.realEngine) {
           await bot.realEngine.placeOrder(input.symbol, input.side, 'market', finalQty, input.price);
           pushBotLog({ id: Math.random(), timestamp: new Date(), message: `[LIVE TRADE EXECUTED] MANUAL: ${input.side.toUpperCase()} ${input.symbol}`, level: 'success', mode: 'real' });
        }

        return { success: true };
      }),
    testExchangeConnection: publicProcedure
      .input(z.object({ apiKey: z.string().optional(), apiSecret: z.string().optional() }))
      .mutation(async ({ input }) => {
        if (!input.apiKey || !input.apiSecret) return { success: false, latency: 0 };
        try {
          const exchange = new ccxt.binance({ 
             apiKey: input.apiKey, 
             secret: input.apiSecret,
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
    getRealBalance: publicProcedure
      .input(z.object({ apiKey: z.string().optional(), apiSecret: z.string().optional() }))
      .query(async ({ input }) => {
        if (!input.apiKey || !input.apiSecret) return { success: false, balance: null };
        try {
          const exchange = new ccxt.binance({ 
             apiKey: input.apiKey, 
             secret: input.apiSecret,
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
    control: publicProcedure
      .input(z.object({ 
         action: z.enum(['start', 'stop', 'pause', 'restart']),
         mode: z.enum(['real', 'paper']),
         symbol: z.string().optional(),
         apiKey: z.string().optional(),
         apiSecret: z.string().optional()
      }))
      .mutation(({ input }) => {
         if (input.action === 'start') {
            engineManager.startBot(`bot_${input.mode}`, `Bot ${input.mode}`, input.mode, 'binance', input.symbol || 'BTC/USDT', input.apiKey, input.apiSecret);
         } else if (input.action === 'stop') {
            engineManager.stopBot(`bot_${input.mode}`);
         } else if (input.action === 'pause') {
            engineManager.pauseBot(`bot_${input.mode}`);
         } else if (input.action === 'restart') {
            engineManager.restartBot(`bot_${input.mode}`, input.apiKey, input.apiSecret);
         }
         
         pushBotLog({ id: Math.random(), timestamp: new Date(), message: `Bot ${input.action} command received for mode ${input.mode}`, level: 'info', mode: input.mode });
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
    updateConfig: publicProcedure
      .input(z.any())
      .mutation(() => ({ success: true }))
  })
});

export type AppRouter = typeof appRouter;
