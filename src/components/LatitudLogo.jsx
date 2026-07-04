import React from 'react';

export default function LatitudLogo({ variant = 'dark', size = 'md' }) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
    xl: 'h-20'
  };

  // Using the actual Latitud Inmobiliaria logo from their website
  const logoSrc = variant === 'white' 
    ? 'https://media.base44.com/images/public/user_6a348b347914a34e34822ed2/9ea2dffaa_IMG_4177.png'
    : 'https://media.base44.com/images/public/user_6a348b347914a34e34822ed2/9ea2dffaa_IMG_4177.png';

  return (
    <div className="flex items-center gap-2">
      <svg className={sizeClasses[size]} viewBox="0 0 40 40" fill="none">
        <path d="M20 4L8 16V32L20 36L32 32V16L20 4Z" fill="#FF7A00"/>
        <path d="M20 8L12 16V28L20 32L28 28V16L20 8Z" fill={variant === 'white' ? '#FFFFFF' : '#0A0A0A'}/>
        <path d="M20 12L16 16V24L20 28L24 24V16L20 12Z" fill="#FF7A00"/>
      </svg>
      <div className="flex flex-col leading-none">
        <span className={`font-bold text-sm tracking-widest ${variant === 'white' ? 'text-white' : 'text-latitud-black'}`}>
          LATITUD
        </span>
        <span className={`text-[10px] tracking-[0.2em] ${variant === 'white' ? 'text-white/80' : 'text-latitud-gray'}`}>
          INMOBILIARIA
        </span>
      </div>
    </div>
  );
}