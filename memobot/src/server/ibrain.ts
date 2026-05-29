import fs from 'fs';
import path from 'path';

// --- Types & Interfaces ---

export interface TradeDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0 to 1
  reason: string;
  suggestedSize: number; // Percentage of bankroll or nominal amount
  suggestedLeverage: number;
  stopLossPct?: number;
  takeProfitPct?: number;
}

export interface MarketState {
  volatility: number;      // 0 to 1
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  liquidity: number;       // 0 to 1
  momentumScore: number;   // -1 to 1
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

export interface StrategyPerformance {
  strategyId: string;
  winRate: number;
  profitFactor: number;
  recentTradesCount: number;
  adaptiveWeight: number; // dynamically adjusted
  currentState: 'OPTIMIZED' | 'DEGRADED' | 'EVALUATING';
}

export interface MemoryEntry {
  id: string;
  timestamp: string;
  type: 'TRADE_OUTCOME' | 'MARKET_CONDITION' | 'OPTIMIZATION_CYCLE';
  symbol: string;
  data: any;
  tags: string[];
}

export interface IBrainState {
  marketIntel: MarketState;
  strategyStates: Record<string, StrategyPerformance>;
  memoryStats: {
    totalMemories: number;
    lastOptimizationCycle: string;
  };
  decisionLogs: any[];
}

// --- I-Brain Implementation ---

export class IBrainSystem {
  private memoryStoreFile = path.resolve(process.cwd(), '.ibrain_memory.json');
  private memories: MemoryEntry[] = [];
  
  public state: IBrainState = {
    marketIntel: {
      volatility: 0.5,
      trend: 'SIDEWAYS',
      liquidity: 0.8,
      momentumScore: 0,
      riskLevel: 'MEDIUM',
    },
    strategyStates: {},
    memoryStats: {
      totalMemories: 0,
      lastOptimizationCycle: new Date().toISOString()
    },
    decisionLogs: []
  };

  constructor() {
    this.loadMemory();
    this.initializeStrategies();
  }

  // --- 1. Memory Layer ---

  private loadMemory() {
    try {
      if (fs.existsSync(this.memoryStoreFile)) {
        const data = fs.readFileSync(this.memoryStoreFile, 'utf-8');
        this.memories = JSON.parse(data);
        this.state.memoryStats.totalMemories = this.memories.length;
      }
    } catch(e) {
      console.error("Failed to load I-Brain memory", e);
    }
  }

  private saveMemory() {
    try {
      fs.writeFileSync(this.memoryStoreFile, JSON.stringify(this.memories, null, 2));
      this.state.memoryStats.totalMemories = this.memories.length;
    } catch(e) {
      console.error("Failed to save I-Brain memory", e);
    }
  }

  public addMemory(type: MemoryEntry['type'], symbol: string, data: any, tags: string[] = []) {
    const entry: MemoryEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      type,
      symbol,
      data,
      tags
    };
    this.memories.push(entry);
    
    // Prune short-term memory if needed, but keep long-term up to 10k items
    if (this.memories.length > 10000) {
      this.memories.shift();
    }
    this.saveMemory();
  }

  // --- 2. Market Intelligence Layer ---

  public updateMarketIntelligence(prices: number[], volumes: number[]) {
    // Simulate complex analysis on price time-series
    if (prices.length < 2) return;
    
    const latest = prices[prices.length -1];
    const prev = prices[0];
    
    // Volatility calculation (mocked for simplicity)
    const stdDev = Math.abs(latest - prev) / prev;
    const volatility = Math.min(1, stdDev * 10);
    
    // Trend
    let trend: MarketState['trend'] = 'SIDEWAYS';
    if (latest > prev * 1.001) trend = 'BULLISH';
    else if (latest < prev * 0.999) trend = 'BEARISH';
    
    // Risk Detection
    let riskLevel: MarketState['riskLevel'] = 'LOW';
    if (volatility > 0.8) riskLevel = 'EXTREME';
    else if (volatility > 0.5) riskLevel = 'HIGH';
    else if (volatility > 0.3) riskLevel = 'MEDIUM';
    
    this.state.marketIntel = {
      volatility,
      trend,
      liquidity: Math.random() * 0.2 + 0.8, // Fake high liquidity
      momentumScore: trend === 'BULLISH' ? 0.8 : trend === 'BEARISH' ? -0.8 : 0,
      riskLevel
    };
  }

  // --- 3. Strategy Intelligence Layer ---
  
  private initializeStrategies() {
    this.state.strategyStates['trend_following'] = {
      strategyId: 'trend_following',
      winRate: 0.65,
      profitFactor: 1.5,
      recentTradesCount: 120,
      adaptiveWeight: 1.0,
      currentState: 'OPTIMIZED'
    };
    this.state.strategyStates['mean_reversion'] = {
      strategyId: 'mean_reversion',
      winRate: 0.58,
      profitFactor: 1.2,
      recentTradesCount: 80,
      adaptiveWeight: 0.8,
      currentState: 'EVALUATING'
    };
  }

  public reportTradeOutcome(strategyId: string, pnl: number, symbol: string) {
    this.addMemory('TRADE_OUTCOME', symbol, { strategyId, pnl }, [strategyId, pnl > 0 ? 'WIN' : 'LOSS']);
    
    const strat = this.state.strategyStates[strategyId];
    if (strat) {
      // Dynamic parameter tuning
      strat.recentTradesCount++;
      // Simple exp moving average for win rate
      const isWin = pnl > 0 ? 1 : 0;
      strat.winRate = (strat.winRate * 0.9) + (isWin * 0.1);
      
      if (strat.winRate < 0.4) strat.currentState = 'DEGRADED';
      else if (strat.winRate > 0.6) strat.currentState = 'OPTIMIZED';
      else strat.currentState = 'EVALUATING';
    }
  }

  // --- Technical Indicators ---
  private calculateRSI(prices: number[], periods: number = 14): number {
    if (prices.length < periods + 1) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= periods; i++) {
        const change = prices[prices.length - i] - prices[prices.length - i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }
    const avgGain = gains / periods;
    const avgLoss = losses / periods;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateSMA(prices: number[], periods: number): number {
      if (prices.length < periods) return prices[prices.length - 1];
      const slice = prices.slice(-periods);
      return slice.reduce((a, b) => a + b, 0) / periods;
  }

  // --- 4. Decision Engine (The Core Brain) ---

  public evaluateTradeProposal(strategyId: string, symbol: string, direction: 'BUY' | 'SELL', historicalPrices: number[] = []): TradeDecision {
    const intel = this.state.marketIntel;
    const strat = this.state.strategyStates[strategyId];
    
    // Default Engine Scores (0.0 to 1.0, where 0.5 is neutral)
    let scoreSpeed = 0.5;      // Momentum / ROC
    let scorePrecision = 0.5;  // Oscillators (RSI)
    let scorePattern = 0.5;    // SMA Crosses / PA
    let scoreVolatility = 0.5; // Volatility adjusted
    let scoreAI = 0.5;         // ML Historic WinRate Array

    if (historicalPrices && historicalPrices.length >= 50) {
        const currentPrice = historicalPrices[historicalPrices.length - 1];
        
        // 1. Speed Engine (Momentum / Rate of Change)
        const price10PeriodsAgo = historicalPrices[historicalPrices.length - 10];
        const roc = (currentPrice - price10PeriodsAgo) / price10PeriodsAgo;
        scoreSpeed = direction === 'BUY' ? (roc > 0 ? 0.7 : 0.3) : (roc < 0 ? 0.7 : 0.3);

        // 2. Precision Engine (RSI Oscillator)
        const rsiValue = this.calculateRSI(historicalPrices, 14);
        if (direction === 'BUY') {
            if (rsiValue < 30) scorePrecision = 0.9;
            else if (rsiValue > 70) scorePrecision = 0.2;
        } else {
            if (rsiValue > 70) scorePrecision = 0.9;
            else if (rsiValue < 30) scorePrecision = 0.2;
        }

        // 3. Pattern Engine (Moving Average Cross / Mean Reversion)
        const smaFast = this.calculateSMA(historicalPrices, 10);
        const smaSlow = this.calculateSMA(historicalPrices, 50);
        if (direction === 'BUY') scorePattern = (currentPrice > smaFast && smaFast > smaSlow) ? 0.8 : 0.4;
        if (direction === 'SELL') scorePattern = (currentPrice < smaFast && smaFast < smaSlow) ? 0.8 : 0.4;
    }

    // 4. Volatility Engine (Market state alignment)
    const isHighVol = intel.volatility > 0.5;
    scoreVolatility = (intel.trend === (direction === 'BUY' ? 'BULLISH' : 'BEARISH')) ? 0.8 : 0.3;
    if (isHighVol) scoreVolatility -= 0.1; // Penalize directional confidence in extreme chop

    // 5. AI / ML Engine (Historical State Machine Weights)
    if (strat && strat.currentState === 'DEGRADED') {
      scoreAI = 0.1; // Severely penalize degraded strategies
    } else {
      scoreAI = strat ? Math.min(1.0, Math.max(0.0, strat.winRate + 0.1)) : 0.5;
    }

    // --- DECISION ROUTER (Signal Fusion) ---
    // Dynamic Weights based on Market Regime
    const wSpeed = isHighVol ? 0.4 : 0.15;
    const wPrecision = isHighVol ? 0.1 : 0.35;
    const wPattern = 0.2;
    const wVolatility = 0.15;
    const wAI = 0.15;

    let finalConfidence = (scoreSpeed * wSpeed) + 
                          (scorePrecision * wPrecision) + 
                          (scorePattern * wPattern) + 
                          (scoreVolatility * wVolatility) + 
                          (scoreAI * wAI);

    // Bounded safety constraint
    finalConfidence = Math.min(1, Math.max(0, finalConfidence));

    // 6. Behavior Rules & Router Kill Switches
    if (intel.riskLevel === 'EXTREME') {
      this.logDecision(`Rejected ${direction} on ${symbol}: Extreme Risk detected. Conf: ${finalConfidence.toFixed(4)} crossed kill switch.`, finalConfidence);
      return { action: 'HOLD', confidence: finalConfidence, reason: 'High Risk / Volatility', suggestedSize: 0, suggestedLeverage: 1 };
    }
    
    if (strat && strat.currentState === 'DEGRADED') {
      this.logDecision(`Rejected ${direction} on ${symbol}: Strategy ${strategyId} is degraded. Conf: ${finalConfidence.toFixed(4)}`, finalConfidence);
      return { action: 'HOLD', confidence: finalConfidence, reason: 'Strategy Degraded', suggestedSize: 0, suggestedLeverage: 1 };
    }
    
    if (finalConfidence < 0.6) {
      this.logDecision(`Rejected ${direction} on ${symbol}: Low routed confidence score (${finalConfidence.toFixed(2)}). Needs < 0.6`, finalConfidence);
      return { action: 'HOLD', confidence: finalConfidence, reason: 'Low Confidence (Fused Decision)', suggestedSize: 0, suggestedLeverage: 1 };
    }
    
    const baseSize = finalConfidence * 5; // e.g. 5% max base size
    const suggestedSize = parseFloat((baseSize).toFixed(2)); 
    const sl = intel.volatility * 2 + 1; // wider stop loss in high volatility
    const tp = sl * 1.5;
    
    const decision: TradeDecision = {
      action: direction,
      confidence: finalConfidence,
      reason: `Optimal Conditions Routed (Conf: ${(finalConfidence*100).toFixed(1)}%)`,
      suggestedSize,
      suggestedLeverage: intel.riskLevel === 'HIGH' ? 1 : 3,
      stopLossPct: sl,
      takeProfitPct: tp
    };
    
    this.logDecision(`Approved ${direction} on ${symbol}. Confidence: ${finalConfidence.toFixed(2)}. SL: ${sl.toFixed(2)}%, TP: ${tp.toFixed(2)}%`, finalConfidence);
    return decision;
  }

  // --- 5. Self-Optimization Loop ---

  public runOptimizationCycle() {
    this.addMemory('OPTIMIZATION_CYCLE', 'GLOBAL', {
      time: new Date().toISOString(),
      marketState: this.state.marketIntel
    }, ['OPTIMIZATION']);
    
    for (const [id, strat] of Object.entries(this.state.strategyStates)) {
      if (strat.winRate > 0.6) {
        strat.adaptiveWeight = Math.min(2.0, strat.adaptiveWeight + 0.1);
      } else if (strat.winRate < 0.5) {
         strat.adaptiveWeight = Math.max(0.1, strat.adaptiveWeight - 0.1);
      }
    }
    
    this.state.memoryStats.lastOptimizationCycle = new Date().toISOString();
    this.logDecision(`Ran Optimization Cycle. Adjusted adaptive weights.`, 1.0);
  }

  // --- 7. Full Logging & Explainability ---

  private logDecision(message: string, confidence: number) {
    this.state.decisionLogs.unshift({
      time: new Date().toISOString(),
      message,
      confidence,
      marketRisk: this.state.marketIntel.riskLevel
    });
    // Keep max 100 logs
    if (this.state.decisionLogs.length > 100) {
      this.state.decisionLogs.pop();
    }
  }
}

export const iBrain = new IBrainSystem();

(global as any).__iBrainState = iBrain.state;
(global as any).__iBrainRunOptimization = () => iBrain.runOptimizationCycle();

// Run Optimization hourly
setInterval(() => {
  iBrain.runOptimizationCycle();
}, 60 * 60 * 1000);
