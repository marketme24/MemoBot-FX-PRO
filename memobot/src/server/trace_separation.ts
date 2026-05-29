import { appRouter } from './router';
import { engineManager } from './engine_manager';

async function testSession() {
  const caller = appRouter.createCaller({});

  // 1. Ensure bot is running in real mode for exposure
  console.log("--- Starting Real Trading Engine ---");
  engineManager.startBot('bot_real', 'Bot Real', 'real', 'binance', 'BTC/USDT', 'mock_key', 'mock_secret');
  const realBot = engineManager.getBot('bot_real');
  if (realBot) {
    realBot.status = 'running';
    realBot.realEngine = {
       orders: [{ symbol: 'BTC/USDT', side: 'buy', type: 'market', size: 0.5, price: 60000, status: 'filled', timestamp: Date.now() }],
       positions: [{ symbol: 'BTC/USDT', side: 'buy', size: 0.5, averageEntryPrice: 60000, currentPrice: 62000, unrealizedPnl: 1000, realizedPnl: 0, feesPaid: 5 }],
       balance: 101000
    } as any;
  }

  // 2. Add paper bot and trades
  console.log("--- Starting Paper Trading Engine ---");
  const paperBot = engineManager.getBot('bot_paper');
  if (paperBot) {
    paperBot.status = 'running';
    if(paperBot.paperEngine){
      paperBot.paperEngine.orders.push({ symbol: 'ETH/USDT', side: 'buy', type: 'market', size: 10, price: 3000, status: 'filled', timestamp: Date.now() } as any);
      paperBot.paperEngine.balance = 105000;
    }
  }

  // 3. Fetch Real Analytics
  console.log("\n>>> FETCHING REAL DASHBOARD METRICS (mode: 'real')");
  const realPerf = await caller.analytics.performance({ mode: 'real' });
  const realStatus = await caller.bot.status({ mode: 'real' });
  const realPositions = await caller.trading.positions({ mode: 'real' });
  console.log("Real PnL:", realPerf.totalPnL, "USDT");
  console.log("Real Total Trades:", realPerf.totalTrades);
  console.log("Real Open Positions:", realPositions.length);
  console.log("Real Engine Status:", realStatus.status);

  // 4. Fetch Paper Analytics
  console.log("\n>>> FETCHING PAPER METRICS (mode: 'paper')");
  const paperPerf = await caller.analytics.performance({ mode: 'paper' });
  const paperPositions = await caller.trading.positions({ mode: 'paper' });
  console.log("Paper PnL:", paperPerf.totalPnL, "USDT");
  console.log("Paper Total Trades:", paperPerf.totalTrades);
  console.log("Paper Open Positions:", paperPositions.length);
}

testSession().then(() => console.log("\nTest session completed."));
