export class PortfolioEngine {
  private static instance: PortfolioEngine;
  private totalEquity: number = 0;
  private openExposure: number = 0;
  private assets: Record<string, number> = {};

  private constructor() {}

  public static getInstance(): PortfolioEngine {
    if (!PortfolioEngine.instance) {
      PortfolioEngine.instance = new PortfolioEngine();
    }
    return PortfolioEngine.instance;
  }

  public updateAssetBalance(symbol: string, amount: number) {
    this.assets[symbol] = amount;
    this.calculateAggregates();
  }

  public registerExposure(symbol: string, exposure: number) {
    // Used by RiskEngine to calculate global margins
    this.openExposure += exposure;
  }

  public clearExposure(symbol: string, exposure: number) {
    this.openExposure -= exposure;
    if (this.openExposure < 0) this.openExposure = 0;
  }

  private calculateAggregates() {
     // Mock conversion logic assuming all base stable is USD
     this.totalEquity = Object.values(this.assets).reduce((a, b) => a + b, 0);
  }

  public getGlobalRiskMetrics() {
     return {
         equity: this.totalEquity,
         exposure: this.openExposure,
         marginRatio: this.totalEquity > 0 ? this.openExposure / this.totalEquity : 0
     };
  }
}

export const portfolioEngine = PortfolioEngine.getInstance();
