import { MemoBotIcon } from '../../components/MemoBotIcon';
import React, { useEffect, useState, useRef } from 'react';
import { Bot, Activity, Terminal, Shield, Cpu, Wifi, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'click' | 'system' | 'network' | 'error' | 'security';
  target?: string;
  details: string;
}

export function SystemHealthBot() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 0,
    mem: 0,
    latency: 0,
    packets: 0
  });
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const addLog = (type: LogEntry['type'], target: string, details: string) => {
      setLogs(prev => {
        const newLogs = [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          type,
          target,
          details
        }].slice(-100);
        return newLogs;
      });
    };

    // Initial boot sequence
    setTimeout(() => addLog('system', 'BOOT_SEQ', 'Initializing deep health monitoring subsystem...'), 100);
    setTimeout(() => addLog('network', 'WSS_HANDSHAKE', 'Establishing secure telemetry channel (latency: 12ms)'), 600);
    setTimeout(() => addLog('security', 'AUTH_CHECK', 'Global event capture privileges granted.'), 1200);

    const metricsInterval = setInterval(() => {
      setSystemMetrics({
        cpu: Math.floor(Math.random() * 20) + 15,
        mem: Math.floor(Math.random() * 10) + 40,
        latency: Math.floor(Math.random() * 15) + 8,
        packets: Math.floor(Math.random() * 500) + 1000
      });
    }, 2000);

    // Global interaction capture
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Sophisticated CSS selector derivation
      let targetName = target.tagName.toLowerCase();
      if (target.id) targetName += `#${target.id}`;
      
      const classes = Array.from(target.classList).slice(0, 3).join('.');
      if (classes) targetName += `.${classes}`;
      
      let textContent = target.textContent?.replace(/\s+/g, ' ').slice(0, 40).trim() || '';
      
      // Ignore clicks heavily within our own console to prevent looping output
      if (target.closest('.health-bot-container')) return;

      const details = `[X:${e.clientX} Y:${e.clientY}] DOM Element -> ${targetName} ${textContent ? `|| Value: "${textContent}"` : ''}`;
      
      addLog('click', 'USER_INTERACTION', details);
    };

    window.addEventListener('click', handleClick, true);

    return () => {
      clearInterval(metricsInterval);
      window.removeEventListener('click', handleClick, true);
    };
  }, []);

  useEffect(() => {
    if (logsEndRef.current && isExpanded) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  const getLogColor = (type: string) => {
    switch(type) {
      case 'click': return '#60a5fa'; // Blue
      case 'error': return '#f43f5e'; // Rose
      case 'network': return '#34d399'; // Emerald
      case 'security': return '#fbbf24'; // Amber
      default: return '#94a3b8'; // Slate
    }
  };

  return (
    <div className="bg-[#050505] rounded-2xl border border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.15)] relative overflow-hidden health-bot-container group font-mono">
      {/* Cyber Background */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30"></div>
      
      {/* Header */}
      <div 
        className="relative z-10 p-5 border-b border-blue-500/20 bg-gradient-to-r from-blue-900/40 via-[#050505] to-[#050505] cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 animate-ping opacity-20 rounded-xl"></div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/50 flex items-center justify-center relative z-10 text-primary shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                <Eye className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-primary font-black tracking-widest flex items-center gap-3 text-lg uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                Omniscient Monitor 
                <span className="text-[9px] px-2 py-1 rounded bg-blue-600 border border-blue-400 text-primary shadow-[0_0_10px_rgba(59,130,246,0.8)] font-sans tracking-normal">GIFT PATCH</span>
              </h3>
              <p className="text-[10px] text-primary tracking-widest mt-1 flex items-center gap-2 uppercase">
                <Shield className="w-3 h-3" /> System Diagnostics & Deep User Telemetry
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 justify-between md:justify-end">
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase text-primary/70 tracking-widest mb-1">Compute</span>
              <span className="text-blue-300 font-black tracking-wider shadow-blue-500/20 drop-shadow-md">{systemMetrics.cpu}%</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase text-primary/70 tracking-widest mb-1">Mem Block</span>
              <span className="text-primary font-black tracking-wider drop-shadow-md">{systemMetrics.mem}%</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase text-primary/70 tracking-widest mb-1">Ping</span>
              <span className="text-primary font-black tracking-wider drop-shadow-md">{systemMetrics.latency}ms</span>
            </div>
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-[9px] uppercase text-primary/70 tracking-widest mb-1">Packets</span>
              <span className="text-purple-400 font-black tracking-wider drop-shadow-md">{systemMetrics.packets}/s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "350px", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative z-10 bg-[#020202] border-t border-blue-500/30 shadow-inner overflow-hidden text-[11px]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent pointer-events-none z-10 h-8"></div>
            
            <div className="h-full overflow-y-auto p-5 space-y-1.5 custom-scrollbar relative z-0">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-4 border-l pl-3 py-0.5 hover:bg-white/[0.02]" style={{
                  borderColor: getLogColor(log.type)
                }}>
                  <div className="text-gray-600 shrink-0 w-28 whitespace-nowrap">
                    [{log.timestamp.toISOString().split('T')[1].slice(0, -1)}]
                  </div>
                  <div className="shrink-0 w-32 uppercase font-bold tracking-wider" style={{ color: getLogColor(log.type) }}>
                    {log.target}
                  </div>
                  <div className="flex-1 text-gray-400 break-all">
                    {log.details}
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} className="h-4" />
            </div>
            
            {/* Blinking cursor effect at bottom */}
            <div className="absolute bottom-4 left-5 text-gray-500 animate-pulse font-black text-sm">
              _
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isExpanded && (
        <div className="relative z-10 px-5 py-3 bg-blue-500/5 border-t border-blue-500/10 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-3 w-full truncate pr-4">
            <Activity className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate">
              {logs.length > 0 ? (
                 <><span style={{ color: getLogColor(logs[logs.length-1].type)}} className="font-bold mr-2">[{logs[logs.length-1].target}]</span>{logs[logs.length-1].details}</>
              ) : 'System standing by...'}
             </span>
          </div>
          <span className="text-primary cursor-pointer hover:text-blue-300 transition-colors uppercase tracking-widest whitespace-nowrap font-bold shrink-0">Open Terminal</span>
        </div>
      )}
    </div>
  );
}
