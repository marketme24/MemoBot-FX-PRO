import { iBrain } from './src/server/ibrain';
import { globalRiskEngine } from './src/server/risk_engine';
import { portfolioEngine } from './src/server/portfolio_engine';

const config = { symbol: 'BTC/USDT', strategyId: 'trend_following', direction: 'BUY' as const };

const prices = Array.from({length: 51}).map((_, i) => 60000 + i * 50); // Linear uptrend
// Add some oscillation for RSI
for(let i=30; i<45; i++) prices[i] = prices[i] - 100 - (i*10);
prices[48] = 61000;
prices[49] = 61200;
prices[50] = 61800; // Final tick jump

const volumes = Array.from({length: 51}).map(() => 10);

console.log("=== STARTING REAL EXECUTION TRACE ===\n");
console.log("1. MARKET DATA LAYER INGESTION");
console.log(`Tick Data Array (last 15 ticks): [${prices.slice(-15).join(', ')}]`);

iBrain.updateMarketIntelligence(prices, volumes);
const intel = iBrain.getDiagnostics();

console.log("\n2. IBRAIN MULTI-TIMEFRAME & INDICATOR EVALUATION");
const currentPrice = prices[prices.length - 1];
const price10PeriodsAgo = prices[prices.length - 10];
const roc = (currentPrice - price10PeriodsAgo) / price10PeriodsAgo;
const scoreSpeed = roc > 0 ? 0.7 : 0.3;

console.log(`- Lookback 10 array: [${prices.slice(-10).join(', ')}]`);
console.log(`- Lookback 50 array: [${prices.slice(-50).join(', ')}]`);
console.log(`- Speed Engine (ROC): Current=${currentPrice}, Prev10=${price10PeriodsAgo}, ROC=${roc.toFixed(4)} => scoreSpeed = ${scoreSpeed}`);

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
console.log(`- Precision Engine (RSI): length=14, rs=${rs.toFixed(4)}, value=${rsiValue.toFixed(2)} => scorePrecision = ${scorePrecision}`);

const slice10 = prices.slice(-10);
const smaFast = slice10.reduce((a,b)=>a+b,0)/10;
const slice50 = prices.slice(-50);
const smaSlow = slice50.reduce((a,b)=>a+b,0)/50;
const scorePattern = (currentPrice > smaFast && smaFast > smaSlow) ? 0.8 : 0.4;
console.log(`- Pattern Engine (SMA Cross): SMA10=${smaFast}, SMA50=${smaSlow}, Price=${currentPrice} => scorePattern = ${scorePattern}`);

const isHighVol = intel.volatility > 0.5;
let scoreVolatility = intel.trend === 'BULLISH' ? 0.8 : 0.3;
if (isHighVol) scoreVolatility -= 0.1;
console.log(`- Volatility Engine: Vol=${intel.volatility.toFixed(4)}, Trend=${intel.trend}, isHighVol=${isHighVol} => scoreVolatility = ${scoreVolatility}`);

const strat = (iBrain as any).state.strategyStates['trend_following'];
let scoreAI = strat ? Math.min(1.0, Math.max(0.0, strat.winRate + 0.1)) : 0.5;
console.log(`- AI Engine: Historic WinRate=${strat ? strat.winRate : 'None'} => scoreAI = ${scoreAI}`);

console.log("\n3. DECISION ROUTER (SIGNAL FUSION)");
const wSpeed = isHighVol ? 0.4 : 0.15;
const wPrecision = isHighVol ? 0.1 : 0.35;
const wPattern = 0.2;
const wVolatility = 0.15;
const wAI = 0.15;
let finalConfidence = (scoreSpeed * wSpeed) + (scorePrecision * wPrecision) + (scorePattern * wPattern) + (scoreVolatility * wVolatility) + (scoreAI * wAI);
finalConfidence = Math.min(1, Math.max(0, finalConfidence));

console.log(`Weights = [Speed:${wSpeed}, Precision:${wPrecision}, Pattern:${wPattern}, Volatility:${wVolatility}, AI:${wAI}]`);
console.log(`finalConfidence = ${finalConfidence.toFixed(4)}`);

const decision = iBrain.evaluateTradeProposal('trend_following', 'BTC/USDT', 'BUY', prices);
console.log("\nPRE-RISK DECISION OBJECT (Output of evaluateTradeProposal):");
console.log(JSON.stringify(decision, null, 2));

console.log("\n4. RISK ENGINE OVERRIDES");
portfolioEngine.updateAssetBalance('USDT', 100000);
const balance = 100000;
console.log(`- Context Balance: ${balance}`);
console.log(`- Kill-Switch Evaluation: marketRisk = ${intel.riskLevel} (EXTREME risk immediately kills trade)`);

const riskParams = {
    symbol: 'BTC/USDT',
    action: decision.action,
    requestedSize: decision.suggestedSize,
    requestedLeverage: decision.suggestedLeverage || 1,
    confidence: decision.confidence,
    accountBalance: balance,
    openPositionsValue: 0
};
console.log(`- Requested Size (from confidence): ${decision.suggestedSize}`);
console.log(`- Sizing Limits: 10% of Balance = ${balance * 0.10}`);
console.log(`- Exposure Calculation: max allowed = ${balance * 0.4} (40%), current open = 0`);

const riskResult = globalRiskEngine.evaluateTrade(riskParams as any);

console.log("\nEXACT FINAL DECISION PASSED TO EXECUTION:");
console.log(JSON.stringify(riskResult, null, 2));
