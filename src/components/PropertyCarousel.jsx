import React, { useRef } from 'react';
import PropertyThumb from '@/components/PropertyThumb';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function PropertyCarousel({ title, subtitle, properties }) {
  const scrollRef = useRef(null);

  if (!properties || properties.length === 0) return null;

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 480, behavior: 'smooth' });
    }
  };

  return (
    <div className="mb-7 group">
      <div className="flex items-end justify-between px-4 mb-3">
        <div>
          <h3 className="font-heading text-lg text-latitud-white leading-tight">{title}</h3>
          {subtitle && <p className="text-latitud-gray text-xs mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => scroll(-1)}
            className="w-7 h-7 rounded-full bg-latitud-white/10 flex items-center justify-center hover:bg-latitud-white/20 transition-colors"
          >
            <ChevronLeft size={14} className="text-latitud-white/70" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-7 h-7 rounded-full bg-latitud-white/10 flex items-center justify-center hover:bg-latitud-white/20 transition-colors"
          >
            <ChevronRight size={14} className="text-latitud-white/70" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 pb-2 scroll-smooth no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {properties.map((p, i) => (
          <PropertyThumb
            key={p.id || i}
            property={p}
            matchPercentage={p._matchPercentage}
          />
        ))}
      </div>
    </div>
  );
}