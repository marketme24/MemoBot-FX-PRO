import { portfolioEngine } from './portfolio_engine';

export type EvalState = 'IDLE' | 'EVALUATING' | 'AWAITING_RISK' | 'EXECUTING' | 'REJECTED' | 'COMPLETED' | 'ABORTED_DUE_TO_REGIME_CHANGE';

interface EvalContext {
    id: string;
    symbol: string;
    startTime: number;
    state: EvalState;
    initialRiskLevel: string;
}

export class EngineStateMachine {
    private activeEvals: Map<string, EvalContext> = new Map();
    private globalExecutionLock: boolean = false; 

    public startEvaluation(symbol: string, currentRiskLevel: string): string {
        const id = `EVAL_${symbol.replace('/','')}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.activeEvals.set(id, {
            id,
            symbol,
            startTime: Date.now(),
            state: 'EVALUATING',
            initialRiskLevel: currentRiskLevel
        });
        return id;
    }

    public async acquireRiskLock(evalId: string, currentRiskLevel: string): Promise<boolean> {
        const ctx = this.activeEvals.get(evalId);
        if (!ctx) return false;

        // Abort stringently if regime changed mid-evaluation to EXTREME
        if (ctx.initialRiskLevel !== currentRiskLevel && currentRiskLevel === 'EXTREME') {
            ctx.state = 'ABORTED_DUE_TO_REGIME_CHANGE';
            return false;
        }
        
        if (ctx.initialRiskLevel !== currentRiskLevel) {
            // Update risk level but proceed
            ctx.initialRiskLevel = currentRiskLevel;
        }

        // Simple spin-lock for concurrency demo (in Node.js even async execution runs on event loop, 
        // but this simulates async microtask queuing).
        let attempts = 0;
        while (this.globalExecutionLock) {
            await new Promise(resolve => setTimeout(resolve, 5));
            attempts++;
            if (attempts > 100) return false; // timeout
        }

        this.globalExecutionLock = true;
        ctx.state = 'AWAITING_RISK';
        return true;
    }

    public releaseRiskLock(evalId: string, finalState: EvalState) {
        const ctx = this.activeEvals.get(evalId);
        if (ctx) ctx.state = finalState;
        this.globalExecutionLock = false;
    }

    public getContext(evalId: string) {
        return this.activeEvals.get(evalId);
    }
}

export const evaluationStateMachine = new EngineStateMachine();
