import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bed, Bath, Maximize, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatPrice } from '@/lib/matchEngine';

export default function PropertyCard({ property, matchPercentage, matchReason }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = property.photos || [];

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-latitud-black shadow-2xl">
      {/* Photo */}
      <div className="absolute inset-0">
        <img 
          src={photos[photoIndex] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'} 
          alt={property.title}
          className="w-full h-full object-cover"
        />
        <div className="gradient-overlay absolute inset-0" />
      </div>

      {/* Photo navigation */}
      {photos.length > 1 && (
        <>
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-1 z-10">
            {photos.map((_, i) => (
              <div key={i} className={`h-0.5 rounded-full transition-all ${i === photoIndex ? 'w-6 bg-white' : 'w-3 bg-white/40'}`} />
            ))}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setPhotoIndex(i => Math.max(0, i - 1)); }}
            className="absolute left-2 top-1/3 z-10 p-1 bg-black/20 rounded-full backdrop-blur-sm"
          >
            <ChevronLeft size={20} className="text-white" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setPhotoIndex(i => Math.min(photos.length - 1, i + 1)); }}
            className="absolute right-2 top-1/3 z-10 p-1 bg-black/20 rounded-full backdrop-blur-sm"
          >
            <ChevronRight size={20} className="text-white" />
          </button>
        </>
      )}

      {/* Match badge */}
      {matchPercentage && (
        <div className="absolute top-6 right-4 z-10">
          <div className="bg-latitud-orange text-white text-xs font-bold px-3 py-1.5 rounded-full">
            {matchPercentage}% compatible
          </div>
        </div>
      )}

      {/* Operation type badge */}
      <div className="absolute top-6 left-4 z-10">
        <div className="bg-white/90 backdrop-blur-sm text-latitud-black text-xs font-semibold px-3 py-1.5 rounded-full">
          {property.operation_type}
        </div>
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        {/* Price */}
        <p className="text-latitud-orange font-bold text-2xl mb-1">
          {formatPrice(property.price, property.currency)}
        </p>

        {/* Title */}
        <h3 className="text-white font-heading text-lg leading-tight mb-2">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-white/70 text-sm mb-3">
          <MapPin size={14} />
          <span>{property.zone}, {property.city}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-white/80 text-sm mb-3">
          {property.bedrooms > 0 && (
            <div className="flex items-center gap-1">
              <Bed size={14} />
              <span>{property.bedrooms}</span>
            </div>
          )}
          {property.bathrooms > 0 && (
            <div className="flex items-center gap-1">
              <Bath size={14} />
              <span>{property.bathrooms}</span>
            </div>
          )}
          {property.construction_area > 0 && (
            <div className="flex items-center gap-1">
              <Maximize size={14} />
              <span>{property.construction_area}m²</span>
            </div>
          )}
          {property.land_area > 0 && (
            <span className="text-white/50">· {property.land_area}m² terreno</span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(property.tags || []).slice(0, 4).map(tag => (
            <span key={tag} className="text-xs bg-white/10 backdrop-blur-sm text-white/80 px-2.5 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Value phrase */}
        {property.value_phrase && (
          <p className="text-white/50 text-xs italic">{property.value_phrase}</p>
        )}

        {/* Match reason */}
        {matchReason && (
          <p className="text-latitud-orange/80 text-xs mt-2">{matchReason}</p>
        )}

        {/* Advisor */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
          <div className="w-6 h-6 rounded-full bg-latitud-orange/30 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{property.advisor_name?.[0]}</span>
          </div>
          <span className="text-white/50 text-xs">{property.advisor_name}</span>
        </div>
      </div>
    </div>
  );
}