import { iBrain } from './ibrain';
import { globalRiskEngine } from './risk_engine';

interface BacktestConfig {
    symbol: string;
    historicalData: { price: number, volume: number, timestamp: number }[];
    strategyId: string;
    initialBalance: number;
}

interface BacktestResult {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    finalBalance: number;
    maxDrawdown: number;
    pnl: number;
}

export class BacktestingEngine {
    constructor() {}

    public run(config: BacktestConfig): BacktestResult {
        let balance = config.initialBalance;
        let peakBalance = balance;
        let maxDrawdown = 0;
        let winningTrades = 0;
        let losingTrades = 0;

        const prices = config.historicalData.map(d => d.price);
        const volumes = config.historicalData.map(d => d.volume);

        // Feed data sequentially to simulate time
        for (let i = 50; i < config.historicalData.length; i++) {
            const currentSlice = prices.slice(0, i);
            const volumeSlice = volumes.slice(0, i);
            
            iBrain.updateMarketIntelligence(currentSlice, volumeSlice);
            
            // Evaluate both directions and pick the stronger signal
            const buyDecision = iBrain.evaluateTradeProposal(config.strategyId, config.symbol, 'BUY', currentSlice);
            const sellDecision = iBrain.evaluateTradeProposal(config.strategyId, config.symbol, 'SELL', currentSlice);
            const decision = buyDecision.confidence >= sellDecision.confidence ? buyDecision : sellDecision;

            // Same risk override logic applied to backtesting (Non-negotiable requirement)
            const riskResult = globalRiskEngine.evaluateTrade({
                symbol: config.symbol,
                action: decision.action,
                requestedSize: decision.suggestedSize,
                requestedLeverage: decision.suggestedLeverage || 1,
                confidence: decision.confidence,
                accountBalance: balance,
                openPositionsValue: 0
            });

            if (riskResult.approved && decision.action !== 'HOLD') {
                // Simulate Execution outcome based on 10 ticks ahead
                if (i + 10 < config.historicalData.length) {
                    const entryPrice = prices[i];
                    const exitPrice = prices[i + 10];
                    const pnlFactor = (exitPrice - entryPrice) / entryPrice;
                    
                    const tradePnl = (riskResult.modifiedSize * riskResult.modifiedLeverage) * (decision.action === 'BUY' ? pnlFactor : -pnlFactor);
                    balance += tradePnl;
                    
                    if (tradePnl > 0) winningTrades++;
                    else losingTrades++;

                    iBrain.reportTradeOutcome(config.strategyId, tradePnl, config.symbol);

                    if (balance > peakBalance) peakBalance = balance;
                    const drawdown = (peakBalance - balance) / peakBalance;
                    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
                }
            }
        }

        return {
            totalTrades: winningTrades + losingTrades,
            winningTrades,
            losingTrades,
            finalBalance: balance,
            maxDrawdown,
            pnl: balance - config.initialBalance
        };
    }
}

export const backtestingEngine = new BacktestingEngine();
