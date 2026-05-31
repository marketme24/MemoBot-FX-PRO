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

export interface RiskConfigOverride {
    globalOverrideEnabled: boolean;
    maxDailyDrawdown: number;
    hedgingEnabled: boolean;
    rebalanceOnExtremeVol: boolean;
}

export class RiskEngine {
    private maxDrawdownPercent = 0.05;
    private maxLeverage = 10;
    private maxPositionSizePercent = 0.10;
    private maxPortfolioExposurePercent = 0.40;
    private hedgingEnabled = true;
    private globalOverrideEnabled = true;
    private rebalanceOnExtremeVol = true;

    constructor() {}

    public applyConfigOverride(config: RiskConfigOverride) {
        this.maxDrawdownPercent = config.maxDailyDrawdown / 100;
        this.hedgingEnabled = config.hedgingEnabled;
        this.globalOverrideEnabled = config.globalOverrideEnabled;
        this.rebalanceOnExtremeVol = config.rebalanceOnExtremeVol;
    }

    public getActiveConfig(): RiskConfigOverride {
        return {
            globalOverrideEnabled: this.globalOverrideEnabled,
            maxDailyDrawdown: this.maxDrawdownPercent * 100,
            hedgingEnabled: this.hedgingEnabled,
            rebalanceOnExtremeVol: this.rebalanceOnExtremeVol,
        };
    }

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

        // 1b. Global override disabled — pass through everything
        if (!this.globalOverrideEnabled) {
            return {
                approved: true,
                modifiedSize: context.requestedSize,
                modifiedLeverage: Math.min(context.requestedLeverage, this.maxLeverage),
                reason: 'Global risk override disabled — manual mode.'
            };
        }

        // 2. Extreme Market Risk Override (The Kill-Switch)
        const currentIntel = iBrain.state.marketIntel;
        if (currentIntel.riskLevel === 'EXTREME') {
             if (this.rebalanceOnExtremeVol) {
                 return {
                     approved: false,
                     modifiedSize: 0,
                     modifiedLeverage: 1,
                     reason: 'KILL SWITCH: Extreme market volatility detected. Rebalance-on-extreme-vol is active.'
                 };
             }
        }

        // 3. Leverage Safety Check & Volatility Filter
        let finalLeverage = Math.min(context.requestedLeverage, this.maxLeverage);
        if (currentIntel.riskLevel === 'HIGH') {
             finalLeverage = Math.min(finalLeverage, 2);
        }

        // 4. Position & Portfolio Exposure Limits
        const maxDollarRisk = context.accountBalance * this.maxPositionSizePercent;
        let finalSize = Math.min(context.requestedSize, maxDollarRisk);
        
        // Ensure final size is at least $15 for exchange MIN_NOTIONAL limits if balance allows
        if (finalSize < 15) {
             finalSize = Math.min(15, context.accountBalance * 0.95);
        }

        const currentPortfolio = portfolioEngine.getGlobalRiskMetrics();
        const maxAllowedExposure = context.accountBalance * this.maxPortfolioExposurePercent;
        const availableExposure = maxAllowedExposure - currentPortfolio.exposure;

        if (availableExposure <= 0) {
            return {
                 approved: false,
                 modifiedSize: 0,
                 modifiedLeverage: 1,
                 reason: `HARD REJECT: Max portfolio exposure (${this.maxPortfolioExposurePercent * 100}%) reached.`
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
