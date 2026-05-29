import { engineManager } from './engine_manager';

export class Scheduler {
  private tasks: Map<string, NodeJS.Timeout> = new Map();

  constructor() {}

  public registerTask(name: string, intervalMs: number, taskFn: () => void) {
      if (this.tasks.has(name)) this.cancelTask(name);
      
      const interval = setInterval(taskFn, intervalMs);
      this.tasks.set(name, interval);
  }

  public cancelTask(name: string) {
      const interval = this.tasks.get(name);
      if (interval) {
          clearInterval(interval);
          this.tasks.delete(name);
      }
  }

  public startGlobalTick() {
      // 1. Telemetry heartbeat
      this.registerTask('telemetry', 5000, () => {
          // Log global metrics to console or DB buffer
          if ((global as any).addBotLog) {
             // (global as any).addBotLog(`SYSTEM TICK: Modules operational.`, 'info', 'paper');
          }
      });

      // 2. Scheduled Bot Health Checks (Failover & Recovery proxy)
      this.registerTask('failover_check', 30000, () => {
           for (const bot of engineManager.bots) {
                if (bot.status === 'error') {
                    console.log(`[Failover] Attempting to auto-recover bot ${bot.id}`);
                    bot.status = 'paused'; // Step down from error
                }
           }
      });
  }
}

export const systemScheduler = new Scheduler();
