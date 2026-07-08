import React from 'react';
import { brandConfig } from '@/lib/brandConfig';

export default function LatitudLogo({ variant = 'dark', size = 'md' }) {
  const sizeClasses = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-12',
    xl: 'h-16'
  };

  const titleColor = variant === 'white' ? 'text-white' : 'text-latitud-black';
  const subColor = variant === 'white' ? 'text-white/60' : 'text-latitud-gray';
  const markBg = variant === 'white' ? '#FFFFFF' : '#061A40';
  const markStroke = variant === 'white' ? '#061A40' : '#FFFFFF';
  const markAccent = '#0057FF';

  return (
    <div className="flex items-center gap-2 select-none">
      <svg className={sizeClasses[size]} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill={markBg} />
        <path
          d="M9 29V13L20 21L31 13V29"
          stroke={markStroke}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M20 21V29" stroke={markAccent} strokeWidth="3.2" strokeLinecap="round" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className={`font-extrabold text-sm tracking-tight ${titleColor}`}>
          {brandConfig.brand_name}
        </span>
        <span className={`text-[9px] tracking-[0.18em] ${subColor}`}>
          {brandConfig.brand_subtitle}
        </span>
      </div>
    </div>
  );
}