import React from "react";
import Marquee from "react-fast-marquee";
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { useBot } from "../context/BotContext";

export default function TickerBar() {
  const { tickers } = useBot();
  if (!tickers || tickers.length === 0) {
    return (
      <div data-testid="ticker-bar-loading" className="h-10 border-b border-white/10 bg-[#0a0a0a] flex items-center px-4">
        <span className="text-xs font-mono text-white/40">loading market data…</span>
      </div>
    );
  }
  return (
    <div data-testid="ticker-bar" className="h-10 border-b border-white/10 bg-[#0a0a0a] flex items-center overflow-hidden">
      <Marquee speed={40} gradient={false} pauseOnHover>
        {tickers.map((t) => {
          const up = t.change_24h_pct >= 0;
          return (
            <a
              key={t.symbol}
              data-testid={`ticker-${t.symbol}`}
              href={t.binance_url}
              target="_blank"
              rel="noreferrer"
              className="mx-6 inline-flex items-center gap-2 text-sm hover:text-[#007AFF] transition-colors"
            >
              <span className="font-display font-bold tracking-tight text-white">{t.symbol.replace("USDT", "/USDT")}</span>
              <span className="font-mono text-white">${t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span className={`font-mono text-xs inline-flex items-center gap-1 ${up ? "text-[#34C759]" : "text-[#FF3B30]"}`}>
                {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {up ? "+" : ""}{t.change_24h_pct.toFixed(2)}%
              </span>
              <ExternalLink size={11} className="text-white/30" />
            </a>
          );
        })}
      </Marquee>
    </div>
  );
}
