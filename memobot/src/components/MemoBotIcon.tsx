import React from 'react';
import { useLayout } from '../contexts/LayoutContext';

export function MemoBotIcon({ className }: { className?: string }) {
  const { settings } = useLayout();
  
  if (settings.logoUrl) {
    return <img src={settings.logoUrl} alt="Bot Icon" className={className} referrerPolicy="no-referrer" style={{ objectFit: 'contain' }} />;
  }

  return (
    <svg 
      viewBox="0 0 100 80" 
      className={className}
    >
      <defs>
         <linearGradient id="redBevelIcon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff1a1a" />
            <stop offset="20%" stopColor="#cc0000" />
            <stop offset="80%" stopColor="#800000" />
            <stop offset="100%" stopColor="#4d0000" />
         </linearGradient>
         <linearGradient id="goldBevelIcon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffdf00" />
            <stop offset="20%" stopColor="#ccaa00" />
            <stop offset="80%" stopColor="#806600" />
            <stop offset="100%" stopColor="#4d3d00" />
         </linearGradient>
         <filter id="glowIcon" x="-20%" y="-20%" width="140%" height="140%">
           <feGaussianBlur stdDeviation="2" result="blur" />
           <feComposite in="SourceGraphic" in2="blur" operator="over" />
         </filter>
      </defs>
      
      <path d="M15 70 L15 15 L50 45 L50 65 L32 50 L32 70 Z" fill="none" stroke="#ff1a1a" strokeWidth="1" opacity="0.5" filter="url(#glowIcon)"/>
      <path d="M85 70 L85 15 L50 45 L50 65 L68 50 L68 70 Z" fill="none" stroke="#ffdf00" strokeWidth="1" opacity="0.5" filter="url(#glowIcon)"/>

      <path d="M15 70 L15 15 L50 45 L50 65 L32 50 L32 70 Z" fill="url(#redBevelIcon)"/>
      <path d="M15 15 L25 10 L50 35 L50 45 Z" fill="#ff4d4d"/>
      <path d="M85 70 L85 15 L50 45 L50 65 L68 50 L68 70 Z" fill="url(#goldBevelIcon)"/>
      <path d="M85 15 L75 10 L50 35 L50 45 Z" fill="#ffdf00"/>
      
      <circle cx="50" cy="45" r="2" fill="#fff" filter="url(#glowIcon)" />
    </svg>
  );
}
