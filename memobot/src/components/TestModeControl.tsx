import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '../lib/utils';
import { FlaskConical, Play, Square, Settings2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface TestModeConfig {
  enabled: boolean;
  symbol: string;
  tradeAmountUsdt: number;
  holdSeconds: number;
  maxRounds: number;
}

type TestStatus = 'idle' | 'running' | 'completed' | 'error';

interface TestResult {
  round: number;
  buyPrice: number;
  sellPrice: number;
  pnl: number;
  fees: number;
  netPnl: number;
  duration: number;
}

export default function TestModeControl() {
  const [config, setConfig] = useState<TestModeConfig>({
    enabled: false,
    symbol: 'BTC/USDT',
    tradeAmountUsdt: 20,
    holdSeconds: 30,
    maxRounds: 1,
  });

  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentRound, setCurrentRound] = useState(0);

  const handleStartTest = () => {
    if (!config.enabled) {
      toast.error('Enable Test Mode first');
      return;
    }
    setTestStatus('running');
    setCurrentRound(1);
    setResults([]);

    // Simulate test execution
    const mockResult: TestResult = {
      round: 1,
      buyPrice: 67432.5,
      sellPrice: 67445.2,
      pnl: 12.7 * (config.tradeAmountUsdt / 67432.5),
      fees: config.tradeAmountUsdt * 0.002,
      netPnl: 0,
      duration: config.holdSeconds,
    };
    mockResult.netPnl = mockResult.pnl - mockResult.fees;

    setTimeout(() => {
      setResults([mockResult]);
      setTestStatus('completed');
      toast.success('Test round completed');
    }, 3000);
  };

  const handleStopTest = () => {
    setTestStatus('idle');
    setCurrentRound(0);
    toast.info('Test stopped');
  };

  const statusColor: Record<TestStatus, string> = {
    idle: 'text-gray-400',
    running: 'text-amber-400',
    completed: 'text-emerald-400',
    error: 'text-red-400',
  };

  return (
    <Card className="bg-[#050505]/90 border-white/5 shadow-2xl">
      <CardHeader className="border-b border-white/5 px-6 pt-5 pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <FlaskConical className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary block">Test Mode</span>
              <span className="text-[9px] text-gray-500 font-bold uppercase">1 BUY → HOLD → 1 SELL</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              "inline-flex items-center rounded-md border px-2.5 py-0.5 text-[8px] font-semibold uppercase tracking-widest",
              config.enabled ? "border-transparent bg-primary text-primary-foreground" : "border-transparent bg-secondary text-secondary-foreground"
            )}>
              {config.enabled ? 'ARMED' : 'DISARMED'}
            </span>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => setConfig({ ...config, enabled: v })}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className={cn('space-y-4 transition-opacity', !config.enabled && 'opacity-40 pointer-events-none')}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Symbol</Label>
              <Input
                value={config.symbol}
                onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
                className="bg-black/40 border-white/10 text-xs font-mono"
                disabled={testStatus === 'running'}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Amount (USDT)</Label>
              <Input
                type="number"
                value={config.tradeAmountUsdt}
                onChange={(e) => setConfig({ ...config, tradeAmountUsdt: parseFloat(e.target.value) || 20 })}
                className="bg-black/40 border-white/10 text-xs font-mono"
                disabled={testStatus === 'running'}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Hold (seconds)</Label>
              <Input
                type="number"
                value={config.holdSeconds}
                onChange={(e) => setConfig({ ...config, holdSeconds: parseInt(e.target.value) || 30 })}
                className="bg-black/40 border-white/10 text-xs font-mono"
                disabled={testStatus === 'running'}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Max Rounds</Label>
              <Input
                type="number"
                value={config.maxRounds}
                onChange={(e) => setConfig({ ...config, maxRounds: parseInt(e.target.value) || 1 })}
                className="bg-black/40 border-white/10 text-xs font-mono"
                disabled={testStatus === 'running'}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              {testStatus === 'idle' && <Clock size={14} className="text-gray-400" />}
              {testStatus === 'running' && <Settings2 size={14} className="text-amber-400 animate-spin" />}
              {testStatus === 'completed' && <CheckCircle2 size={14} className="text-emerald-400" />}
              {testStatus === 'error' && <AlertTriangle size={14} className="text-red-400" />}
              <span className={cn('text-[10px] font-black uppercase tracking-widest', statusColor[testStatus])}>
                {testStatus === 'idle' && 'Ready'}
                {testStatus === 'running' && `Round ${currentRound}/${config.maxRounds} executing...`}
                {testStatus === 'completed' && 'Test Complete'}
                {testStatus === 'error' && 'Test Failed'}
              </span>
            </div>
            <div className="flex gap-2">
              {testStatus !== 'running' ? (
                <Button
                  size="sm"
                  onClick={handleStartTest}
                  className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 text-[10px] font-black uppercase tracking-widest"
                >
                  <Play size={12} className="mr-1" /> Execute Test
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleStopTest}
                  variant="destructive"
                  className="text-[10px] font-black uppercase tracking-widest"
                >
                  <Square size={12} className="mr-1" /> Abort
                </Button>
              )}
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Results</span>
            {results.map((r) => (
              <div key={r.round} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 grid grid-cols-4 gap-3 text-[10px]">
                <div>
                  <span className="text-gray-500 block">BUY</span>
                  <span className="text-primary font-mono font-bold">${r.buyPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">SELL</span>
                  <span className="text-primary font-mono font-bold">${r.sellPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">FEES</span>
                  <span className="text-amber-400 font-mono font-bold">${r.fees.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">NET P&L</span>
                  <span className={cn('font-mono font-bold', r.netPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {r.netPnl >= 0 ? '+' : ''}{r.netPnl.toFixed(4)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
