import React from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { cn } from "../lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export const MarketTicker: React.FC<{ ticker: any }> = ({ ticker }) => {
  const { f, language } = useLanguage();
  const isUp = ticker.change24h.startsWith("+");
  const price = parseFloat(ticker.price).toLocaleString(undefined, {
    minimumFractionDigits: ticker.price < 1 ? 4 : 2,
    maximumFractionDigits: ticker.price < 1 ? 4 : 2,
  });

  const baseSymbol = ticker.symbol.replace("USDT", "").toLowerCase();
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-3 px-4 py-2 border-r border-white/5 transition-all hover:bg-white/5 cursor-pointer">
          <div className="flex items-center gap-2">
            <img 
              src={`https://assets.coincap.io/assets/icons/${baseSymbol}@2x.png`} 
              alt={baseSymbol} 
              className="w-5 h-5 rounded-full bg-white/10" 
              onError={(e) => { 
                // Fallback generic crypto icon if logo not found
                e.currentTarget.src = "https://cryptologos.cc/logos/tether-usdt-logo.svg"; 
              }} 
            />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 italic tracking-tighter uppercase leading-none">
                {ticker.symbol.replace("USDT", "")}
              </span>
              <span className="text-[7px] text-gray-500 font-bold tracking-widest uppercase mt-0.5">SPOT</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end pl-2">
            <span className="text-sm font-black font-mono tracking-tighter text-primary leading-none">
              {f(price)}
            </span>
            <div className={cn(
              "flex items-center gap-1 text-[8px] font-black uppercase tracking-tighter mt-0.5",
              isUp ? "text-green-500" : "text-red-500"
            )}>
              {isUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
              {f(ticker.change24h)}
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-black/90 text-white backdrop-blur-xl border-white/10 shadow-xl z-[1000] p-3 text-center w-32">
         <div className="text-[10px] font-black text-primary uppercase mb-1">{ticker.symbol}</div>
         <div className="text-[8px] text-gray-400 uppercase">24h Vol: {parseInt(ticker.volume || "0").toLocaleString()}</div>
         <div className="text-[8px] text-gray-400 uppercase">High: {f(ticker.highPrice || "-")}</div>
         <div className="text-[8px] text-gray-400 uppercase">Low: {f(ticker.lowPrice || "-")}</div>
      </TooltipContent>
    </Tooltip>
  );
}