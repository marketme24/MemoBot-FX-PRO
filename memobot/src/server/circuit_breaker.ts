// src/server/circuit_breaker.ts
import { iBrain } from './ibrain';

export type CircuitState = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'PAUSED';

interface CircuitEvent {
  timestamp: string;
  fromState: CircuitState;
  toState: CircuitState;
  reason: string;
}

interface CircuitBreakerConfig {
  warningDrawdownPct: number;
  criticalDrawdownPct: number;
  maxConsecutiveLosses: number;
  cooldownMs: number;
  volatilityThreshold: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  warningDrawdownPct: 3.0,
  criticalDrawdownPct: 5.0,
  maxConsecutiveLosses: 5,
  cooldownMs: 300_000, // 5 minutes
  volatilityThreshold: 0.8,
};

export class CircuitBreaker {
  private state: CircuitState = 'HEALTHY';
  private config: CircuitBreakerConfig;
  private eventLog: CircuitEvent[] = [];
  private consecutiveLosses: number = 0;
  private dailyDrawdownPct: number = 0;
  private peakEquity: number = 0;
  private pausedUntil: number = 0;
  private manualOverride: boolean = false;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public getState(): CircuitState {
    if (this.manualOverride) return 'PAUSED';
    if (this.state === 'PAUSED' && Date.now() > this.pausedUntil) {
      this.transition('HEALTHY', 'Cooldown period expired');
    }
    return this.state;
  }

  public canTrade(): boolean {
    const currentState = this.getState();
    if (currentState === 'PAUSED' || currentState === 'CRITICAL') return false;
    if (this.manualOverride) return false;

    const intel = iBrain.state.marketIntel;
    if (intel.riskLevel === 'EXTREME') {
      this.transition('CRITICAL', 'Extreme market volatility detected by iBrain');
      return false;
    }

    return true;
  }

  public reportTrade(pnl: number) {
    if (pnl < 0) {
      this.consecutiveLosses++;
    } else {
      this.consecutiveLosses = 0;
    }

    if (this.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      this.transition('CRITICAL', `${this.consecutiveLosses} consecutive losses reached`);
    }
  }

  public updateEquity(currentEquity: number) {
    if (currentEquity > this.peakEquity) {
      this.peakEquity = currentEquity;
    }

    if (this.peakEquity > 0) {
      this.dailyDrawdownPct = ((this.peakEquity - currentEquity) / this.peakEquity) * 100;
    }

    if (this.dailyDrawdownPct >= this.config.criticalDrawdownPct) {
      this.transition('CRITICAL', `Daily drawdown ${this.dailyDrawdownPct.toFixed(2)}% exceeds critical threshold ${this.config.criticalDrawdownPct}%`);
    } else if (this.dailyDrawdownPct >= this.config.warningDrawdownPct) {
      if (this.state === 'HEALTHY') {
        this.transition('WARNING', `Daily drawdown ${this.dailyDrawdownPct.toFixed(2)}% exceeds warning threshold ${this.config.warningDrawdownPct}%`);
      }
    } else if (this.state === 'WARNING') {
      this.transition('HEALTHY', 'Drawdown recovered below warning threshold');
    }
  }

  public emergencyStop(reason: string) {
    this.manualOverride = true;
    this.transition('PAUSED', `EMERGENCY STOP: ${reason}`);
  }

  public resume() {
    this.manualOverride = false;
    this.consecutiveLosses = 0;
    this.transition('HEALTHY', 'Manual resume by operator');
  }

  public resetDaily() {
    this.dailyDrawdownPct = 0;
    this.peakEquity = 0;
    this.consecutiveLosses = 0;
    if (this.state !== 'PAUSED' || !this.manualOverride) {
      this.transition('HEALTHY', 'Daily reset');
    }
  }

  private transition(newState: CircuitState, reason: string) {
    if (this.state === newState) return;

    const event: CircuitEvent = {
      timestamp: new Date().toISOString(),
      fromState: this.state,
      toState: newState,
      reason,
    };
    this.eventLog.push(event);
    if (this.eventLog.length > 500) {
      this.eventLog = this.eventLog.slice(-500);
    }

    console.log(`[CIRCUIT_BREAKER] ${this.state} -> ${newState}: ${reason}`);
    this.state = newState;

    if (newState === 'CRITICAL') {
      this.pausedUntil = Date.now() + this.config.cooldownMs;
      const autoPauseReason = `Auto-pause after CRITICAL until ${new Date(this.pausedUntil).toISOString()}`;
      this.eventLog.push({
        timestamp: new Date().toISOString(),
        fromState: 'CRITICAL',
        toState: 'PAUSED',
        reason: autoPauseReason,
      });
      if (this.eventLog.length > 500) {
        this.eventLog = this.eventLog.slice(-500);
      }
      this.state = 'PAUSED';
      console.log(`[CIRCUIT_BREAKER] ${autoPauseReason}`);
    }
  }

  public getStatus() {
    return {
      state: this.getState(),
      consecutiveLosses: this.consecutiveLosses,
      dailyDrawdownPct: this.dailyDrawdownPct,
      peakEquity: this.peakEquity,
      manualOverride: this.manualOverride,
      canTrade: this.canTrade(),
      recentEvents: this.eventLog.slice(-20),
    };
  }
}

export const circuitBreaker = new CircuitBreaker();

export function getCircuitBreaker(): CircuitBreaker {
  return circuitBreaker;
}
