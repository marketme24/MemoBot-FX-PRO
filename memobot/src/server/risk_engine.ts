import { iBrain } from './ibrain';
import { portfolioEngine } from './portfolio_engine';

interface RiskContext {
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    requestedSize: number;
    requestedLeverage: number;
    confidence: number;
    accountBalance: number;
    openPositionsValue: number;
}

interface RiskResult {
    approved: boolean;
    modifiedSize: number;
    modifiedLeverage: number;
    reason: string;
}

export class RiskEngine {
    private static MAX_DRAWDOWN_PERCENT = 0.05; // 5% max drawdown limit
    private static MAX_LEVERAGE = 10;
    private static MAX_POSITION_SIZE_PERCENT = 0.10; // Max 10% of balance per trade
    private static MAX_PORTFOLIO_EXPOSURE_PERCENT = 0.40; // Max 40% total exposure

    constructor() {}

    public evaluateTrade(context: RiskContext): RiskResult {
        // 1. Hard Override: Hold logic
        if (context.action === 'HOLD') {
            return {
                approved: true,
                modifiedSize: 0,
                modifiedLeverage: 1,
                reason: 'Pass through HOLD command.'
            };
        }

        // 2. Extreme Market Risk Override (The Kill-Switch)
        const currentIntel = iBrain.state.marketIntel;
        if (currentIntel.riskLevel === 'EXTREME') {
             return {
                 approved: false,
                 modifiedSize: 0,
                 modifiedLeverage: 1,
                 reason: 'KILL SWITCH: Extreme market volatility detected.'
             };
        }

        // 3. Leverage Safety Check & Volatility Filter
        let finalLeverage = Math.min(context.requestedLeverage, RiskEngine.MAX_LEVERAGE);
        if (currentIntel.riskLevel === 'HIGH') {
             finalLeverage = Math.min(finalLeverage, 2); // Cap leverage heavily in high risk
        }

        // 4. Position & Portfolio Exposure Limits
        const maxDollarRisk = context.accountBalance * RiskEngine.MAX_POSITION_SIZE_PERCENT;
        let finalSize = Math.min(context.requestedSize, maxDollarRisk);
        
        // Ensure final size is at least $15 for exchange MIN_NOTIONAL limits if balance allows
        if (finalSize < 15) {
             finalSize = Math.min(15, context.accountBalance * 0.95);
        }

        const currentPortfolio = portfolioEngine.getGlobalRiskMetrics();
        const maxAllowedExposure = context.accountBalance * RiskEngine.MAX_PORTFOLIO_EXPOSURE_PERCENT;
        const availableExposure = maxAllowedExposure - currentPortfolio.exposure;

        if (availableExposure <= 0) {
            return {
                 approved: false,
                 modifiedSize: 0,
                 modifiedLeverage: 1,
                 reason: `HARD REJECT: Max portfolio exposure (${RiskEngine.MAX_PORTFOLIO_EXPOSURE_PERCENT * 100}%) reached.`
            };
        }

        // Reduce position size if it exceeds available exposure
        if (finalSize > availableExposure) {
            finalSize = availableExposure;
        }

        if (finalSize <= 0) {
            return {
                approved: false,
                modifiedSize: 0,
                modifiedLeverage: 1,
                reason: 'HARD REJECT: Requested position size falls to zero after capital allocation limits.'
            };
        }

        // 5. Confidence Thresholds verification (Final safety net)
        if (context.confidence < 0.6) {
             return {
                 approved: false,
                 modifiedSize: 0,
                 modifiedLeverage: 1,
                 reason: `HARD REJECT: Routed Bot confidence (${(context.confidence*100).toFixed(1)}%) below minimum safe threshold (60%).`
             };
        }

        return {
             approved: true,
             modifiedSize: finalSize,
             modifiedLeverage: finalLeverage,
             reason: 'Approved by Risk Engine with adjusted margins and exposure.'
        };
    }
}

export const globalRiskEngine = new RiskEngine();
