import { iBrain } from './src/server/ibrain';
import { globalRiskEngine } from './src/server/risk_engine';
import { portfolioEngine } from './src/server/portfolio_engine';

console.log("=== STARTING HOSTILE SCENARIO OVERSIGHT TRACE ===\n");
console.log("1. ENVIRONMENT SETUP");
portfolioEngine.updateAssetBalance('USDT', 100000);
portfolioEngine.registerExposure('BTC/USDT', 35000); // 35% exposure already
const balance = 100000;
console.log(`- Portfolio Balance: ${balance} USDT`);
console.log(`- Current Open Exposure: ${portfolioEngine.getGlobalRiskMetrics().exposure} USDT (${(portfolioEngine.getGlobalRiskMetrics().marginRatio * 100).toFixed(1)}%)`);

// Simulate strategy state before regime flip
if (!iBrain.state.strategyStates['trend_following']) {
    iBrain.state.strategyStates['trend_following'] = {
        strategyId: 'trend_following',
        totalTrades: 100,
        winRate: 0.65, // Originally 0.65
        pnl: 5000,
        currentState: 'ACTIVE'
    };
}

// Tick setup
const prices = Array.from({length: 51}).map((_, i) => 60000 + i * 50); 
for(let i=30; i<45; i++) prices[i] = prices[i] - 100 - (i*10);
prices[48] = 61000;
prices[49] = 61200;
prices[50] = 61800;
const volumes = Array.from({length: 51}).map(() => 10);

console.log("\n2. MARKET DATA INGESTION & MARKET REGIME FLIP");
// We first need to push market to extreme volatility. Let's make the last few ticks crazy
prices[48] = 64000;
prices[49] = 58000;
prices[50] = 65000; // huge volatility mid evaluation

iBrain.updateMarketIntelligence(prices, volumes);
const intel = iBrain.state.marketIntel;
intel.riskLevel = 'EXTREME'; // Ensure kill switch flag triggers due to extreme condition

// Also simulate AI win rate drop
iBrain.state.strategyStates['trend_following'].winRate = 0.40;

const currentPrice = prices[prices.length - 1];
const price10PeriodsAgo = prices[prices.length - 10];
const roc = (currentPrice - price10PeriodsAgo) / price10PeriodsAgo;
const scoreSpeed = roc > 0 ? 0.7 : 0.3;

const gains = [], losses = [];
let gSum = 0, lSum = 0;
for (let i = 1; i <= 14; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change > 0) gSum += change;
    else lSum -= change;
}
const avgGain = gSum / 14, avgLoss = lSum / 14;
const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
const rsiValue = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));

let scorePrecision = 0.5;
if (rsiValue < 30) scorePrecision = 0.9;
else if (rsiValue > 70) scorePrecision = 0.2;

const slice10 = prices.slice(-10);
const smaFast = slice10.reduce((a,b)=>a+b,0)/10;
const slice50 = prices.slice(-50);
const smaSlow = slice50.reduce((a,b)=>a+b,0)/50;
const scorePattern = (currentPrice > smaFast && smaFast > smaSlow) ? 0.8 : 0.4;

const isHighVol = intel.volatility > 0.5;
let scoreVolatility = intel.trend === 'BULLISH' ? 0.8 : 0.3;
if (isHighVol) scoreVolatility -= 0.1;

const strat = (iBrain as any).state.strategyStates['trend_following'];
let scoreAI = strat ? Math.min(1.0, Math.max(0.0, strat.winRate + 0.1)) : 0.5;

console.log(`\n- Regime Flip Detected: Volatility=${intel.volatility.toFixed(4)}, RiskLevel=${intel.riskLevel}`);
console.log(`- Strategy Degradation: AI Engine winRate degraded from 0.65 to ${strat.winRate}`);

console.log(`\n3. STRATEGY CALCULATION (Despite Hostile Conditions)`);
console.log(`- Speed Engine: ${scoreSpeed}`);
console.log(`- Precision Engine: ${scorePrecision}`);
console.log(`- Pattern Engine: ${scorePattern}`);
console.log(`- Volatility Engine: ${scoreVolatility}`);
console.log(`- AI Engine: ${scoreAI}`);

const wSpeed = isHighVol ? 0.4 : 0.15;
const wPrecision = isHighVol ? 0.1 : 0.35;
const wPattern = 0.2;
const wVolatility = 0.15;
const wAI = 0.15;
let finalConfidence = (scoreSpeed * wSpeed) + (scorePrecision * wPrecision) + (scorePattern * wPattern) + (scoreVolatility * wVolatility) + (scoreAI * wAI);
finalConfidence = Math.min(1, Math.max(0, finalConfidence));

console.log(`- Weights in Hostile Volatility: [Speed:${wSpeed}, Precision:${wPrecision}, Pattern:${wPattern}, Volatility:${wVolatility}, AI:${wAI}]`);
console.log(`- Fused Confidence (Router): ${finalConfidence.toFixed(4)}`);

console.log(`\n4. PRE-RISK EVALUATION LOGIC`);
const decision = iBrain.evaluateTradeProposal('trend_following', 'BTC/USDT', 'BUY', prices);
console.log(`Result from evaluateTradeProposal:`);
console.log(JSON.stringify(decision, null, 2));

console.log(`\n5. RISK ENGINE OVERRIDES`);
const riskParams = {
    symbol: 'BTC/USDT',
    action: decision.action,
    requestedSize: decision.suggestedSize || (finalConfidence * 5),
    requestedLeverage: decision.suggestedLeverage || 1,
    confidence: finalConfidence,
    accountBalance: balance,
    openPositionsValue: portfolioEngine.getGlobalRiskMetrics().exposure
};
console.log(`Risk Params sent to engine:`, JSON.stringify(riskParams));
const riskResult = globalRiskEngine.evaluateTrade(riskParams as any);

console.log("\nEXACT FINAL DECISION PASSED TO EXECUTION:");
console.log(JSON.stringify(riskResult, null, 2));
