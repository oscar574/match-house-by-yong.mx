import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bed, Bath, Maximize, Ruler, MapPin, ChevronLeft, ChevronRight, Sparkles, MessageCircle, Star } from 'lucide-react';
import { formatPriceExact } from '@/lib/matchEngine';
import { buildPropertyWhatsAppUrl } from '@/lib/brandConfig';
import { getPropertyPhotos, getFallbackImage } from '@/lib/propertyImages';

export default function PropertyCard({ property, matchPercentage, matchReason, isCurated }) {
  const navigate = useNavigate();
  const photos = useMemo(() => getPropertyPhotos(property), [property]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  // Direction of the last photo change for the slide animation (-1 = forward/next, 1 = back/prev)
  const [slideDir, setSlideDir] = useState(0);
  const pointerStart = useRef(null);

  // Keep photoIndex valid if the property (and thus photos) changes
  useEffect(() => {
    if (photoIndex > photos.length - 1) setPhotoIndex(Math.max(0, photos.length - 1));
  }, [photos.length, photoIndex]);

  const currentPhoto = imgError
    ? getFallbackImage(property)
    : (photos[photoIndex] || getFallbackImage(property));

  const handleError = () => {
    if (photoIndex < photos.length - 1) {
      setSlideDir(-1);
      setPhotoIndex(i => i + 1);
      setImgError(false);
    } else {
      setImgError(true);
    }
  };

  const goNext = () => {
    if (photoIndex < photos.length - 1) { setSlideDir(-1); setPhotoIndex(i => i + 1); }
  };
  const goPrev = () => {
    if (photoIndex > 0) { setSlideDir(1); setPhotoIndex(i => i - 1); }
  };

  // Preload adjacent photos so swipe feels instant
  useEffect(() => {
    if (imgError) return;
    if (photoIndex + 1 < photos.length) { const i = new Image(); i.src = photos[photoIndex + 1]; }
    if (photoIndex - 1 >= 0) { const i = new Image(); i.src = photos[photoIndex - 1]; }
  }, [photoIndex, photos, imgError]);

  // Unified pointer (touch + mouse) gesture handling on the photo area.
  // - tap (<10px, <300ms) → open property details
  // - horizontal drag (>40px and > vertical) → navigate carousel (no loop)
  // - vertical-dominant movement → ignored, page scrolls normally (touch-action: pan-y)
  const handlePointerDown = (e) => {
    pointerStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const handlePointerUp = (e) => {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    const dt = Date.now() - pointerStart.current.t;
    pointerStart.current = null;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx < 10 && absDy < 10 && dt < 300) {
      navigate(`/property/${property.id}`);
      return;
    }
    if (absDx > 40 && absDx > absDy) {
      if (dx < 0) goNext(); else goPrev();
    }
  };
  const handlePointerCancel = () => { pointerStart.current = null; };

  const multiPhoto = photos.length > 1 && !imgError;

  return (
    <div className="relative w-full h-full min-h-[60vh] rounded-[1.75rem] overflow-hidden bg-latitud-black shadow-2xl select-none">
      {/* Photo area — tap opens details, horizontal swipe/drag navigates photos.
          Chevrons, dots and badges are siblings on top (z-20) so taps on them
          never reach these handlers and keep their own actions. */}
      <div
        className="absolute inset-0 touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <AnimatePresence initial={false} mode="sync">
          <motion.img
            key={photoIndex}
            src={currentPhoto}
            alt={property.title}
            draggable={false}
            onError={handleError}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            initial={{ opacity: 0, x: slideDir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDir * -24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Photo navigation: dots + arrows (z-20, own click handlers) */}
      {multiPhoto && (
        <>
          <div className="absolute top-5 left-0 right-0 flex justify-center gap-1.5 z-20 px-12 pointer-events-none">
            {photos.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === photoIndex ? 'w-6 bg-white' : 'w-3 bg-white/30'}`} />
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-1.5 bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition-colors"
          >
            <ChevronLeft size={22} className="text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
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
      <div className="absolute top-5 left-4 z-20 flex flex-col gap-1.5 items-start">
        <div className="bg-white/90 backdrop-blur-sm text-latitud-black text-xs font-semibold px-3 py-1.5 rounded-full">
          {property.operation_type}
        </div>
        {isCurated && (
          <div className="bg-[#C9A45C] text-latitud-black text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <Star size={12} fill="currentColor" /> Selección de tu asesor
          </div>
        )}
      </div>

      {/* Content overlay — pointer-events-none so taps on empty areas fall through
          to the photo (open details); the WhatsApp button re-enables pointer events. */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10 pointer-events-none">
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
          {(property.construction_area || property.construction_m2) > 0 && (
            <div className="flex items-center gap-1">
              <Maximize size={14} />
              <span>{property.construction_area || property.construction_m2}m²</span>
            </div>
          )}
          {(property.land_area || property.land_m2) > 0 && (
            <div className="flex items-center gap-1">
              <Ruler size={14} />
              <span>{property.land_area || property.land_m2}m²</span>
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
          className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white text-sm font-semibold py-2.5 rounded-xl pointer-events-auto"
        >
          <MessageCircle size={16} />
          Contactar por WhatsApp
        </a>
      </div>
    </div>
  );
}