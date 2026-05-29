import React from "react";
import { trpc } from "../lib/trpc";
import { useLanguage } from "../contexts/LanguageContext";
import { MarketTicker } from "./MarketTicker";
import { useRealtimePrices } from "../hooks/useRealtimePrices";

export function TickerBar() {
  const { data: trpcTickers } = trpc.trading.getTickers.useQuery(undefined, { 
    refetchInterval: 10000,
    staleTime: 5000 
  });
  const { tickers: liveTickers } = useRealtimePrices();
  const { isRTL } = useLanguage();

  const sortedLiveTickers = [...(liveTickers as any[])].sort((a, b) => parseFloat(b.volume || "0") - parseFloat(a.volume || "0"));

  const pairList = sortedLiveTickers.length > 0 ? sortedLiveTickers : (trpcTickers || [
    { symbol: "BTCUSDT", price: "64500", change24h: "+2.4%" },
    { symbol: "ETHUSDT", price: "3450", change24h: "-1.2%" },
    { symbol: "SOLUSDT", price: "145", change24h: "+5.1%" },
    { symbol: "BNBUSDT", price: "590", change24h: "+0.8%" },
    { symbol: "AVAXUSDT", price: "38.5", change24h: "-2.5%" }
  ]);

  return (
    <div className="flex items-center h-full overflow-hidden whitespace-nowrap mask-edges relative w-full">
      <div 
        className="flex animate-ticker hover:pause gap-8"
        style={{ animationDuration: `${Math.max(40, pairList.length * 3)}s` }}
      >
        {[...pairList, ...pairList].map((ticker, i) => (
          <MarketTicker key={i} ticker={ticker} />
        ))}
      </div>
      
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation-name: ticker;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .pause:hover {
          animation-play-state: paused;
        }
        .mask-edges {
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
      `}</style>
    </div>
  );
}