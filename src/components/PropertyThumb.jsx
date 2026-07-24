import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Bed, Bath, Maximize } from 'lucide-react';
import { formatPriceExact } from '@/lib/matchEngine';
import { getCoverPhoto, getFallbackImage } from '@/lib/propertyImages';

export default function PropertyThumb({ property, matchPercentage }) {
  const navigate = useNavigate();
  const cover = getCoverPhoto(property);

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/property/${property.id}`)}
      className="relative shrink-0 w-[230px] h-[320px] rounded-2xl overflow-hidden bg-latitud-black cursor-pointer shadow-xl"
    >
      <img
        src={cover}
        alt={property.title}
        onError={(e) => { e.target.src = getFallbackImage(property); }}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-overlay/95 via-overlay/35 to-transparent" />

      {matchPercentage != null && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-latitud-orange text-white text-[11px] font-bold px-2 py-1 rounded-full shadow-lg">
            {matchPercentage}% match
          </div>
        </div>
      )}

      <div className="absolute top-3 left-3 z-10">
        <span className="bg-white/90 backdrop-blur-sm text-latitud-black text-[10px] font-semibold px-2 py-1 rounded-full">
          {property.operation_type}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3.5 z-10">
        <p className="text-latitud-orange font-bold text-[15px] leading-tight mb-0.5 drop-shadow">
          {formatPriceExact(property.price, property.currency)}
        </p>
        <p className="text-white font-heading text-sm leading-tight mb-1 line-clamp-1">
          {property.title}
        </p>
        <p className="text-white/60 text-xs mb-2 flex items-center gap-1 truncate">
          <MapPin size={10} className="shrink-0" />{property.zone}, {property.city}
        </p>
        <div className="flex items-center gap-2.5 text-white/80 text-[11px]">
          {property.bedrooms > 0 && <span className="flex items-center gap-1"><Bed size={11} /> {property.bedrooms}</span>}
          {property.bathrooms > 0 && <span className="flex items-center gap-1"><Bath size={11} /> {property.bathrooms}</span>}
          {(property.construction_area || property.construction_m2) > 0 && <span className="flex items-center gap-1"><Maximize size={11} /> {property.construction_area || property.construction_m2} m²</span>}
        </div>
      </div>
    </motion.div>
  );
}