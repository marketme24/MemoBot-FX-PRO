// src/server/strategy.ts — Real Technical Analysis Strategy Engine

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Signal = 'BUY' | 'SELL' | 'HOLD';

export interface StrategyDecision {
  signal: Signal;
  confidence: number; // 0-1
  reason: string;
  indicators: {
    rsi: number;
    emaFast: number;
    emaSlow: number;
    atr: number;
    volumeRatio: number;
  };
  stopLoss: number;
  takeProfit: number;
}

interface StrategyConfig {
  emaFastPeriod: number;
  emaSlowPeriod: number;
  rsiPeriod: number;
  rsiBuyThreshold: number;
  rsiSellThreshold: number;
  atrPeriod: number;
  takeProfitPct: number;
  stopLossPct: number;
  volumeSpikeRatio: number;
  minConfidence: number;
}

const DEFAULT_CONFIG: StrategyConfig = {
  emaFastPeriod: 9,
  emaSlowPeriod: 21,
  rsiPeriod: 14,
  rsiBuyThreshold: 40,
  rsiSellThreshold: 65,
  atrPeriod: 14,
  takeProfitPct: 1.5,
  stopLossPct: 1.0,
  volumeSpikeRatio: 1.3,
  minConfidence: 0.55,
};

// --- Technical Indicators ---

function calcEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  if (data.length === 0) return ema;

  const multiplier = 2 / (period + 1);
  ema[0] = data[0];

  for (let i = 1; i < data.length; i++) {
    ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  return ema;
}

function calcRSI(closes: number[], period: number): number[] {
  const rsi: number[] = new Array(closes.length).fill(50);
  if (closes.length < period + 1) return rsi;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

function calcATR(candles: Candle[], period: number): number[] {
  const atr: number[] = new Array(candles.length).fill(0);
  if (candles.length < 2) return atr;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) return atr;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += trueRanges[i];
  atr[period] = sum / period;

  for (let i = period; i < trueRanges.length; i++) {
    atr[i + 1] = (atr[i] * (period - 1) + trueRanges[i]) / period;
  }
  return atr;
}

function avgVolume(candles: Candle[], period: number): number {
  if (candles.length < period) return 0;
  const recent = candles.slice(-period);
  return recent.reduce((s, c) => s + c.volume, 0) / period;
}

// --- Strategy ---

export class TradingStrategy {
  private config: StrategyConfig;

  constructor(config?: Partial<StrategyConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public analyze(candles: Candle[]): StrategyDecision {
    const minRequired = Math.max(this.config.emaSlowPeriod, this.config.rsiPeriod, this.config.atrPeriod) + 5;

    if (candles.length < minRequired) {
      return {
        signal: 'HOLD',
        confidence: 0,
        reason: `Insufficient data: need ${minRequired} candles, have ${candles.length}`,
        indicators: { rsi: 50, emaFast: 0, emaSlow: 0, atr: 0, volumeRatio: 0 },
        stopLoss: 0,
        takeProfit: 0,
      };
    }

    const closes = candles.map((c) => c.close);
    const lastIdx = closes.length - 1;
    const currentPrice = closes[lastIdx];

    // Calculate indicators
    const emaFastArr = calcEMA(closes, this.config.emaFastPeriod);
    const emaSlowArr = calcEMA(closes, this.config.emaSlowPeriod);
    const rsiArr = calcRSI(closes, this.config.rsiPeriod);
    const atrArr = calcATR(candles, this.config.atrPeriod);

    const emaFast = emaFastArr[lastIdx];
    const emaSlow = emaSlowArr[lastIdx];
    const rsi = rsiArr[lastIdx];
    const atr = atrArr[lastIdx];

    const prevEmaFast = emaFastArr[lastIdx - 1];
    const prevEmaSlow = emaSlowArr[lastIdx - 1];

    // Volume analysis
    const avgVol = avgVolume(candles, 20);
    const currentVol = candles[lastIdx].volume;
    const volumeRatio = avgVol > 0 ? currentVol / avgVol : 1;

    const indicators = { rsi, emaFast, emaSlow, atr, volumeRatio };

    // --- BUY Signal ---
    let buyScore = 0;
    const buyReasons: string[] = [];

    // EMA crossover (fast crosses above slow)
    if (prevEmaFast <= prevEmaSlow && emaFast > emaSlow) {
      buyScore += 0.35;
      buyReasons.push('EMA bullish crossover');
    } else if (emaFast > emaSlow) {
      buyScore += 0.15;
      buyReasons.push('EMA bullish trend');
    }

    // RSI oversold recovery
    if (rsi < this.config.rsiBuyThreshold) {
      buyScore += 0.25;
      buyReasons.push(`RSI oversold (${rsi.toFixed(1)})`);
    } else if (rsi < 50) {
      buyScore += 0.1;
      buyReasons.push(`RSI below midpoint (${rsi.toFixed(1)})`);
    }

    // Price above fast EMA (momentum)
    if (currentPrice > emaFast) {
      buyScore += 0.15;
      buyReasons.push('Price above fast EMA');
    }

    // Volume confirmation
    if (volumeRatio > this.config.volumeSpikeRatio) {
      buyScore += 0.15;
      buyReasons.push(`Volume spike (${volumeRatio.toFixed(1)}x avg)`);
    }

    // Price pulling back to EMA support
    const pullbackPct = Math.abs(currentPrice - emaFast) / emaFast * 100;
    if (emaFast > emaSlow && pullbackPct < 0.3) {
      buyScore += 0.1;
      buyReasons.push('Price at EMA support');
    }

    // --- SELL Signal ---
    let sellScore = 0;
    const sellReasons: string[] = [];

    // EMA death cross
    if (prevEmaFast >= prevEmaSlow && emaFast < emaSlow) {
      sellScore += 0.35;
      sellReasons.push('EMA bearish crossover');
    } else if (emaFast < emaSlow) {
      sellScore += 0.15;
      sellReasons.push('EMA bearish trend');
    }

    // RSI overbought
    if (rsi > this.config.rsiSellThreshold) {
      sellScore += 0.25;
      sellReasons.push(`RSI overbought (${rsi.toFixed(1)})`);
    }

    // Price below fast EMA
    if (currentPrice < emaFast) {
      sellScore += 0.15;
      sellReasons.push('Price below fast EMA');
    }

    // Volume on downmove
    if (volumeRatio > this.config.volumeSpikeRatio && currentPrice < candles[lastIdx - 1].close) {
      sellScore += 0.15;
      sellReasons.push('High volume selling');
    }

    // --- Decision ---
    const stopLoss = currentPrice * (1 - this.config.stopLossPct / 100);
    const takeProfit = currentPrice * (1 + this.config.takeProfitPct / 100);

    if (buyScore > sellScore && buyScore >= this.config.minConfidence) {
      return {
        signal: 'BUY',
        confidence: Math.min(buyScore, 1),
        reason: buyReasons.join(' + '),
        indicators,
        stopLoss,
        takeProfit,
      };
    }

    if (sellScore > buyScore && sellScore >= this.config.minConfidence) {
      return {
        signal: 'SELL',
        confidence: Math.min(sellScore, 1),
        reason: sellReasons.join(' + '),
        indicators,
        stopLoss,
        takeProfit,
      };
    }

    return {
      signal: 'HOLD',
      confidence: Math.max(buyScore, sellScore),
      reason: `No clear signal (buy=${buyScore.toFixed(2)}, sell=${sellScore.toFixed(2)})`,
      indicators,
      stopLoss,
      takeProfit,
    };
  }

  public shouldExitPosition(
    entryPrice: number,
    currentPrice: number,
    side: 'LONG',
    candles: Candle[]
  ): { exit: boolean; reason: string } {
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

    // Stop loss
    if (pnlPct <= -this.config.stopLossPct) {
      return { exit: true, reason: `Stop loss hit: ${pnlPct.toFixed(2)}% (limit: -${this.config.stopLossPct}%)` };
    }

    // Take profit
    if (pnlPct >= this.config.takeProfitPct) {
      return { exit: true, reason: `Take profit hit: +${pnlPct.toFixed(2)}% (target: +${this.config.takeProfitPct}%)` };
    }

    // Strategy reversal
    if (candles.length > 25) {
      const decision = this.analyze(candles);
      if (decision.signal === 'SELL' && decision.confidence >= 0.5) {
        return { exit: true, reason: `Strategy reversal signal: ${decision.reason} (confidence: ${decision.confidence.toFixed(2)})` };
      }
    }

    return { exit: false, reason: `Holding: P&L ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%` };
  }
}
