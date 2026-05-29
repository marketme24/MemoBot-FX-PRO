import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

export interface HelpTooltipProps {
  children?: React.ReactNode;
  description: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export function HelpTooltip({ children, description, side = 'top', align = 'center' }: HelpTooltipProps) {
  const { language } = useLanguage();
  
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <div className="inline-block cursor-help transition-all">
            {children || <Info className="w-4 h-4 text-gray-500 hover:text-primary" />}
          </div>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={8}
            className={cn(
              "z-[1000] overflow-hidden rounded-xl border border-white/10 bg-black/90 backdrop-blur-3xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 w-64",
              language === 'ar' ? "text-right font-inter" : "text-left font-inter"
            )}
          >
            <div className="space-y-1.5">
               <div className="flex items-center gap-2 mb-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_var(--primary-secondary)]" />
                 <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{language === 'ar' ? 'معلومات النظام' : 'Engine Reference'}</span>
               </div>
               <p className="text-[11px] font-bold text-primary/90 leading-relaxed uppercase tracking-tight italic">
                {description}
              </p>
            </div>
            <TooltipPrimitive.Arrow className="fill-black/90 stroke-white/10" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}