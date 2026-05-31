// src/server/engine_manager.ts
import { RealEngine, Order, Position } from './engine_real';
import { PaperEngine, PaperOrder, PaperPosition } from './engine_paper';
import { iBrain } from './ibrain';
import { globalRiskEngine } from './risk_engine';
import { portfolioEngine } from './portfolio_engine';
import { systemScheduler } from './scheduler';
import { circuitBreaker } from './circuit_breaker';
import { evaluationStateMachine } from './state_machine';
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
  priceHistory: number[];
  // SL/TP tracking per open position
  slTpOrders: Map<string, { stopLoss: number; takeProfit: number; entryPrice: number; side: 'LONG' | 'SHORT' }>;
}

class EngineManager {
  public bots: BotInstance[] = [];

  startBot(id: string, name: string, mode: TradingMode, exchange: string, symbol: string, apiKey?: string, secret?: string) {
    // Block live mode without valid API keys
    if (mode === 'real' && (!apiKey || apiKey === 'mock_key' || apiKey.length < 10)) {
      throw new Error('Cannot start live trading bot without valid API keys. Set your Binance API keys in Settings first.');
    }

    let existing = this.bots.find(b => b.id === id);
    
    if (existing && mode === 'real') {
       if (existing.status === 'error' || !existing.realEngine || apiKey) {
          try {
            existing.realEngine = new RealEngine(exchange, apiKey!, secret!);
          } catch(e: any) {
            console.error(`Failed to re-initialize real engine for ${id}:`, e);
          }
       }
    }

    if (!existing) {
       const bot: BotInstance = {
         id, name, mode, exchange, symbol, status: 'running',
         priceHistory: [],
         slTpOrders: new Map(),
       };
       if (mode === 'real') {
         try {
           bot.realEngine = new RealEngine(exchange, apiKey!, secret!);
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
       
       // Fetch current price
       let currentPrice = 0;
       if (existing!.mode === 'real' && existing!.realEngine) {
         try {
           const ticker = await existing!.realEngine['exchange'].fetchTicker(symbol);
           currentPrice = ticker.last;
         } catch(e) { currentPrice = 0; }
       } else if (existing!.mode === 'paper' && existing!.paperEngine) {
         currentPrice = existing!.paperEngine.getCurrentPrice(symbol);
       } else {
         currentPrice = 100 + Math.random() * 10;
       }

       if (currentPrice > 0) {
         existing!.priceHistory.push(currentPrice);
         if (existing!.priceHistory.length > 100) existing!.priceHistory.shift();
       }

       if (existing!.priceHistory.length >= 10) {
         iBrain.updateMarketIntelligence(existing!.priceHistory, []);
       }

       // --- SL/TP Execution Check ---
       if (currentPrice > 0) {
         this.checkStopLossTakeProfit(existing!, currentPrice);
       }

       // --- State Machine: Start Evaluation ---
       const currentRiskLevel = iBrain.state.marketIntel.riskLevel;
       const evalId = evaluationStateMachine.startEvaluation(existing!.symbol, currentRiskLevel);
       
       const strategyId = 'trend_following';

       // Check open positions
       let hasOpenLong = false;
       let hasOpenShort = false;
       if (existing!.mode === 'real' && existing!.realEngine) {
         const positions = existing!.realEngine.positions.filter(p => p.symbol === existing!.symbol && p.size > 0);
         hasOpenLong = positions.some(p => p.side === 'LONG');
         hasOpenShort = positions.some(p => p.side === 'SHORT');
       } else if (existing!.mode === 'paper' && existing!.paperEngine) {
         const positions = existing!.paperEngine.positions.filter(p => p.symbol === existing!.symbol && p.size > 0);
         hasOpenLong = positions.some(p => p.side === 'LONG');
         hasOpenShort = positions.some(p => p.side === 'SHORT');
       }

       const buyDecision = iBrain.evaluateTradeProposal(strategyId, existing!.symbol, 'BUY', existing!.priceHistory);
       const sellDecision = iBrain.evaluateTradeProposal(strategyId, existing!.symbol, 'SELL', existing!.priceHistory);

       let decision: import('./ibrain').TradeDecision;
       if (hasOpenLong && sellDecision.action === 'SELL' && sellDecision.confidence >= 0.55) {
         decision = sellDecision;
       } else if (hasOpenShort && buyDecision.action === 'BUY' && buyDecision.confidence >= 0.55) {
         decision = buyDecision;
       } else if (buyDecision.confidence >= sellDecision.confidence) {
         decision = buyDecision;
       } else {
         decision = sellDecision;
       }
       
       if ((global as any).addBotLog && decision.action !== 'HOLD') {
         const modeTag = existing!.mode === 'real' ? '[LIVE]' : '[PAPER]';
         (global as any).addBotLog(`${modeTag} Market Scan: ${existing!.symbol} @ $${currentPrice.toFixed(2)} [AI: ${decision.action}]`, 'info', existing!.mode);
       }

       // --- State Machine: Acquire Risk Lock ---
       const lockAcquired = await evaluationStateMachine.acquireRiskLock(evalId, currentRiskLevel);
       if (!lockAcquired) {
         const evalCtx = evaluationStateMachine.getContext(evalId);
         if (evalCtx?.state === 'ABORTED_DUE_TO_REGIME_CHANGE') {
           if ((global as any).addBotLog) {
             (global as any).addBotLog(`EVAL ABORTED: Regime changed to EXTREME during evaluation`, 'warning', existing!.mode);
           }
         }
         evaluationStateMachine.releaseRiskLock(evalId, 'REJECTED');
         return;
       }

       let contextBalance = existing!.mode === 'real' 
         ? (existing!.realEngine?.balanceCache || 10000)
         : (existing!.paperEngine?.balance || 100000);
         
       if (existing!.mode === 'real' && contextBalance <= 0) {
           contextBalance = 10000;
       }

       let requestedUsdSize = (decision.suggestedSize / 100) * contextBalance;
       
       if (decision.action !== 'HOLD' && requestedUsdSize < 12) {
           requestedUsdSize = Math.min(contextBalance * 0.95, 12);
       }

       // Risk Override
       const riskResult = globalRiskEngine.evaluateTrade({
           symbol: existing!.symbol,
           action: decision.action,
           requestedSize: requestedUsdSize,
           requestedLeverage: decision.suggestedLeverage || 1,
           confidence: decision.confidence,
           accountBalance: contextBalance,
           openPositionsValue: portfolioEngine.getGlobalRiskMetrics().exposure
       });

       if (!riskResult.approved && decision.action !== 'HOLD') {
           if ((global as any).addBotLog) {
               (global as any).addBotLog(`RISK REJECT: ${riskResult.reason}`, 'warning', existing!.mode);
           }
           evaluationStateMachine.releaseRiskLock(evalId, 'REJECTED');
           return;
       }

       if (decision.action !== 'HOLD') {
           const priceToUse = currentPrice > 0 ? currentPrice : 100;
           const finalSize = riskResult.modifiedSize / priceToUse;
           const side = decision.action.toLowerCase() as 'buy' | 'sell';
           
           try {
             if (existing!.mode === 'real' && existing!.realEngine) {
                 const orderResult = await existing!.realEngine.placeOrder(existing!.symbol, side, 'market', finalSize);
                 if ((global as any).addBotLog) {
                    (global as any).addBotLog(`[LIVE TRADE EXECUTED] ${side.toUpperCase()} ${existing!.symbol} (Size: ${finalSize.toFixed(4)})`, 'success', 'real');
                 }
                 let tradePnl = 0;
                 if (orderResult.fills && orderResult.fills.length > 0) {
                    const totalFees = orderResult.fills.reduce((s, f) => s + f.commission, 0);
                    const pos = existing!.realEngine!.positions.find(p => p.symbol === existing!.symbol);
                    tradePnl = pos ? pos.realizedPnl : -totalFees;
                 }
                 iBrain.reportTradeOutcome(strategyId, tradePnl, existing!.symbol);
                 logger.execution('info', `Trade outcome recorded: ${existing!.symbol} PnL=${tradePnl.toFixed(4)}`);

                 // Register SL/TP for new positions
                 this.registerSlTp(existing!, decision, currentPrice);
                 // Update portfolio exposure
                 portfolioEngine.registerExposure(existing!.symbol, riskResult.modifiedSize);
                 
             } else if (existing!.mode === 'paper' && existing!.paperEngine) {
                 const prevBalance = existing!.paperEngine.balance;
                 existing!.paperEngine.placeOrder(existing!.symbol, side, 'market', finalSize, currentPrice);
                 if ((global as any).addBotLog) {
                    (global as any).addBotLog(`PAPER EXEC: ${side.toUpperCase()} ${existing!.symbol} (Size: ${finalSize.toFixed(4)})`, 'info', 'paper');
                 }
                 const paperBalanceDelta = existing!.paperEngine.balance - prevBalance;
                 iBrain.reportTradeOutcome(strategyId, paperBalanceDelta, existing!.symbol);

                 // Register SL/TP for paper positions
                 this.registerSlTp(existing!, decision, currentPrice);
                 portfolioEngine.registerExposure(existing!.symbol, riskResult.modifiedSize);
             }
             evaluationStateMachine.releaseRiskLock(evalId, 'COMPLETED');
           } catch(e: any) {
               console.error(`Bot ${existing!.id} trade failed: ${e.message}`);
               if ((global as any).addBotLog) (global as any).addBotLog(`EXEC FAIL: ${e.message}`, 'error', existing!.mode);
               evaluationStateMachine.releaseRiskLock(evalId, 'REJECTED');
           }
       } else {
           evaluationStateMachine.releaseRiskLock(evalId, 'COMPLETED');
       }
    }, 5000);

    return existing;
  }

  private registerSlTp(bot: BotInstance, decision: import('./ibrain').TradeDecision, entryPrice: number) {
    if (!decision.stopLossPct || !decision.takeProfitPct) return;
    const side: 'LONG' | 'SHORT' = decision.action === 'BUY' ? 'LONG' : 'SHORT';
    const slPrice = side === 'LONG'
      ? entryPrice * (1 - decision.stopLossPct / 100)
      : entryPrice * (1 + decision.stopLossPct / 100);
    const tpPrice = side === 'LONG'
      ? entryPrice * (1 + decision.takeProfitPct / 100)
      : entryPrice * (1 - decision.takeProfitPct / 100);
    
    const key = `${bot.symbol}_${side}`;
    bot.slTpOrders.set(key, { stopLoss: slPrice, takeProfit: tpPrice, entryPrice, side });
    logger.execution('info', `SL/TP registered for ${bot.symbol} ${side}: SL=${slPrice.toFixed(2)}, TP=${tpPrice.toFixed(2)}`);
  }

  private checkStopLossTakeProfit(bot: BotInstance, currentPrice: number) {
    for (const [key, sltp] of bot.slTpOrders.entries()) {
      let triggered: 'SL' | 'TP' | null = null;

      if (sltp.side === 'LONG') {
        if (currentPrice <= sltp.stopLoss) triggered = 'SL';
        else if (currentPrice >= sltp.takeProfit) triggered = 'TP';
      } else {
        if (currentPrice >= sltp.stopLoss) triggered = 'SL';
        else if (currentPrice <= sltp.takeProfit) triggered = 'TP';
      }

      if (triggered) {
        const closeSide = sltp.side === 'LONG' ? 'sell' : 'buy';
        const reason = triggered === 'SL' ? 'STOP-LOSS' : 'TAKE-PROFIT';

        try {
          if (bot.mode === 'paper' && bot.paperEngine) {
            const pos = bot.paperEngine.positions.find(p => p.symbol === bot.symbol && p.side === sltp.side);
            if (pos && pos.size > 0) {
              bot.paperEngine.placeOrder(bot.symbol, closeSide as 'buy' | 'sell', 'market', pos.size, currentPrice);
              if ((global as any).addBotLog) {
                (global as any).addBotLog(`[${reason}] Closed ${sltp.side} ${bot.symbol} @ ${currentPrice.toFixed(2)}`, 'warning', 'paper');
              }
              portfolioEngine.clearExposure(bot.symbol, pos.size * currentPrice);
            }
          } else if (bot.mode === 'real' && bot.realEngine) {
            const pos = bot.realEngine.positions.find(p => p.symbol === bot.symbol && p.side === sltp.side);
            if (pos && pos.size > 0) {
              bot.realEngine.placeOrder(bot.symbol, closeSide, 'market', pos.size).then(() => {
                if ((global as any).addBotLog) {
                  (global as any).addBotLog(`[${reason}] Closed ${sltp.side} ${bot.symbol} @ ${currentPrice.toFixed(2)}`, 'warning', 'real');
                }
                portfolioEngine.clearExposure(bot.symbol, pos.size * currentPrice);
              }).catch((e: any) => {
                logger.execution('error', `${reason} execution failed: ${e.message}`);
              });
            }
          }
        } catch (e: any) {
          logger.execution('error', `${reason} execution failed: ${e.message}`);
        }
        bot.slTpOrders.delete(key);
      }
    }
  }

  stopBot(id: string) {
    const bot = this.bots.find(b => b.id === id);
    if (bot) {
      bot.status = 'stopped';
      if (bot.realEngine) bot.realEngine.isStarted = false;
      if (bot.loopInterval) clearInterval(bot.loopInterval);
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

  // Initialize portfolio exposure from any existing positions on startup
  initPortfolioFromPositions() {
    for (const bot of this.bots) {
      if (bot.realEngine) {
        for (const pos of bot.realEngine.positions) {
          if (pos.size > 0) {
            const estValue = pos.size * pos.entryPrice;
            portfolioEngine.registerExposure(pos.symbol, estValue);
          }
        }
      }
      if (bot.paperEngine) {
        for (const pos of bot.paperEngine.positions) {
          if (pos.size > 0) {
            const estValue = pos.size * pos.entryPrice;
            portfolioEngine.registerExposure(pos.symbol, estValue);
          }
        }
      }
    }
  }

  shutdown() {
    for (const bot of this.bots) {
      if (bot.loopInterval) clearInterval(bot.loopInterval);
      if (bot.realEngine) bot.realEngine.cleanup();
      bot.status = 'stopped';
    }
  }
}

export const engineManager = new EngineManager();
