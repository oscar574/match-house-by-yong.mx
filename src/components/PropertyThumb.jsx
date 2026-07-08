import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatPrice } from '@/lib/matchEngine';
import { getCoverPhoto, getFallbackImage } from '@/lib/propertyImages';

export default function PropertyThumb({ property, matchPercentage }) {
  const navigate = useNavigate();
  const cover = getCoverPhoto(property);

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/property/${property.id}`)}
      className="relative shrink-0 w-[240px] h-[300px] rounded-2xl overflow-hidden bg-latitud-black cursor-pointer shadow-lg"
    >
      <img
        src={cover}
        alt={property.title}
        onError={(e) => { e.target.src = getFallbackImage(property); }}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {matchPercentage != null && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-latitud-orange text-white text-xs font-bold px-2 py-1 rounded-full">
            {matchPercentage}%
          </div>
        </div>
      )}

      <div className="absolute top-3 left-3 z-10">
        <span className="bg-white/90 backdrop-blur-sm text-latitud-black text-[10px] font-semibold px-2 py-1 rounded-full">
          {property.operation_type}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <p className="text-latitud-orange font-bold text-base leading-tight mb-0.5">
          {formatPrice(property.price, property.currency)}
        </p>
        <p className="text-white font-heading text-sm leading-tight mb-1 line-clamp-1">
          {property.title}
        </p>
        <p className="text-white/60 text-xs mb-1.5">{property.zone}, {property.city}</p>
        <div className="flex items-center gap-3 text-white/80 text-[11px]">
          {property.bedrooms > 0 && <span>{property.bedrooms} rec</span>}
          {property.bathrooms > 0 && <span>{property.bathrooms} baños</span>}
          {property.construction_area > 0 && <span>{property.construction_area}m²</span>}
        </div>
      </div>
    </motion.div>
  );
}