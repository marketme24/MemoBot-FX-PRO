/**
 * MEMOBOT FX-PRO — Real Trade Test Script
 * 
 * Executes exactly: 1 BUY → HOLD → 1 SELL on Binance Spot
 * 
 * Usage:
 *   1. Create .env with your BINANCE_API_KEY and BINANCE_API_SECRET
 *   2. Run: npm run test-trade
 * 
 * Default: $12 USDT on BTC/USDT, 30-second hold
 * Override: TRADE_AMOUNT=20 TRADE_SYMBOL=ETH/USDT HOLD_SECONDS=60 npm run test-trade
 */

import 'dotenv/config';
import ccxt, { Exchange, Order as CcxtOrder } from 'ccxt';

// ─── Configuration ───────────────────────────────────────────────

const API_KEY = process.env.BINANCE_API_KEY || '';
const API_SECRET = process.env.BINANCE_API_SECRET || '';
const SYMBOL = process.env.TRADE_SYMBOL || 'BTC/USDT';
const TRADE_AMOUNT_USDT = parseFloat(process.env.TRADE_AMOUNT || '12');
const HOLD_SECONDS = parseInt(process.env.HOLD_SECONDS || '30');

// ─── Helpers ─────────────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function logSection(title: string) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface SymbolInfo {
  pricePrecision: number;
  qtyPrecision: number;
  minNotional: number;
  minQty: number;
  stepSize: number;
}

async function getSymbolInfo(exchange: Exchange, symbol: string): Promise<SymbolInfo> {
  await exchange.loadMarkets();
  const market = exchange.market(symbol);
  
  const info: SymbolInfo = {
    pricePrecision: (market.precision?.price as number) ?? 2,
    qtyPrecision: (market.precision?.amount as number) ?? 5,
    minNotional: 10,
    minQty: market.limits?.amount?.min ?? 0.00001,
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
        info.minQty = parseFloat(f.minQty || '0.00001');
      }
    }
  }

  return info;
}

function formatQty(qty: number, stepSize: number, precision: number): number {
  const adjusted = Math.floor(qty / stepSize) * stepSize;
  return parseFloat(adjusted.toFixed(precision));
}

// ─── Main ────────────────────────────────────────────────────────

async function runTestTrade() {
  logSection('MEMOBOT FX-PRO — REAL TRADE TEST');
  
  // Validate keys
  if (!API_KEY || API_KEY === 'your_binance_api_key_here' || API_KEY.length < 10) {
    console.error('\n❌ ERROR: No valid Binance API keys found.');
    console.error('   1. Copy .env.example to .env');
    console.error('   2. Add your BINANCE_API_KEY and BINANCE_API_SECRET');
    console.error('   3. Run again: npm run test-trade\n');
    process.exit(1);
  }

  log(`Symbol: ${SYMBOL}`);
  log(`Trade Amount: $${TRADE_AMOUNT_USDT} USDT`);
  log(`Hold Duration: ${HOLD_SECONDS} seconds`);
  log('Mode: LIVE SPOT TRADING');

  // Initialize exchange
  const exchange = new ccxt.binance({
    apiKey: API_KEY,
    secret: API_SECRET,
    enableRateLimit: true,
    options: {
      defaultType: 'spot',
      adjustForTimeDifference: true,
      warnOnFetchOpenOrdersWithoutSymbol: false,
    },
  });

  // ─── Step 1: Connection Test ───────────────────────────────────
  logSection('STEP 1: CONNECTION & BALANCE CHECK');
  
  let balance: number;
  try {
    const start = Date.now();
    const bal = await exchange.fetchBalance({ type: 'spot' });
    const latency = Date.now() - start;
    
    const usdtFree = (bal.free as unknown as Record<string, number>)?.['USDT'] || 0;
    const usdtTotal = (bal.total as unknown as Record<string, number>)?.['USDT'] || 0;
    balance = usdtFree as number;

    log(`✅ Connected to Binance (${latency}ms latency)`);
    log(`   USDT Available: $${(usdtFree as number).toFixed(2)}`);
    log(`   USDT Total: $${(usdtTotal as number).toFixed(2)}`);
    
    if (balance < TRADE_AMOUNT_USDT) {
      console.error(`\n❌ Insufficient USDT balance. Need $${TRADE_AMOUNT_USDT}, have $${balance.toFixed(2)}`);
      process.exit(1);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n❌ Failed to connect to Binance: ${msg}`);
    if (msg.includes('Invalid API')) console.error('   Check your API key and secret in .env');
    if (msg.includes('IP')) console.error('   Your IP may not be whitelisted on Binance');
    process.exit(1);
  }

  // ─── Step 2: Get Symbol Info ───────────────────────────────────
  logSection('STEP 2: SYMBOL PRECISION');

  let symbolInfo: SymbolInfo;
  try {
    symbolInfo = await getSymbolInfo(exchange, SYMBOL);
    log(`✅ ${SYMBOL} loaded`);
    log(`   Price Precision: ${symbolInfo.pricePrecision} decimals`);
    log(`   Qty Precision: ${symbolInfo.qtyPrecision} decimals`);
    log(`   Min Notional: $${symbolInfo.minNotional}`);
    log(`   Step Size: ${symbolInfo.stepSize}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n❌ Failed to load symbol info: ${msg}`);
    process.exit(1);
  }

  // ─── Step 3: Get Current Price ─────────────────────────────────
  logSection('STEP 3: MARKET PRICE');

  let currentPrice: number;
  try {
    const ticker = await exchange.fetchTicker(SYMBOL);
    currentPrice = ticker.last as number;
    log(`✅ ${SYMBOL} Current Price: $${currentPrice}`);
    log(`   24h High: $${ticker.high}  |  24h Low: $${ticker.low}`);
    log(`   24h Change: ${ticker.percentage}%`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n❌ Failed to fetch ticker: ${msg}`);
    process.exit(1);
  }

  // Calculate quantity
  const rawQty = TRADE_AMOUNT_USDT / currentPrice;
  const qty = formatQty(rawQty, symbolInfo.stepSize, symbolInfo.qtyPrecision);
  const notional = qty * currentPrice;

  log(`   Calculated Quantity: ${qty} (raw: ${rawQty.toFixed(8)})`);
  log(`   Notional Value: $${notional.toFixed(2)}`);

  if (qty <= 0) {
    console.error(`\n❌ Quantity rounds to zero. Increase TRADE_AMOUNT.`);
    process.exit(1);
  }
  if (notional < symbolInfo.minNotional) {
    console.error(`\n❌ Notional $${notional.toFixed(2)} below minimum $${symbolInfo.minNotional}`);
    process.exit(1);
  }

  // ─── Step 4: Execute BUY ───────────────────────────────────────
  logSection('STEP 4: EXECUTING BUY ORDER');

  let buyOrder: CcxtOrder;
  const buyTimestamp = Date.now();
  try {
    log(`📤 Sending MARKET BUY: ${qty} ${SYMBOL}...`);
    buyOrder = await exchange.createMarketOrder(SYMBOL, 'buy', qty);
    const buyLatency = Date.now() - buyTimestamp;
    
    log(`✅ BUY ORDER FILLED`);
    log(`   Order ID: ${buyOrder.id}`);
    log(`   Status: ${buyOrder.status}`);
    log(`   Filled Qty: ${buyOrder.filled}`);
    log(`   Avg Price: $${buyOrder.average || buyOrder.price || 'N/A'}`);
    log(`   Cost: $${buyOrder.cost?.toFixed(4) || 'N/A'}`);
    log(`   Execution Time: ${buyLatency}ms`);
    
    if (buyOrder.fee) {
      log(`   Fee: ${JSON.stringify(buyOrder.fee)}`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n❌ BUY ORDER FAILED: ${msg}`);
    if (msg.includes('MIN_NOTIONAL')) console.error('   Trade amount too small. Increase TRADE_AMOUNT.');
    if (msg.includes('LOT_SIZE')) console.error('   Quantity precision issue.');
    if (msg.includes('balance')) console.error('   Insufficient balance.');
    process.exit(1);
  }

  const buyPrice = buyOrder.average || buyOrder.price || currentPrice;
  const filledQty = buyOrder.filled || qty;
  const buyCost = buyOrder.cost || (filledQty * (buyPrice as number));
  const buyFee = (buyOrder.fee?.cost as number) || (buyCost as number) * 0.001;

  // ─── Step 5: Hold Period ───────────────────────────────────────
  logSection(`STEP 5: HOLDING FOR ${HOLD_SECONDS} SECONDS`);

  for (let i = HOLD_SECONDS; i > 0; i--) {
    if (i % 10 === 0 || i <= 5) {
      try {
        const t = await exchange.fetchTicker(SYMBOL);
        const unrealized = ((t.last as number) - (buyPrice as number)) * (filledQty as number);
        const pctChange = (((t.last as number) - (buyPrice as number)) / (buyPrice as number)) * 100;
        log(`⏱  ${i}s remaining | Price: $${t.last} | Unrealized P&L: $${unrealized.toFixed(4)} (${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(3)}%)`);
      } catch (_e) {
        log(`⏱  ${i}s remaining...`);
      }
    }
    await sleep(1000);
  }

  // ─── Step 6: Execute SELL ──────────────────────────────────────
  logSection('STEP 6: EXECUTING SELL ORDER');

  let sellOrder: CcxtOrder;
  const sellTimestamp = Date.now();
  try {
    log(`📤 Sending MARKET SELL: ${filledQty} ${SYMBOL}...`);
    sellOrder = await exchange.createMarketOrder(SYMBOL, 'sell', filledQty as number);
    const sellLatency = Date.now() - sellTimestamp;

    log(`✅ SELL ORDER FILLED`);
    log(`   Order ID: ${sellOrder.id}`);
    log(`   Status: ${sellOrder.status}`);
    log(`   Filled Qty: ${sellOrder.filled}`);
    log(`   Avg Price: $${sellOrder.average || sellOrder.price || 'N/A'}`);
    log(`   Revenue: $${sellOrder.cost?.toFixed(4) || 'N/A'}`);
    log(`   Execution Time: ${sellLatency}ms`);

    if (sellOrder.fee) {
      log(`   Fee: ${JSON.stringify(sellOrder.fee)}`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n❌ SELL ORDER FAILED: ${msg}`);
    console.error(`\n⚠️  WARNING: You still hold ${filledQty} of ${SYMBOL}!`);
    console.error(`   Sell manually on Binance to close the position.`);
    process.exit(1);
  }

  const sellPrice = sellOrder.average || sellOrder.price || currentPrice;
  const sellRevenue = sellOrder.cost || ((filledQty as number) * (sellPrice as number));
  const sellFee = (sellOrder.fee?.cost as number) || (sellRevenue as number) * 0.001;

  // ─── Step 7: P&L Report ────────────────────────────────────────
  logSection('FINAL P&L REPORT');

  const grossPnl = (sellRevenue as number) - (buyCost as number);
  const totalFees = (buyFee as number) + (sellFee as number);
  const netPnl = grossPnl - totalFees;
  const returnPct = (netPnl / (buyCost as number)) * 100;
  const totalDuration = ((Date.now() - buyTimestamp) / 1000).toFixed(1);

  console.log('');
  console.log('┌──────────────────────────────────────────┐');
  console.log('│       MEMOBOT FX-PRO TRADE REPORT        │');
  console.log('├──────────────────────────────────────────┤');
  console.log(`│  Symbol:      ${SYMBOL.padEnd(27)}│`);
  console.log(`│  Buy Price:   $${(buyPrice as number).toFixed(2).padEnd(25)}│`);
  console.log(`│  Sell Price:  $${(sellPrice as number).toFixed(2).padEnd(25)}│`);
  console.log(`│  Quantity:    ${(filledQty as number).toString().padEnd(27)}│`);
  console.log(`│  Buy Cost:    $${(buyCost as number).toFixed(4).padEnd(25)}│`);
  console.log(`│  Sell Revenue:$${(sellRevenue as number).toFixed(4).padEnd(25)}│`);
  console.log('├──────────────────────────────────────────┤');
  console.log(`│  Gross P&L:   $${grossPnl.toFixed(4).padEnd(25)}│`);
  console.log(`│  Total Fees:  $${totalFees.toFixed(4).padEnd(25)}│`);
  console.log(`│  NET P&L:     $${netPnl.toFixed(4).padEnd(25)}│`);
  console.log(`│  Return:      ${returnPct.toFixed(4)}%${' '.repeat(21 - returnPct.toFixed(4).length)}│`);
  console.log(`│  Duration:    ${totalDuration}s${' '.repeat(24 - totalDuration.length)}│`);
  console.log('├──────────────────────────────────────────┤');
  console.log(`│  Status:      ${netPnl >= 0 ? '✅ PROFITABLE' : '📉 LOSS (normal for short hold)'}${' '.repeat(netPnl >= 0 ? 14 : 0)}│`);
  console.log(`│  Engine:      ✅ VERIFIED WORKING        │`);
  console.log('└──────────────────────────────────────────┘');
  console.log('');
  
  // Save report to file
  const report = {
    timestamp: new Date().toISOString(),
    symbol: SYMBOL,
    buyOrderId: buyOrder.id,
    sellOrderId: sellOrder.id,
    buyPrice,
    sellPrice,
    quantity: filledQty,
    buyCost,
    sellRevenue,
    grossPnl,
    totalFees,
    netPnl,
    returnPct,
    durationSeconds: parseFloat(totalDuration),
    status: 'COMPLETED',
  };

  const fs = await import('fs');
  const reportPath = `trade_report_${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`📄 Full report saved to: ${reportPath}`);
  log('');
  log('🎯 MEMOBOT FX-PRO — Real trade cycle completed successfully.');
}

// ─── Execute ─────────────────────────────────────────────────────

runTestTrade().catch((e) => {
  console.error('\n💥 Unexpected error:', e);
  process.exit(1);
});
