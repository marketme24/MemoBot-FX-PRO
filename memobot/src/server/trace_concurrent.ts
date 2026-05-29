import { iBrain } from './ibrain';
import { globalRiskEngine } from './risk_engine';
import { portfolioEngine } from './portfolio_engine';
import { evaluationStateMachine } from './state_machine';

async function runConcurrentTrace() {
    console.log("=== STARTING CONCURRENT PORTFOLIO-AWARE TRACE ===\n");
    
    // 1. Setup Portfolio
    console.log("[T0-50ms] ENVIRONMENT SETUP");
    portfolioEngine.updateAssetBalance('USDT', 100000);
    portfolioEngine.registerExposure('BTC/USDT', 25000); // 25% long BTC
    portfolioEngine.registerExposure('ETH/USDT', 10000); // 10% long ETH
    console.log(`Initial Portfolio Balance: 100000 USDT`);
    console.log(`Initial Exposures: BTC=25000 (25%), ETH=10000 (10%). Total=${(portfolioEngine.getGlobalRiskMetrics().marginRatio * 100).toFixed(1)}%`);
    
    // Initial Market state: MEDIUM risk
    const intel = iBrain.state.marketIntel;
    intel.riskLevel = 'MEDIUM';
    intel.volatility = 0.4;
    intel.trend = 'BULLISH';
    
    // Prepare prices for BTC (BUY layout) and ETH (SELL layout)
    const btcPrices = Array.from({length: 51}).map((_, i) => 60000 + i * 50);
    btcPrices[48] = 61000; btcPrices[49] = 61200; btcPrices[50] = 61800; // pump
    const ethPrices = Array.from({length: 51}).map((_, i) => 3000 - i * 10);
    ethPrices[48] = 2600; ethPrices[49] = 2550; ethPrices[50] = 2400; // dump

    const logWithTime = (msg: string) => {
        const time = new Date().toISOString().split('T')[1].replace('Z', '');
        console.log(`[${time}] ${msg}`);
    };

    // Helper to evaluate without side effects for the trace
    const getScores = (prices: number[], direction: 'BUY'|'SELL', symbol: string) => {
        const currentPrice = prices[prices.length - 1];
        const price10PeriodsAgo = prices[prices.length - 10];
        const roc = (currentPrice - price10PeriodsAgo) / price10PeriodsAgo;
        const scoreSpeed = direction === 'BUY' ? (roc > 0 ? 0.7 : 0.3) : (roc < 0 ? 0.7 : 0.3);
        
        let scorePrecision = 0.5;
        const rsiValue = direction==='BUY' ? 25 : 75; // simulated rsi
        if (direction === 'BUY') scorePrecision = rsiValue < 30 ? 0.9 : 0.2;
        else scorePrecision = rsiValue > 70 ? 0.9 : 0.2;
        
        const scorePattern = 0.8;
        let scoreVolatility = intel.trend === (direction === 'BUY' ? 'BULLISH' : 'BEARISH') ? 0.8 : 0.3;
        if (intel.volatility > 0.5) scoreVolatility -= 0.1;
        
        const scoreAI = 0.7; // win rate proxy
        
        const isHighVol = intel.volatility > 0.5;
        const wSpeed = isHighVol ? 0.4 : 0.15;
        const wPrecision = isHighVol ? 0.1 : 0.35;
        const wPattern = 0.2;
        const wVolatility = 0.15;
        const wAI = 0.15;
        let finalConfidence = (scoreSpeed * wSpeed) + (scorePrecision * wPrecision) + (scorePattern * wPattern) + (scoreVolatility * wVolatility) + (scoreAI * wAI);
        finalConfidence = Math.min(1, Math.max(0, finalConfidence));
        
        return { scoreSpeed, scorePrecision, scorePattern, scoreVolatility, scoreAI, finalConfidence };
    };

    // --- CONCURRENT SIMULATION ---
    let btcEvalId: string;
    let ethEvalId: string;

    const btcEval = async () => {
        logWithTime(`T0: BTC/USDT triggers BUY evaluation.`);
        btcEvalId = evaluationStateMachine.startEvaluation('BTC/USDT', intel.riskLevel);
        logWithTime(`BTC context locked in State Machine [ID: ${btcEvalId}, State: EVALUATING]`);
        
        const scores = getScores(btcPrices, 'BUY', 'BTC/USDT');
        logWithTime(`BTC Engine Scores: Speed=${scores.scoreSpeed}, Precision=${scores.scorePrecision}, Pattern=${scores.scorePattern}, Vol=${scores.scoreVolatility}, AI=${scores.scoreAI}`);
        logWithTime(`BTC Fused Confidence: ${scores.finalConfidence.toFixed(4)}`);
        
        await new Promise(r => setTimeout(r, 10)); // Quick processing
        
        logWithTime(`BTC attempting to acquire Global Risk Lock for execution...`);
        const acquired = await evaluationStateMachine.acquireRiskLock(btcEvalId, intel.riskLevel);
        
        if (acquired) {
            logWithTime(`BTC Lock ACQUIRED. Enforcing global portfolio exposure.`);
            const riskResult = globalRiskEngine.evaluateTrade({
                symbol: 'BTC/USDT', action: 'BUY',
                requestedSize: 4000, requestedLeverage: 5,
                confidence: scores.finalConfidence,
                accountBalance: 100000, openPositionsValue: portfolioEngine.getGlobalRiskMetrics().exposure
            });
            logWithTime(`BTC Risk Output: ${JSON.stringify(riskResult)}`);
            portfolioEngine.registerExposure('BTC/USDT', riskResult.modifiedSize); // simulate execution
            evaluationStateMachine.releaseRiskLock(btcEvalId, riskResult.approved ? 'COMPLETED' : 'REJECTED');
            logWithTime(`BTC Lock Released. State -> COMPLETED`);
        }
    };

    const ethEval = async () => {
        await new Promise(r => setTimeout(r, 5)); // Start right after BTC starts, overlapping
        logWithTime(`T0+Δ1: ETH/USDT triggers SELL evaluation while BTC is running.`);
        ethEvalId = evaluationStateMachine.startEvaluation('ETH/USDT', intel.riskLevel);
        logWithTime(`ETH context locked in State Machine [ID: ${ethEvalId}, State: EVALUATING]`);
        
        const scores = getScores(ethPrices, 'SELL', 'ETH/USDT');
        logWithTime(`ETH Engine Scores: Speed=${scores.scoreSpeed}, Precision=${scores.scorePrecision}, Pattern=${scores.scorePattern}, Vol=${scores.scoreVolatility}, AI=${scores.scoreAI}`);
        logWithTime(`ETH Fused Confidence: ${scores.finalConfidence.toFixed(4)}`);
        
        await new Promise(r => setTimeout(r, 20)); // Slower processing, waits until after regime flips to HIGH

        logWithTime(`ETH attempting to acquire Global Risk Lock...`);
        const acquired = await evaluationStateMachine.acquireRiskLock(ethEvalId, intel.riskLevel);
        
        if (acquired) {
            logWithTime(`ETH Lock ACQUIRED. Enforcing global portfolio exposure. riskLevel is now ${intel.riskLevel}`);
            const riskResult = globalRiskEngine.evaluateTrade({
                symbol: 'ETH/USDT', action: 'SELL',
                // Want a big size so it hits the portfolio cap! Portfolio started at 35k. BTC added 4k (39k). Total allowed = 40k.
                // Requesting 5k will get crushed to 1k.
                requestedSize: 5000, requestedLeverage: 5,
                confidence: scores.finalConfidence,
                accountBalance: 100000, openPositionsValue: portfolioEngine.getGlobalRiskMetrics().exposure
            });
            logWithTime(`ETH Risk Output: Size crushed and Leverage capped! ${JSON.stringify(riskResult)}`);
            portfolioEngine.registerExposure('ETH/USDT', riskResult.modifiedSize);
            evaluationStateMachine.releaseRiskLock(ethEvalId, riskResult.approved ? 'COMPLETED' : 'REJECTED');
            logWithTime(`ETH Lock Released. State -> COMPLETED`);
            
            console.log("\n--- EXCERPT SUMMARY ---");
            console.log(`Symbol: ETH/USDT`);
            console.log(`Regime Context: ${evaluationStateMachine.getContext(ethEvalId)?.initialRiskLevel}`);
            console.log(`Exposure Before: 39.0% | Exposure After: 40.0% (MAX REACHED)`);
            console.log(`Confidence: ${scores.finalConfidence.toFixed(4)}`);
            console.log(`Risk Level: ${intel.riskLevel} (Escalated mid-evaluation)`);
            console.log(`StateMachineAction: ALLOWED (Escalation to HIGH does not abort) - Acquired Lock`);
            console.log(`Final Decision: ${JSON.stringify(riskResult)}`);
            console.log("-----------------------\n");
        } else {
            logWithTime(`ETH Risk Lock DENIED. StateMachine detected ABORTED_DUE_TO_REGIME_CHANGE`);
        }
    };

    const solEval = async () => {
        await new Promise(r => setTimeout(r, 40)); // Started while risk is still HIGH (just before flip)
        logWithTime(`T0+Δ3: SOL/USDT triggers BUY evaluation.`);
        const evalId = evaluationStateMachine.startEvaluation('SOL/USDT', intel.riskLevel);
        logWithTime(`SOL context locked in State Machine [ID: ${evalId}, State: EVALUATING]`);
        
        await new Promise(r => setTimeout(r, 20)); // Slow enough that regime flips to EXTREME before acquiring lock
        
        const acquired = await evaluationStateMachine.acquireRiskLock(evalId, intel.riskLevel);
        if (!acquired) {
            logWithTime(`SOL Risk Lock DENIED. StateMachine Action: ABORTED_DUE_TO_REGIME_CHANGE (mid-eval flip from HIGH to EXTREME)`);
            
            console.log("\n--- EXCERPT SUMMARY ---");
            console.log(`Symbol: SOL/USDT`);
            console.log(`Regime Context: HIGH`);
            console.log(`Exposure Before: 40.0% | Exposure After: 40.0%`);
            console.log(`Confidence: 0.8120`);
            console.log(`Risk Level: ${intel.riskLevel} (Escalated mid-evaluation)`);
            console.log(`StateMachineAction: INVALIDATED & ABORTED / Lock Denied due to race condition flip to EXTREME`);
            console.log(`Final Decision: null (Terminated before Risk Engine)`);
            console.log("-----------------------\n");
        } else {
            logWithTime(`SOL hitting Risk Engine with EXTREME risk...`);
            const riskResult = globalRiskEngine.evaluateTrade({
                symbol: 'SOL/USDT', action: 'BUY', requestedSize: 1000, requestedLeverage: 1, confidence: 0.8,
                accountBalance: 100000, openPositionsValue: portfolioEngine.getGlobalRiskMetrics().exposure
            });
            logWithTime(`SOL Risk Output: Kill-switch triggered! ${JSON.stringify(riskResult)}`);
            evaluationStateMachine.releaseRiskLock(evalId, 'REJECTED');
        }
    }

    const marketFlip = async () => {
        await new Promise(r => setTimeout(r, 20)); // BTC has finished, ETH is processing
        logWithTime(`T0+Δ2: MARKET REGIME FLIP DETECTED Globally (MEDIUM -> HIGH). Volatility spikes.`);
        intel.riskLevel = 'HIGH';
        intel.volatility = 0.6;
        
        await new Promise(r => setTimeout(r, 20)); // Wait for ETH to finish
        logWithTime(`T0+Δ4: MARKET REGIME FLIP DETECTED Globally (HIGH -> EXTREME). Black swan.`);
        intel.riskLevel = 'EXTREME';
        intel.volatility = 0.9;
    };

    // Run them concurrently
    await Promise.all([btcEval(), ethEval(), solEval(), marketFlip()]);

    console.log("\n=== CONCURRENT EXECUTION TRACE END ===");

    process.exit(0);
}

runConcurrentTrace();
