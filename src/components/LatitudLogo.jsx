import React from 'react';

export default function LatitudLogo({ variant = 'dark', size = 'md' }) {
  const sizeClasses = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-12',
    xl: 'h-16'
  };

  const titleColor = variant === 'white' ? 'text-white' : 'text-latitud-black';
  const subColor = variant === 'white' ? 'text-white/70' : 'text-latitud-gray';

  return (
    <div className="flex items-center gap-2 select-none">
      <svg className={sizeClasses[size]} viewBox="0 0 40 40" fill="none">
        <path d="M20 4L8 16V32L20 36L32 32V16L20 4Z" fill="#FF7A00"/>
        <path d="M20 8L12 16V28L20 32L28 28V16L20 8Z" fill={variant === 'white' ? '#FFFFFF' : '#0A0A0A'}/>
        <path d="M20 12L16 16V24L20 28L24 24V16L20 12Z" fill="#FF7A00"/>
      </svg>
      <div className="flex flex-col leading-none">
        <span className={`font-extrabold text-sm tracking-tight ${titleColor}`}>
          MatchHouse
        </span>
        <span className={`text-[9px] tracking-[0.18em] ${subColor}`}>
          by YONG.MX
        </span>
      </div>
    </div>
  );
}