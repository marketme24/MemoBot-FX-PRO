// src/server/engine_real.ts
import ccxt, { Exchange } from 'ccxt';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

import { billingEngine } from './billing_engine';
import { logger } from './logger';
import { circuitBreaker } from './circuit_breaker';
import { database } from './database';
import { EXCHANGE, RISK } from './constants';

export interface Fill {
  price: number;
  qty: number;
  commission: number;
  commissionAsset: string;
  tradeId?: number;
}

export interface Order {
  id: string;
  orderId: string;
  clientOrderId: string;
  symbol: string;
  side: 'BUY' | 'SELL' | 'buy' | 'sell';
  type: string;
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED' | 'new' | 'filled' | 'canceled' | 'rejected';
  executedQty: number;
  cummulativeQuoteQty: number;
  origQty: number;
  price: number;
  fills: Fill[];
  timeInForce: string;
  transactTime: number;
  mode: 'real';
  timestamp: Date;
  size: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  feesPaid: number;
  mode: 'real';
}

interface SymbolPrecision {
  pricePrecision: number;
  quantityPrecision: number;
  minNotional: number;
  minQty: number;
  stepSize: number;
}

const DB_FILE = path.join(process.cwd(), 'real_state.json');

export class RealEngine {
  private exchange: Exchange;
  public orders: Order[] = [];
  public positions: Position[] = [];
  
  private wsMarket: WebSocket | null = null;
  private reconInterval: ReturnType<typeof setInterval> | null = null;
  public isStarted: boolean = true;

  private livePrices: Record<string, number> = {};
  public balanceCache: number = 0;
  public get cachedBalance(): number { return this.balanceCache; }
  
  public maxPositionSize: number = RISK.MAX_POSITION_SIZE_BASE;
  public maxDailyLoss: number = RISK.MAX_DAILY_LOSS_USDT;
  public dailyRealizedPnl: number = 0;

  private symbolPrecisionCache: Map<string, SymbolPrecision> = new Map();
  private isMockMode: boolean = false;

  constructor(public exchangeId: string, public apiKey: string, public secret: string) {
    this.isMockMode = !apiKey || apiKey === 'mock_key' || apiKey.length < 10;

    this.exchange = new ccxt.binance({
      apiKey,
      secret,
      options: {
        defaultType: 'spot',
        warnOnFetchOpenOrdersWithoutSymbol: false,
        adjustForTimeDifference: true,
      },
      enableRateLimit: true,
    });

    logger.engine('info', `RealEngine initialized for ${exchangeId}${this.isMockMode ? ' [SIMULATION MODE - no valid API keys]' : ' [LIVE MODE]'}`);
    this.loadState();
    this.startReconciliation();
  }

  // --- Symbol Precision ---

  public async getSymbolPrecision(symbol: string): Promise<SymbolPrecision> {
    const cached = this.symbolPrecisionCache.get(symbol);
    if (cached) return cached;

    try {
      await this.exchange.loadMarkets();
      const market = this.exchange.market(symbol);
      const precision: SymbolPrecision = {
        pricePrecision: market.precision?.price as number ?? 2,
        quantityPrecision: market.precision?.amount as number ?? 5,
        minNotional: 10,
        minQty: market.limits?.amount?.min ?? 0.00001,
        stepSize: market.limits?.amount?.min ?? 0.00001,
      };

      // Try to extract minNotional from exchange info filters
      const info = market.info as Record<string, unknown>;
      if (info && Array.isArray(info.filters)) {
        for (const filter of info.filters) {
          const f = filter as Record<string, string>;
          if (f.filterType === 'NOTIONAL' || f.filterType === 'MIN_NOTIONAL') {
            precision.minNotional = parseFloat(f.minNotional || '10');
          }
          if (f.filterType === 'LOT_SIZE') {
            precision.stepSize = parseFloat(f.stepSize || '0.00001');
            precision.minQty = parseFloat(f.minQty || '0.00001');
          }
        }
      }

      this.symbolPrecisionCache.set(symbol, precision);
      logger.engine('info', `Loaded precision for ${symbol}: price=${precision.pricePrecision}, qty=${precision.quantityPrecision}, minNotional=${precision.minNotional}`);
      return precision;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      logger.engine('warn', `Failed to load precision for ${symbol}, using defaults: ${message}`);
      const defaults: SymbolPrecision = { pricePrecision: 2, quantityPrecision: 5, minNotional: 10, minQty: 0.00001, stepSize: 0.00001 };
      this.symbolPrecisionCache.set(symbol, defaults);
      return defaults;
    }
  }

  private formatQuantity(qty: number, precision: SymbolPrecision): number {
    const step = precision.stepSize;
    const adjusted = Math.floor(qty / step) * step;
    return parseFloat(adjusted.toFixed(precision.quantityPrecision));
  }

  // --- Retry Logic ---

  private async requestWithRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= EXCHANGE.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (e: unknown) {
        lastError = e instanceof Error ? e : new Error(String(e));
        const isRateLimit = lastError.message.includes('429') || lastError.message.includes('rate limit') || lastError.message.includes('Too Many');
        const isTransient = isRateLimit || lastError.message.includes('ETIMEDOUT') || lastError.message.includes('ECONNRESET') || lastError.message.includes('network');

        if (!isTransient || attempt === EXCHANGE.MAX_RETRIES) {
          throw lastError;
        }

        const delay = EXCHANGE.RETRY_DELAY_MS * Math.pow(EXCHANGE.RETRY_MULTIPLIER, attempt - 1);
        logger.engine('warn', `${context} attempt ${attempt}/${EXCHANGE.MAX_RETRIES} failed: ${lastError.message}. Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    throw lastError || new Error(`${context} failed after ${EXCHANGE.MAX_RETRIES} retries`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // --- State Persistence ---

  private loadState() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        if (data.orders) this.orders = data.orders;
        if (data.positions) this.positions = data.positions;
        logger.engine('info', 'RealEngine state reloaded from disk.');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      logger.error(`Failed to load RealEngine state: ${message}`);
    }
  }
  
  private saveState() {
    try {
      const data = JSON.stringify({ orders: this.orders, positions: this.positions });
      const tmpFile = DB_FILE + '.tmp';
      fs.writeFileSync(tmpFile, data);
      fs.renameSync(tmpFile, DB_FILE);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      logger.error(`Failed to save RealEngine state: ${message}`);
    }
  }

  // --- Reconciliation ---

  private startReconciliation() {
    this.reconInterval = setInterval(async () => {
      if (!this.isStarted) return;
      try {
        await this.reconcile();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        logger.reconciliation('error', `Reconciliation error: ${message}`);
      }
    }, 15000);
  }

  private async reconcile() {
    if (this.isMockMode) {
      logger.reconciliation('debug', 'Skipping reconciliation in mock mode');
      return;
    }

    logger.reconciliation('info', 'Starting reconciliation cycle.');
    
    let totalUsdt = 0;
    try {
      const [spot, margin, tickers] = await Promise.all([
        this.requestWithRetry(() => this.exchange.fetchBalance({ type: 'spot' }), 'fetchBalance(spot)').catch(() => null),
        this.requestWithRetry(() => this.exchange.fetchBalance({ type: 'margin' }), 'fetchBalance(margin)').catch(() => null),
        this.requestWithRetry(() => this.exchange.fetchTickers(), 'fetchTickers').catch(() => ({})),
      ]);
       
      const processBalance = (bal: Record<string, unknown> | null) => {
        if (bal && (bal as Record<string, Record<string, number>>).total) {
          const total = (bal as Record<string, Record<string, number>>).total;
          for (const currency in total) {
            const amount = total[currency];
            if (amount > 0) {
              if (['USDT', 'USDC', 'FDUSD', 'BUSD'].includes(currency)) {
                totalUsdt += amount;
              } else {
                const pair = `${currency}/USDT`;
                if ((tickers as Record<string, Record<string, number>>)[pair]) {
                  const ticker = (tickers as Record<string, Record<string, number>>)[pair];
                  totalUsdt += amount * (ticker.last || ticker.close || 0);
                } else {
                  const btcPair = `${currency}/BTC`;
                  const btcTicker = (tickers as Record<string, Record<string, number>>)[btcPair];
                  const usdtTicker = (tickers as Record<string, Record<string, number>>)['BTC/USDT'];
                  if (btcTicker && usdtTicker) {
                    totalUsdt += amount * (btcTicker.last || 0) * (usdtTicker.last || 0);
                  }
                }
              }
            }
          }
        }
      };
      processBalance(spot as Record<string, unknown> | null);
      processBalance(margin as Record<string, unknown> | null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      logger.reconciliation('error', `fetchBalance error: ${message}`);
    }
    this.balanceCache = totalUsdt > 0 ? totalUsdt : this.balanceCache;
    circuitBreaker.updateEquity(this.balanceCache);

    // Snapshot balance for history
    if (this.balanceCache > 0) {
      database.insertBalanceSnapshot({
        totalEquity: this.balanceCache,
        availableBalance: this.balanceCache,
        unrealizedPnl: this.positions.reduce((s, p) => s + p.unrealizedPnl, 0),
        timestamp: new Date().toISOString(),
      });
    }

    let openOrders: Array<{ id?: string; status?: string }> = [];
    try {
      const activeSymbols = new Set(
        this.orders
          .filter((o) => ['new', 'NEW', 'partially_filled', 'PARTIALLY_FILLED'].includes(o.status))
          .map((o) => o.symbol)
      );
       
      if (activeSymbols.size === 0) {
        activeSymbols.add('BTC/USDT');
        activeSymbols.add('ETH/USDT');
      }

      for (const sym of activeSymbols) {
        const orders = await this.requestWithRetry(
          () => this.exchange.fetchOpenOrders(sym),
          `fetchOpenOrders(${sym})`
        ).catch(() => [] as Array<{ id?: string; status?: string }>);
        openOrders = openOrders.concat(orders);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      logger.reconciliation('error', `Failed to fetch open orders: ${message}`);
    }

    for (const exOrder of openOrders) {
      const localOrder = this.orders.find((o) => o.orderId === exOrder.id);
      if (localOrder) {
        if (exOrder.status && exOrder.status !== localOrder.status) {
          logger.reconciliation('info', `Order ${exOrder.id} status changed to ${exOrder.status}`);
          localOrder.status = exOrder.status as Order['status'];
          this.saveState();
        }
      }
    }
    logger.reconciliation('info', `Reconciliation complete. Balance: ${this.balanceCache.toFixed(2)} USDT`);
    this.saveState();
  }

  // --- Market WebSocket ---

  public subscribeMarketInfo(symbol: string) {
    const formattedSymbol = symbol.toLowerCase().replace('/', '');
    if (!this.wsMarket || this.wsMarket.readyState !== WebSocket.OPEN) {
      this.wsMarket = new WebSocket(`wss://stream.binance.com:9443/ws/${formattedSymbol}@trade`);
      this.wsMarket.on('message', (data: Buffer) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.e === 'trade') {
            const price = parseFloat(parsed.p);
            this.livePrices[symbol] = price;
            this.updateUnrealizedPnl(symbol, price);
          }
        } catch (_e) { /* ignore parse errors on WS stream */ }
      });
      this.wsMarket.on('close', () => {
        logger.engine('warn', `Market WS closed for ${symbol}, reconnecting...`);
        setTimeout(() => { if (this.isStarted) { this.wsMarket = null; this.subscribeMarketInfo(symbol); } }, 5000);
      });
      this.wsMarket.on('error', (err) => logger.engine('error', `Market WS error for ${symbol}: ${err.message}`));
    }
  }

  // --- Position Management ---

  private processFill(symbol: string, side: string, fill: Fill) {
    let pos = this.positions.find((p) => p.symbol === symbol);
    const fillSide = side.toUpperCase() === 'BUY' ? 'LONG' : 'SHORT';
    if (!pos) {
      pos = {
        id: Math.random().toString(),
        symbol,
        side: fillSide,
        size: 0,
        entryPrice: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        feesPaid: 0,
        mode: 'real',
      };
      this.positions.push(pos);
    }
    pos.feesPaid += fill.commission;
    if (pos.side === fillSide) {
      const totalCost = (pos.size * pos.entryPrice) + (fill.qty * fill.price);
      const newSize = pos.size + fill.qty;
      pos.entryPrice = totalCost / newSize;
      pos.size = newSize;
    } else {
      if (fill.qty <= pos.size) {
        const actualPriceDiff = pos.side === 'LONG' ? (fill.price - pos.entryPrice) : (pos.entryPrice - fill.price);
        const realized = actualPriceDiff * fill.qty;
        pos.realizedPnl += realized;
        this.dailyRealizedPnl += realized;
        pos.size -= fill.qty;
        if (pos.size === 0) pos.entryPrice = 0;

        // Report to circuit breaker
        circuitBreaker.reportTrade(realized);

        if (realized > 0) {
          const tradeIdStr = fill.tradeId ? fill.tradeId.toString() : Math.random().toString();
          billingEngine.chargePerformanceFee(tradeIdStr, symbol, realized, 2.0);
        }

        // Record in database
        database.insertTrade({
          symbol,
          side: side.toUpperCase() as 'BUY' | 'SELL',
          price: fill.price,
          quantity: fill.qty,
          quoteQty: fill.price * fill.qty,
          commission: fill.commission,
          commissionAsset: fill.commissionAsset,
          realizedPnl: realized,
          mode: 'real',
          status: 'FILLED',
          timestamp: new Date().toISOString(),
          orderId: fill.tradeId?.toString() || '',
        });
      } else {
        const closeQty = pos.size;
        const newOpenQty = fill.qty - closeQty;
        if (closeQty > 0) {
          const actualPriceDiff = pos.side === 'LONG' ? (fill.price - pos.entryPrice) : (pos.entryPrice - fill.price);
          const realized = actualPriceDiff * closeQty;
          pos.realizedPnl += realized;
          this.dailyRealizedPnl += realized;
          circuitBreaker.reportTrade(realized);

          if (realized > 0) {
            const tradeIdStr = fill.tradeId ? fill.tradeId.toString() : Math.random().toString();
            billingEngine.chargePerformanceFee(tradeIdStr, symbol, realized, 2.0);
          }

          database.insertTrade({
            symbol,
            side: side.toUpperCase() as 'BUY' | 'SELL',
            price: fill.price,
            quantity: closeQty,
            quoteQty: fill.price * closeQty,
            commission: fill.commission,
            commissionAsset: fill.commissionAsset,
            realizedPnl: realized,
            mode: 'real',
            status: 'FILLED',
            timestamp: new Date().toISOString(),
            orderId: fill.tradeId?.toString() || '',
          });
        }
        pos.side = fillSide;
        pos.size = newOpenQty;
        pos.entryPrice = fill.price;
      }
    }
  }

  private updateUnrealizedPnl(symbol: string, currentPrice: number) {
    const pos = this.positions.find((p) => p.symbol === symbol && p.size > 0);
    if (pos) {
      if (pos.side === 'LONG') {
        pos.unrealizedPnl = (currentPrice - pos.entryPrice) * pos.size;
      } else {
        pos.unrealizedPnl = (pos.entryPrice - currentPrice) * pos.size;
      }
    }
  }

  // --- Public API ---

  async fetchBalance() {
    return this.balanceCache || 0;
  }

  async placeOrder(symbol: string, side: 'buy' | 'sell', type: 'market' | 'limit', size: number, price?: number): Promise<Order> {
    // Pre-flight checks
    if (!this.isStarted) throw new Error('Bot is paused/stopped.');
    if (this.dailyRealizedPnl < -this.maxDailyLoss) throw new Error('Max daily loss reached.');
    if (!circuitBreaker.canTrade()) throw new Error(`Circuit breaker active: ${circuitBreaker.getStatus().state}`);

    const pos = this.positions.find((p) => p.symbol === symbol);
    const currentSize = pos ? pos.size : 0;
    if (currentSize + size > this.maxPositionSize) {
      throw new Error(`Size exceeds max position ${this.maxPositionSize}`);
    }

    // Get symbol precision and validate
    const precision = await this.getSymbolPrecision(symbol);
    const formattedSize = this.formatQuantity(size, precision);

    if (formattedSize <= 0) {
      throw new Error(`Order quantity rounds to zero after precision formatting (raw: ${size}, formatted: ${formattedSize})`);
    }

    // Validate minimum notional
    const estPrice = price || this.livePrices[symbol] || 0;
    if (estPrice > 0) {
      const notional = formattedSize * estPrice;
      if (notional < precision.minNotional) {
        throw new Error(`Order notional $${notional.toFixed(2)} below minimum $${precision.minNotional} for ${symbol}`);
      }
    }

    // Balance check for all order sides (buy or sell-short require margin/balance)
    if (estPrice > 0 && this.balanceCache > 0) {
      const cost = formattedSize * estPrice;
      if (cost > this.balanceCache) {
        throw new Error(`Insufficient balance. Need ${cost.toFixed(2)}, have ${this.balanceCache.toFixed(2)}`);
      }
    }

    this.subscribeMarketInfo(symbol);

    logger.execution('info', `Placing ${type} ${side} order: ${symbol} qty=${formattedSize}${price ? ` @ ${price}` : ''}`);

    // --- MOCK MODE: Simulation when no valid API keys ---
    if (this.isMockMode) {
      logger.execution('warn', `[SIMULATION] No valid API keys — order simulated locally. This is NOT a real trade.`);
      const simPrice = price || this.livePrices[symbol] || 65000;
      const simResult = this.createSimulatedOrder(symbol, side, type, formattedSize, simPrice);
      return simResult;
    }

    // --- LIVE MODE: Real exchange execution with retry ---
    const params = { newOrderRespType: 'FULL' };
    const result = await this.requestWithRetry(async () => {
      if (type === 'market') {
        return await this.exchange.createMarketOrder(symbol, side, formattedSize, undefined, params);
      } else {
        return await this.exchange.createLimitOrder(symbol, side, formattedSize, price || 0, params);
      }
    }, `placeOrder(${side} ${symbol})`);

    const info = result.info as Record<string, string | number | Record<string, string>[]>;
    let order = this.orders.find((o) => o.orderId === info.orderId?.toString());
    if (!order) {
      order = {
        id: info.orderId?.toString() || result.id,
        orderId: info.orderId?.toString() || result.id,
        clientOrderId: info.clientOrderId as string,
        symbol: (info.symbol as string) || symbol,
        side: ((info.side as string) || side.toUpperCase()) as Order['side'],
        type: (info.type as string) || type.toUpperCase(),
        status: ((info.status as string) || result.status) as Order['status'],
        executedQty: parseFloat((info.executedQty as string) || '0'),
        cummulativeQuoteQty: parseFloat((info.cummulativeQuoteQty as string) || '0'),
        origQty: parseFloat((info.origQty as string) || size.toString()),
        price: parseFloat((info.price as string) || price?.toString() || '0'),
        fills: [],
        timeInForce: (info.timeInForce as string) || 'GTC',
        transactTime: (info.transactTime as number) || Date.now(),
        mode: 'real',
        timestamp: new Date((info.transactTime as number) || Date.now()),
        size: parseFloat((info.origQty as string) || size.toString()),
      };
      this.orders.push(order);
      this.saveState();
    }

    if (info.fills && Array.isArray(info.fills)) {
      for (const rawFill of info.fills) {
        const tId = (rawFill as Record<string, string | number>).tradeId as number;
        const fillPrice = parseFloat((rawFill as Record<string, string>).price);
        const fillQty = parseFloat((rawFill as Record<string, string>).qty);
        const commission = parseFloat((rawFill as Record<string, string>).commission);
        const commissionAsset = (rawFill as Record<string, string>).commissionAsset;
        const existingFill = order.fills.find((f) => f.tradeId === tId);
        if (!existingFill && fillQty > 0) {
          const newFill = { price: fillPrice, qty: fillQty, commission, commissionAsset, tradeId: tId };
          order.fills.push(newFill);
          this.processFill(order.symbol, order.side as string, newFill);
        }
      }
      this.saveState();
    }

    // Verify fill status
    const filledStatus = ['FILLED', 'filled', 'closed'];
    if (!filledStatus.includes(order.status)) {
      logger.execution('warn', `Order ${order.orderId} status is ${order.status}, not FILLED. Monitor via reconciliation.`);
    }

    logger.execution('info', `Order executed: ${order.orderId} ${order.side} ${symbol} qty=${order.executedQty} status=${order.status}`);
    return order;
  }

  private createSimulatedOrder(symbol: string, side: string, type: string, size: number, estPrice: number): Order {
    const order: Order = {
      id: `SIM-${Date.now()}`,
      orderId: `SIM-${Date.now()}`,
      clientOrderId: `sim_${Date.now()}`,
      symbol: symbol.replace('/', ''),
      side: side.toUpperCase() as Order['side'],
      type: type.toUpperCase(),
      status: 'FILLED',
      executedQty: size,
      cummulativeQuoteQty: size * estPrice,
      origQty: size,
      price: estPrice,
      fills: [],
      timeInForce: 'GTC',
      transactTime: Date.now(),
      mode: 'real',
      timestamp: new Date(),
      size,
    };

    const simFill: Fill = {
      price: estPrice,
      qty: size,
      commission: size * estPrice * 0.001,
      commissionAsset: 'USDT',
      tradeId: Date.now(),
    };
    order.fills.push(simFill);
    this.orders.push(order);
    this.processFill(symbol, side, simFill);
    this.saveState();
    return order;
  }

  public cleanup() {
    if (this.reconInterval) clearInterval(this.reconInterval);
    if (this.wsMarket) this.wsMarket.close();
  }
}
