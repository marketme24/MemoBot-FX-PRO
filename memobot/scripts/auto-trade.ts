/**
 * MEMOBOT FX-PRO — Fully Autonomous Trading Bot
 * 
 * The bot runs continuously:
 *   1. Scans the market using EMA crossover + RSI strategy
 *   2. When a BUY signal triggers → executes a real BUY order
 *   3. Monitors the position with take-profit / stop-loss
 *   4. When exit conditions are met → executes a real SELL order
 *   5. Repeats the cycle
 * 
 * Usage:
 *   1. Create .env with BINANCE_API_KEY and BINANCE_API_SECRET
 *   2. Run: npm run auto-trade
 * 
 * Options (env vars):
 *   TRADE_SYMBOL    - Symbol to trade (default: BTC/USDT)
 *   BALANCE_PCT     - % of available balance per trade (default: 5)
 *   TIMEFRAME       - Candle timeframe (default: 1m)
 *   TAKE_PROFIT     - Take profit % (default: 1.5)
 *   STOP_LOSS       - Stop loss % (default: 1.0)
 *   SCAN_INTERVAL   - Seconds between scans (default: 10)
 *   MAX_TRADES      - Max trades before stopping (default: unlimited)
 */

import 'dotenv/config';
import ccxt, { Exchange, Order as CcxtOrder } from 'ccxt';
import { TradingStrategy, Candle, StrategyDecision } from '../src/server/strategy';

// ─── Configuration ───────────────────────────────────────────────

const API_KEY = process.env.BINANCE_API_KEY || '';
const API_SECRET = process.env.BINANCE_API_SECRET || '';
const SYMBOL = process.env.TRADE_SYMBOL || 'BTC/USDT';
const BALANCE_PCT = parseFloat(process.env.BALANCE_PCT || '5');
const TIMEFRAME = process.env.TIMEFRAME || '1m';
const TAKE_PROFIT_PCT = parseFloat(process.env.TAKE_PROFIT || '1.5');
const STOP_LOSS_PCT = parseFloat(process.env.STOP_LOSS || '1.0');
const SCAN_INTERVAL_S = parseInt(process.env.SCAN_INTERVAL || '10');
const MAX_TRADES = parseInt(process.env.MAX_TRADES || '0'); // 0 = unlimited

// ─── State ───────────────────────────────────────────────────────

interface ActivePosition {
  entryPrice: number;
  quantity: number;
  entryTime: number;
  buyOrderId: string;
  cost: number;
}

let position: ActivePosition | null = null;
let tradeCount = 0;
let totalNetPnl = 0;
let isRunning = true;
let sessionStartTime = Date.now();

// ─── Helpers ─────────────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface SymbolInfo {
  pricePrecision: number;
  qtyPrecision: number;
  minNotional: number;
  stepSize: number;
}

async function getSymbolInfo(exchange: Exchange, symbol: string): Promise<SymbolInfo> {
  await exchange.loadMarkets();
  const market = exchange.market(symbol);
  
  const info: SymbolInfo = {
    pricePrecision: (market.precision?.price as number) ?? 2,
    qtyPrecision: (market.precision?.amount as number) ?? 5,
    minNotional: 10,
    stepSize: market.limits?.amount?.min ?? 0.00001,
  };

  const rawInfo = market.info as Record<string, unknown>;
  if (rawInfo && Array.isArray(rawInfo.filters)) {
    for (const filter of rawInfo.filters) {
      const f = filter as Record<string, string>;
      if (f.filterType === 'NOTIONAL' || f.filterType === 'MIN_NOTIONAL') {
        info.minNotional = parseFloat(f.minNotional || '10');
      }
      if (f.filterType === 'LOT_SIZE') {
        info.stepSize = parseFloat(f.stepSize || '0.00001');
      }
    }
  }
  return info;
}

function formatQty(qty: number, stepSize: number, precision: number): number {
  const adjusted = Math.floor(qty / stepSize) * stepSize;
  return parseFloat(adjusted.toFixed(precision));
}

async function fetchCandles(exchange: Exchange, symbol: string, timeframe: string, limit: number): Promise<Candle[]> {
  const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
  return ohlcv.map((c) => ({
    timestamp: c[0] as number,
    open: c[1] as number,
    high: c[2] as number,
    low: c[3] as number,
    close: c[4] as number,
    volume: c[5] as number,
  }));
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         MEMOBOT FX-PRO — AUTONOMOUS TRADING            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // Validate keys
  if (!API_KEY || API_KEY === 'your_binance_api_key_here' || API_KEY.length < 10) {
    console.error('ERROR: No valid Binance API keys found.');
    console.error('  1. Copy .env.example to .env');
    console.error('  2. Add your BINANCE_API_KEY and BINANCE_API_SECRET');
    console.error('  3. Run again: npm run auto-trade\n');
    process.exit(1);
  }

  // Initialize
  const exchange = new ccxt.binance({
    apiKey: API_KEY,
    secret: API_SECRET,
    enableRateLimit: true,
    options: { defaultType: 'spot', adjustForTimeDifference: true },
  });

  const strategy = new TradingStrategy({
    takeProfitPct: TAKE_PROFIT_PCT,
    stopLossPct: STOP_LOSS_PCT,
  });

  // Pre-flight checks
  log(`Symbol:        ${SYMBOL}`);
  log(`Timeframe:     ${TIMEFRAME}`);
  log(`Balance/Trade: ${BALANCE_PCT}%`);
  log(`Take Profit:   +${TAKE_PROFIT_PCT}%`);
  log(`Stop Loss:     -${STOP_LOSS_PCT}%`);
  log(`Scan Interval: ${SCAN_INTERVAL_S}s`);
  log(`Max Trades:    ${MAX_TRADES || 'Unlimited'}`);
  console.log('');

  // Check connection & balance
  let usdtBalance: number;
  try {
    const bal = await exchange.fetchBalance({ type: 'spot' });
    usdtBalance = (bal.free as unknown as Record<string, number>)?.['USDT'] || 0;
    log(`Connected to Binance | USDT Available: $${usdtBalance.toFixed(2)}`);
    
    if (usdtBalance < 10) {
      console.error(`ERROR: Insufficient USDT balance ($${usdtBalance.toFixed(2)}). Need at least $10.`);
      process.exit(1);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`ERROR: Failed to connect to Binance: ${msg}`);
    process.exit(1);
  }

  // Load symbol info
  let symbolInfo: SymbolInfo;
  try {
    symbolInfo = await getSymbolInfo(exchange, SYMBOL);
    log(`Symbol loaded  | Min Notional: $${symbolInfo.minNotional} | Step: ${symbolInfo.stepSize}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`ERROR: Failed to load symbol info: ${msg}`);
    process.exit(1);
  }

  console.log('');
  log('Bot is LIVE. Scanning for opportunities...');
  console.log('─'.repeat(60));

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('');
    log('Shutting down...');
    isRunning = false;
  });

  // ─── Trading Loop ──────────────────────────────────────────────

  let scanCount = 0;

  while (isRunning) {
    try {
      scanCount++;

      // Fetch latest candles
      const candles = await fetchCandles(exchange, SYMBOL, TIMEFRAME, 50);
      if (candles.length < 25) {
        log('Waiting for more market data...');
        await sleep(SCAN_INTERVAL_S * 1000);
        continue;
      }

      const currentPrice = candles[candles.length - 1].close;
      const decision = strategy.analyze(candles);

      // ─── No Position: Look for Entry ─────────────────────────
      if (!position) {
        // Periodic status update
        if (scanCount % 6 === 1) {
          const { rsi, emaFast, emaSlow } = decision.indicators;
          const trend = emaFast > emaSlow ? 'BULLISH' : emaFast < emaSlow ? 'BEARISH' : 'NEUTRAL';
          log(`SCAN #${scanCount} | ${SYMBOL} $${currentPrice.toFixed(2)} | RSI: ${rsi.toFixed(1)} | Trend: ${trend} | Signal: ${decision.signal} (${(decision.confidence * 100).toFixed(0)}%)`);
        }

        if (decision.signal === 'BUY' && decision.confidence >= 0.55) {
          console.log('');
          log(`*** BUY SIGNAL DETECTED ***`);
          log(`    Reason: ${decision.reason}`);
          log(`    Confidence: ${(decision.confidence * 100).toFixed(0)}%`);
          log(`    RSI: ${decision.indicators.rsi.toFixed(1)} | EMA Fast: ${decision.indicators.emaFast.toFixed(2)} | EMA Slow: ${decision.indicators.emaSlow.toFixed(2)}`);

          // Calculate position size
          const freshBal = await exchange.fetchBalance({ type: 'spot' });
          usdtBalance = (freshBal.free as unknown as Record<string, number>)?.['USDT'] || 0;
          let tradeAmount = usdtBalance * (BALANCE_PCT / 100);
          tradeAmount = Math.max(tradeAmount, symbolInfo.minNotional + 1);

          if (tradeAmount > usdtBalance) {
            log(`    Skipping: trade amount $${tradeAmount.toFixed(2)} exceeds balance $${usdtBalance.toFixed(2)}`);
            await sleep(SCAN_INTERVAL_S * 1000);
            continue;
          }

          const qty = formatQty(tradeAmount / currentPrice, symbolInfo.stepSize, symbolInfo.qtyPrecision);
          if (qty <= 0 || qty * currentPrice < symbolInfo.minNotional) {
            log(`    Skipping: quantity too small after formatting`);
            await sleep(SCAN_INTERVAL_S * 1000);
            continue;
          }

          // Execute BUY
          log(`    Executing: MARKET BUY ${qty} ${SYMBOL} (~$${(qty * currentPrice).toFixed(2)})`);

          try {
            const buyOrder = await exchange.createMarketOrder(SYMBOL, 'buy', qty);
            const entryPrice = (buyOrder.average || buyOrder.price || currentPrice) as number;
            const cost = (buyOrder.cost || qty * entryPrice) as number;

            position = {
              entryPrice,
              quantity: (buyOrder.filled || qty) as number,
              entryTime: Date.now(),
              buyOrderId: buyOrder.id,
              cost,
            };

            tradeCount++;
            log(`    BUY FILLED | ID: ${buyOrder.id} | Price: $${entryPrice.toFixed(2)} | Qty: ${position.quantity} | Cost: $${cost.toFixed(2)}`);
            log(`    Take Profit: $${(entryPrice * (1 + TAKE_PROFIT_PCT / 100)).toFixed(2)} | Stop Loss: $${(entryPrice * (1 - STOP_LOSS_PCT / 100)).toFixed(2)}`);
            console.log('');
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            log(`    BUY FAILED: ${msg}`);
          }
        }
      }

      // ─── Has Position: Monitor & Exit ────────────────────────
      if (position) {
        const pnlPct = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
        const pnlUsd = (currentPrice - position.entryPrice) * position.quantity;
        const holdTime = formatDuration(Date.now() - position.entryTime);

        // Status update every scan
        const pnlSign = pnlPct >= 0 ? '+' : '';
        const pnlColor = pnlPct >= 0 ? '\x1b[32m' : '\x1b[31m';
        const reset = '\x1b[0m';
        log(`HOLDING | $${currentPrice.toFixed(2)} | P&L: ${pnlColor}${pnlSign}${pnlPct.toFixed(3)}% ($${pnlSign}${pnlUsd.toFixed(4)})${reset} | Time: ${holdTime}`);

        // Check exit conditions
        const exitCheck = strategy.shouldExitPosition(position.entryPrice, currentPrice, 'LONG', candles);

        if (exitCheck.exit) {
          console.log('');
          log(`*** SELL SIGNAL ***`);
          log(`    Reason: ${exitCheck.reason}`);

          // Execute SELL
          try {
            log(`    Executing: MARKET SELL ${position.quantity} ${SYMBOL}`);
            const sellOrder = await exchange.createMarketOrder(SYMBOL, 'sell', position.quantity);
            const sellPrice = (sellOrder.average || sellOrder.price || currentPrice) as number;
            const sellRevenue = (sellOrder.cost || position.quantity * sellPrice) as number;
            const buyFee = position.cost * 0.001;
            const sellFee = sellRevenue * 0.001;
            const netPnl = sellRevenue - position.cost - buyFee - sellFee;
            const netPnlPct = (netPnl / position.cost) * 100;

            totalNetPnl += netPnl;

            log(`    SELL FILLED | ID: ${sellOrder.id} | Price: $${sellPrice.toFixed(2)}`);
            console.log('');
            console.log('    ┌─────────────────────────────────────┐');
            console.log(`    │  TRADE #${tradeCount} COMPLETE                  │`);
            console.log('    ├─────────────────────────────────────┤');
            console.log(`    │  Buy:       $${position.entryPrice.toFixed(2).padEnd(22)}│`);
            console.log(`    │  Sell:      $${sellPrice.toFixed(2).padEnd(22)}│`);
            console.log(`    │  Quantity:  ${position.quantity.toString().padEnd(23)}│`);
            console.log(`    │  Fees:      $${(buyFee + sellFee).toFixed(4).padEnd(22)}│`);
            console.log(`    │  Net P&L:   $${netPnl.toFixed(4).padEnd(22)}│`);
            console.log(`    │  Return:    ${netPnlPct.toFixed(3)}%${' '.repeat(19 - netPnlPct.toFixed(3).length)}│`);
            console.log(`    │  Hold Time: ${holdTime.padEnd(23)}│`);
            console.log(`    │  Session:   $${totalNetPnl.toFixed(4)} total${' '.repeat(15 - totalNetPnl.toFixed(4).length)}│`);
            console.log('    └─────────────────────────────────────┘');
            console.log('');

            // Save trade report
            const fs = await import('fs');
            const report = {
              tradeNumber: tradeCount,
              timestamp: new Date().toISOString(),
              symbol: SYMBOL,
              buyOrderId: position.buyOrderId,
              sellOrderId: sellOrder.id,
              buyPrice: position.entryPrice,
              sellPrice,
              quantity: position.quantity,
              cost: position.cost,
              revenue: sellRevenue,
              fees: buyFee + sellFee,
              netPnl,
              returnPct: netPnlPct,
              holdDuration: formatDuration(Date.now() - position.entryTime),
              exitReason: exitCheck.reason,
              sessionTotalPnl: totalNetPnl,
            };
            const reportFile = `trade_report_${tradeCount}_${Date.now()}.json`;
            fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
            log(`Trade report saved: ${reportFile}`);

            position = null;

            // Check max trades
            if (MAX_TRADES > 0 && tradeCount >= MAX_TRADES) {
              log(`Max trades (${MAX_TRADES}) reached. Stopping.`);
              isRunning = false;
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            log(`    SELL FAILED: ${msg}`);
            log(`    WARNING: You still hold ${position.quantity} ${SYMBOL}! Sell manually if needed.`);
          }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`Loop error: ${msg}`);
      await sleep(5000);
      continue;
    }

    await sleep(SCAN_INTERVAL_S * 1000);
  }

  // ─── Session Summary ───────────────────────────────────────────
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                  SESSION SUMMARY                        ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Duration:     ${formatDuration(Date.now() - sessionStartTime).padEnd(40)}║`);
  console.log(`║  Trades:       ${tradeCount.toString().padEnd(40)}║`);
  console.log(`║  Total P&L:    $${totalNetPnl.toFixed(4).padEnd(38)}║`);
  console.log(`║  Scans:        ${scanCount.toString().padEnd(40)}║`);
  if (position) {
    console.log(`║  ⚠ OPEN:       ${position.quantity} ${SYMBOL} @ $${position.entryPrice.toFixed(2).padEnd(20)}║`);
  }
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  if (position) {
    log(`WARNING: You have an open position! Sell ${position.quantity} ${SYMBOL} manually on Binance.`);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
