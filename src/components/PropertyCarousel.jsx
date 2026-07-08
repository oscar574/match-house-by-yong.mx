import React, { useRef } from 'react';
import PropertyThumb from '@/components/PropertyThumb';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function PropertyCarousel({ title, subtitle, properties }) {
  const scrollRef = useRef(null);

  if (!properties || properties.length === 0) return null;

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 260, behavior: 'smooth' });
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <div>
          <h3 className="font-heading text-lg text-white">{title}</h3>
          {subtitle && <p className="text-white/40 text-xs">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll(-1)}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ChevronLeft size={16} className="text-white/70" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ChevronRight size={16} className="text-white/70" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 pb-2 scroll-smooth"
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