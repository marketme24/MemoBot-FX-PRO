// src/server/engine_manager.ts
import { RealEngine, Order, Position } from './engine_real';
import { PaperEngine, PaperOrder, PaperPosition } from './engine_paper';
import { iBrain } from './ibrain';
import { globalRiskEngine } from './risk_engine';
import { portfolioEngine } from './portfolio_engine';
import { systemScheduler } from './scheduler';
import { circuitBreaker } from './circuit_breaker';
import { logger } from './logger';

// Start global schedulers
systemScheduler.startGlobalTick();

export type TradingMode = 'real' | 'paper';

export interface BotInstance {
  id: string;
  name: string;
  mode: TradingMode;
  exchange: string;
  symbol: string;
  status: 'running' | 'stopped' | 'error' | 'paused';
  realEngine?: RealEngine;
  paperEngine?: PaperEngine;
  loopInterval?: any;
  priceHistory: number[];  // store historical prices for the symbol
}

class EngineManager {
  public bots: BotInstance[] = [];

  startBot(id: string, name: string, mode: TradingMode, exchange: string, symbol: string, apiKey?: string, secret?: string) {
    let existing = this.bots.find(b => b.id === id);
    
    // If it exists but is in 'error' state, or we just want to ensure fresh keys on start, re-init the engine
    if (existing && mode === 'real') {
       if (existing.status === 'error' || !existing.realEngine || apiKey) {
          try {
            if (existing.realEngine) {
              try { existing.realEngine.cleanup(); } catch(_e) { /* ignore */ }
            }
            existing.realEngine = new RealEngine(exchange, apiKey || "mock_key", secret || "mock_secret");
          } catch(e: any) {
            console.error(`Failed to re-initialize real engine for ${id}:`, e);
          }
       }
    }

    if (!existing) {
       const bot: BotInstance = {
         id, name, mode, exchange, symbol, status: 'running',
         priceHistory: Array.from({length: 60}, () => 60000 + Math.random() * 5000)
       };
       if (mode === 'real') {
         try {
           bot.realEngine = new RealEngine(exchange, apiKey || "mock_key", secret || "mock_secret");
         } catch(e: any) {
           console.error(`Failed to initialize real engine for ${id}:`, e);
         }
       } else {
         bot.paperEngine = new PaperEngine();
       }
       this.bots.push(bot);
       existing = bot;
    }
    
    existing.status = 'running';
    if (existing.realEngine) existing.realEngine.isStarted = true;
    if (existing.paperEngine) existing.paperEngine.isStarted = true;

    // Start Strategy Intelligence Loop
    if (existing.loopInterval) clearInterval(existing.loopInterval);
    existing.loopInterval = setInterval(async () => {
       if (existing!.status !== 'running') return;
       
       // Fetch current price (simulate from tickers or exchange)
       let currentPrice = 0;
       if (existing!.mode === 'real' && existing!.realEngine) {
         try {
           const ticker = await existing!.realEngine['exchange'].fetchTicker(symbol);
           currentPrice = ticker.last;
         } catch(e) { currentPrice = 0; }
       } else if (existing!.mode === 'paper' && existing!.paperEngine) {
         // For paper, price is updated via updatePrices
         currentPrice = existing!.paperEngine.getCurrentPrice(symbol);
       } else {
         currentPrice = 100 + Math.random() * 10;
       }

       if (currentPrice > 0) {
         existing!.priceHistory.push(currentPrice);
         if (existing!.priceHistory.length > 100) existing!.priceHistory.shift();
       }

       // Update market intelligence for iBrain with dummy volume
       if (existing!.priceHistory.length >= 2) {
         iBrain.updateMarketIntelligence(existing!.priceHistory, []);
       }

       // Evaluate both BUY and SELL directions, pick the stronger signal
       const strategyId = 'trend_following';

       // Check if there's an open position that might need closing
       let hasOpenLong = false;
       if (existing!.mode === 'real' && existing!.realEngine) {
         hasOpenLong = existing!.realEngine.positions.some(p => p.symbol === existing!.symbol && p.size > 0 && p.side === 'LONG');
       } else if (existing!.mode === 'paper' && existing!.paperEngine) {
         hasOpenLong = existing!.paperEngine.positions.some(p => p.symbol === existing!.symbol && p.size > 0 && p.side === 'LONG');
       }

       const buyDecision = iBrain.evaluateTradeProposal(strategyId, existing!.symbol, 'BUY', existing!.priceHistory);
       const sellDecision = iBrain.evaluateTradeProposal(strategyId, existing!.symbol, 'SELL', existing!.priceHistory);

       // If we have an open long position, prioritize SELL signals for exit
       // Otherwise, pick the direction with highest confidence
       let decision: import('./ibrain').TradeDecision;
       if (hasOpenLong && sellDecision.action === 'SELL' && sellDecision.confidence >= 0.55) {
         decision = sellDecision;
       } else if (buyDecision.confidence >= sellDecision.confidence) {
         decision = buyDecision;
       } else {
         decision = sellDecision;
       }
       
       // Heartbeat log
       if ((global as any).addBotLog && decision.action !== 'HOLD') {
         const modeTag = existing!.mode === 'real' ? '[LIVE]' : '[PAPER]';
         (global as any).addBotLog(`${modeTag} Market Scan: ${existing!.symbol} @ $${currentPrice.toFixed(2)} [AI: ${decision.action}]`, 'info', existing!.mode);
       }

       let contextBalance = existing!.mode === 'real' 
         ? (existing!.realEngine?.balanceCache || 10000)
         : (existing!.paperEngine?.balance || 100000);
         
       if (existing!.mode === 'real' && contextBalance <= 0) {
           contextBalance = 10000; // Mock balance so demo real mode can trade
       }

       // Calculate requested size in USD based on suggested percentage
       let requestedUsdSize = (decision.suggestedSize / 100) * contextBalance;
       
       // Force a minimum size so trades don't fail Binance MIN_NOTIONAL (which is usually around 5-10 USD)
       if (decision.action !== 'HOLD' && requestedUsdSize < 12) {
           requestedUsdSize = Math.min(contextBalance * 0.95, 12); // Use at most 95% of balance, or 12 bucks
       }

       // 🔥 RISK OVERRIDE
       const riskResult = globalRiskEngine.evaluateTrade({
           symbol: existing!.symbol,
           action: decision.action,
           requestedSize: requestedUsdSize,
           requestedLeverage: decision.suggestedLeverage || 1,
           confidence: decision.confidence,
           accountBalance: contextBalance,
           openPositionsValue: 0
       });

       if (!riskResult.approved && decision.action !== 'HOLD') {
           if ((global as any).addBotLog) {
               (global as any).addBotLog(`RISK REJECT: ${riskResult.reason}`, 'warning', existing!.mode);
           }
           return;
       }

       if (decision.action !== 'HOLD') {
           // Determine final size in base currency (e.g. BTC)
           const priceToUse = currentPrice > 0 ? currentPrice : 100;
           const finalSize = riskResult.modifiedSize / priceToUse;
           const side = decision.action.toLowerCase() as 'buy' | 'sell';
           try {
             if (existing!.mode === 'real' && existing!.realEngine) {
                 const orderResult = await existing!.realEngine.placeOrder(existing!.symbol, side, 'market', finalSize);
                 if ((global as any).addBotLog) {
                    (global as any).addBotLog(`[LIVE TRADE EXECUTED] ${side.toUpperCase()} ${existing!.symbol} (Size: ${finalSize.toFixed(4)})`, 'success', 'real');
                 }
                 // Compute actual PnL from order fills
                 let tradePnl = 0;
                 if (orderResult.fills && orderResult.fills.length > 0) {
                    const totalFees = orderResult.fills.reduce((s, f) => s + f.commission, 0);
                    const pos = existing!.realEngine!.positions.find(p => p.symbol === existing!.symbol);
                    tradePnl = pos ? pos.realizedPnl : -totalFees;
                 }
                 iBrain.reportTradeOutcome(strategyId, tradePnl, existing!.symbol);
                 logger.execution('info', `Trade outcome recorded: ${existing!.symbol} PnL=${tradePnl.toFixed(4)}`);
             } else if (existing!.mode === 'paper' && existing!.paperEngine) {
                 existing!.paperEngine.placeOrder(existing!.symbol, side, 'market', finalSize, currentPrice);
                 if ((global as any).addBotLog) {
                    (global as any).addBotLog(`PAPER EXEC: ${side.toUpperCase()} ${existing!.symbol} (Size: ${finalSize.toFixed(4)})`, 'info', 'paper');
                 }
                 const paperBalanceDelta = existing!.paperEngine.balance - 100000;
                 iBrain.reportTradeOutcome(strategyId, paperBalanceDelta, existing!.symbol);
             }
           } catch(e: any) {
               console.error(`Bot ${existing!.id} trade failed: ${e.message}`);
               if ((global as any).addBotLog) (global as any).addBotLog(`EXEC FAIL: ${e.message}`, 'error', existing!.mode);
           }
       }
    }, 5000); // Changed to 5 seconds for visual feedback in UI


    return existing;
  }

  stopBot(id: string) {
    const bot = this.bots.find(b => b.id === id);
    if (bot) {
      bot.status = 'stopped';
      if (bot.realEngine) {
        bot.realEngine.isStarted = false;
        try { bot.realEngine.cleanup(); } catch(_e) { /* ignore */ }
      }
      if (bot.loopInterval) {
        clearInterval(bot.loopInterval);
        bot.loopInterval = undefined;
      }
    }
  }

  pauseBot(id: string) {
    const bot = this.bots.find(b => b.id === id);
    if (bot) {
      bot.status = 'paused';
      if (bot.realEngine) bot.realEngine.isStarted = false;
    }
  }

  restartBot(id: string, apiKey?: string, secret?: string) {
    const bot = this.bots.find(b => b.id === id);
    if (bot) {
      this.stopBot(id);
      // Re-initialize engine (stopBot already cleaned up the previous realEngine)
      if (bot.mode === 'real') {
        try {
          bot.realEngine = new RealEngine(bot.exchange, apiKey || "mock_key", secret || "mock_secret");
        } catch(e) {
          bot.status = 'error';
          return;
        }
      } else {
        bot.paperEngine = new PaperEngine();
      }
      bot.status = 'running';
      this.startBot(bot.id, bot.name, bot.mode, bot.exchange, bot.symbol, apiKey, secret);
    }
  }

  getBot(id: string) {
    return this.bots.find(b => b.id === id);
  }

  getBotsByMode(mode: TradingMode) {
    return this.bots.filter(b => b.mode === mode);
  }
}

export const engineManager = new EngineManager();