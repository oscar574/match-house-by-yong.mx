import React, { useState } from 'react';
import { Bed, Bath, Maximize, MapPin, ChevronLeft, ChevronRight, Sparkles, MessageCircle } from 'lucide-react';
import { formatPriceExact } from '@/lib/matchEngine';
import { buildPropertyWhatsAppUrl } from '@/lib/brandConfig';
import { getPropertyPhotos, getFallbackImage, FALLBACK_ARCHITECTURE } from '@/lib/propertyImages';

export default function PropertyCard({ property, matchPercentage, matchReason }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const photos = getPropertyPhotos(property);

  const currentPhoto = imgError
    ? getFallbackImage(property)
    : (photos[photoIndex] || getFallbackImage(property));

  const handleError = () => {
    // Try next photo, or fall back to type/zone image
    if (photoIndex < photos.length - 1) {
      setPhotoIndex(photoIndex + 1);
      setImgError(false);
    } else {
      setImgError(true);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[60vh] rounded-[1.75rem] overflow-hidden bg-latitud-black shadow-2xl">
      {/* Photo — occupies full card (min 65%) */}
      <div className="absolute inset-0">
        <img
          src={currentPhoto}
          alt={property.title}
          onError={handleError}
          className="w-full h-full object-cover"
          loading="eager"
        />
        {/* Dark gradient overlay bottom for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
      </div>

      {/* Photo navigation */}
      {photos.length > 1 && !imgError && (
        <>
          <div className="absolute top-5 left-0 right-0 flex justify-center gap-1.5 z-20 px-12">
            {photos.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === photoIndex ? 'w-6 bg-white' : 'w-3 bg-white/30'}`} />
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setPhotoIndex(i => Math.max(0, i - 1)); setImgError(false); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-1.5 bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition-colors"
          >
            <ChevronLeft size={22} className="text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setPhotoIndex(i => Math.min(photos.length - 1, i + 1)); setImgError(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-1.5 bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition-colors"
          >
            <ChevronRight size={22} className="text-white" />
          </button>
        </>
      )}

      {/* Match badge - circular */}
      {matchPercentage != null && (
        <div className="absolute top-5 right-4 z-20">
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
              <circle
                cx="28" cy="28" r="24" fill="none"
                stroke="#0057FF" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - matchPercentage / 100)}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white font-bold text-sm leading-none">{matchPercentage}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Operation type badge */}
      <div className="absolute top-5 left-4 z-20">
        <div className="bg-white/90 backdrop-blur-sm text-latitud-black text-xs font-semibold px-3 py-1.5 rounded-full">
          {property.operation_type}
        </div>
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        {/* Price */}
        <p className="text-latitud-orange font-bold text-2xl mb-1 drop-shadow-lg">
          {formatPriceExact(property.price, property.currency)}
        </p>

        {/* Title */}
        <h3 className="text-white font-heading text-lg leading-tight mb-2 drop-shadow-lg">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-white/80 text-sm mb-3 drop-shadow">
          <MapPin size={14} className="text-latitud-orange" />
          <span>{property.zone}, {property.city}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-white/90 text-sm mb-3 drop-shadow">
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
        </div>

        {/* Tags */}
        {(property.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {property.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs bg-white/10 backdrop-blur-sm text-white/90 px-2.5 py-1 rounded-full border border-white/10 drop-shadow">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Match reason - prominent */}
        {matchReason && (
          <div className="flex items-start gap-2 bg-latitud-orange/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-latitud-orange/30 mb-3">
            <Sparkles size={14} className="text-latitud-orange mt-0.5 shrink-0" />
            <p className="text-white/95 text-xs leading-relaxed">{matchReason}</p>
          </div>
        )}

        {/* WhatsApp contact */}
        <a
          href={buildPropertyWhatsAppUrl(property)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white text-sm font-semibold py-2.5 rounded-xl"
        >
          <MessageCircle size={16} />
          Contactar por WhatsApp
        </a>
      </div>
    </div>
  );
}