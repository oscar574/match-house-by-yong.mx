import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Calendar, Share2, Bed, Bath, Car, Maximize, Ruler, MapPin, ChevronLeft, ChevronRight, Sparkles, Check, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { formatPriceExact, calculateMatch } from '@/lib/matchEngine';
import { isBuyerVisible } from '@/lib/commissionRules';
import { partitionByClientPreferences } from '@/lib/clientFilters';
import { buildPropertyWhatsAppUrl } from '@/lib/brandConfig';
import { getPropertyPhotos, getFallbackImage } from '@/lib/propertyImages';
import { addLeadScore, getLeadStatus, ensureLeadTask } from '@/lib/leadScoring';
import VisitModal from '@/components/VisitModal';
import PropertyThumb from '@/components/PropertyThumb';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [client, setClient] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showVisit, setShowVisit] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [similar, setSimilar] = useState([]);

  // Intent tracking refs (once per action)
  const view20sRef = useRef(false);
  const allPhotosRef = useRef(false);
  const shareRef = useRef(false);
  const favoriteRef = useRef(false);

  // Carousel photos (memoized so gesture handlers stay stable)
  const photos = useMemo(() => property ? getPropertyPhotos(property) : [], [property]);
  const [slideDir, setSlideDir] = useState(0);
  const pointerStart = useRef(null);

  const goTo = (i) => { setSlideDir(i > photoIndex ? -1 : 1); setPhotoIndex(i); };
  const goNext = () => { if (photoIndex < photos.length - 1) goTo(photoIndex + 1); };
  const goPrev = () => { if (photoIndex > 0) goTo(photoIndex - 1); };

  // Preload adjacent photos for instant swipe
  useEffect(() => {
    if (photoIndex + 1 < photos.length) { const i = new Image(); i.src = photos[photoIndex + 1]; }
    if (photoIndex - 1 >= 0) { const i = new Image(); i.src = photos[photoIndex - 1]; }
  }, [photoIndex, photos]);

  // Swipe/drag handling on the gallery photo area. Horizontal > 40px (and > vertical)
  // navigates photos; vertical movement is left to the page scroll (touch-action: pan-y).
  // Gestures starting on buttons/links/no-swipe badges are ignored so they keep their own tap.
  const handlePointerDown = (e) => {
    if (e.target?.closest?.('button, a, [data-no-swipe]')) { pointerStart.current = null; return; }
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };
  const handlePointerUp = (e) => {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    pointerStart.current = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext(); else goPrev();
    }
  };
  const handlePointerCancel = () => { pointerStart.current = null; };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await base44.entities.Property.get(id);
      if (cancelled) return;
      setProperty(p);
      setLoading(false);

      const clientId = localStorage.getItem('latitud_client_id');
      if (clientId) {
        try {
          const c = await base44.entities.Client.get(clientId);
          if (cancelled) return;
          setClient(c);
          setMatchData(calculateMatch(p, c));

          // Reopen detection: prior views for this property?
          const priorViews = await base44.entities.Reaction.filter({ client_id: clientId, property_id: p.id, reaction_type: 'view' });
          if (!cancelled && priorViews.length > 0) {
            addIntent(clientId, 'REOPEN_PROPERTY');
          }
          if (!cancelled && priorViews.length >= 3) {
            ensureLeadTask({ clientId, clientName: c?.name, advisor: c?.assigned_advisor, title: `Cliente volvió a ver "${p.title}" varias veces`, taskType: 'Reactivación', priority: 'Media', propertyId: p.id, propertyName: p.title });
          }

          // Register a fresh view reaction
          await base44.entities.Reaction.create({
            client_id: clientId,
            property_id: p.id,
            reaction_type: 'view',
            property_title: p.title,
            property_zone: p.zone,
            property_city: p.city,
            property_price: p.price,
            property_type: p.property_type
          });

          // Favorite check
          const favs = await base44.entities.Reaction.filter({ client_id: clientId, property_id: p.id, reaction_type: 'like' });
          if (cancelled) return;
          setIsFavorite(favs.length > 0);

          // 20s view intent
          setTimeout(() => {
            if (!cancelled && !view20sRef.current) {
              view20sRef.current = true;
              addIntent(clientId, 'VIEW_20s');
            }
          }, 20000);

          // Similar properties (respect client hard filters: zones, budget, operation, bedrooms)
          const allProps = await base44.entities.Property.list('-created_date', 1000);
          const { inZone, outOfZone } = partitionByClientPreferences(allProps, c);
          const pool = inZone.length >= 4 ? inZone : [...inZone, ...outOfZone];
          let sim = pool.filter(x => x.id !== p.id);
          sim.sort((a, b) => Math.abs((a.price || 0) - (p.price || 0)) - Math.abs((b.price || 0) - (p.price || 0)));
          if (cancelled) return;
          sim = sim.slice(0, 5).map(x => ({ ...x, _match: c ? calculateMatch(x, c).percentage : null }));
          setSimilar(sim);
        } catch (e) { /* ignore */ }
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // All-photos intent
  useEffect(() => {
    const photos = property ? getPropertyPhotos(property) : [];
    if (photos.length > 1 && photoIndex === photos.length - 1 && !allPhotosRef.current) {
      allPhotosRef.current = true;
      const clientId = localStorage.getItem('latitud_client_id');
      if (clientId) addIntent(clientId, 'VIEW_ALL_PHOTOS');
    }
  }, [photoIndex, property]);

  const addIntent = async (clientId, action) => {
    try {
      const c = await base44.entities.Client.get(clientId);
      const current = c.buyer_intent_score ?? c.lead_score ?? 0;
      const hasVisit = (c.visit_requests_count || 0) > 0 || action === 'REQUEST_VISIT';
      const { score } = addLeadScore(current, action, hasVisit);
      await base44.entities.Client.update(clientId, {
        buyer_intent_score: score,
        lead_score: score,
        lead_status: getLeadStatus(score, hasVisit)
      });
      if (current < 35 && score >= 35) {
        ensureLeadTask({ clientId, clientName: c.name, advisor: c.assigned_advisor, title: `Lead calificado — contactar a ${c.name}`, taskType: 'Seguimiento', priority: 'Alta' });
      }
      if (current < 60 && score >= 60) {
        ensureLeadTask({ clientId, clientName: c.name, advisor: c.assigned_advisor, title: `Cliente alta intención — ${c.name}`, taskType: 'Contacto prioritario', priority: 'Alta' });
      }
    } catch (e) { /* ignore */ }
  };

  const toggleFavorite = async () => {
    const clientId = localStorage.getItem('latitud_client_id');
    if (!clientId || !property) return;
    if (isFavorite) {
      setIsFavorite(false);
    } else {
      setIsFavorite(true);
      if (!favoriteRef.current) {
        favoriteRef.current = true;
        addIntent(clientId, 'SAVE_FAVORITE');
      }
      await base44.entities.Reaction.create({
        client_id: clientId,
        property_id: property.id,
        reaction_type: 'like',
        property_title: property.title,
        property_zone: property.zone,
        property_city: property.city,
        property_price: property.price,
        property_type: property.property_type
      });
      if (client) {
        await base44.entities.Client.update(clientId, {
          liked_count: (client.liked_count || 0) + 1,
          last_activity_date: new Date().toISOString(),
          favorite_property_ids: [...(client.favorite_property_ids || []), property.id].slice(-50)
        });
      }
    }
  };

  const handleShare = async () => {
    if (!shareRef.current) {
      shareRef.current = true;
      const clientId = localStorage.getItem('latitud_client_id');
      if (clientId) addIntent(clientId, 'SHARE_PROPERTY');
    }
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: property.title, url }); } catch (e) { /* cancelled */ }
    } else {
      try { navigator.clipboard.writeText(url); } catch (e) { /* ignore */ }
      alert('Link copiado');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-latitud-gray">Propiedad no encontrada</p>
      </div>
    );
  }

  // Commercial rule: buyers never see properties that don't share commission.
  if (!isBuyerVisible(property)) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-latitud-light flex items-center justify-center mb-3">
          <Heart size={24} className="text-latitud-gray" />
        </div>
        <p className="font-heading text-lg text-latitud-black mb-1">Esta propiedad ya no está disponible</p>
        <p className="text-sm text-latitud-gray mb-6">Explora otras casas que se ajusten a ti.</p>
        <button onClick={() => navigate('/discover')} className="bg-latitud-orange text-white px-6 py-3 rounded-xl text-sm font-semibold">
          Descubrir propiedades
        </button>
      </div>
    );
  }

  const clientId = localStorage.getItem('latitud_client_id');
  const clientName = localStorage.getItem('latitud_client_name');

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Photo gallery — swipe/drag to navigate, vertical scroll preserved */}
      <div
        className="relative h-[60vh] touch-pan-y select-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <AnimatePresence initial={false} mode="sync">
          <motion.img
            key={photoIndex}
            src={photos[photoIndex] || getFallbackImage(property)}
            alt={property.title}
            draggable={false}
            onError={(e) => { e.target.src = getFallbackImage(property); }}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0, x: slideDir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDir * -24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="flex gap-2">
            <button onClick={handleShare} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <Share2 size={18} className="text-white" />
            </button>
            <button onClick={toggleFavorite} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <Heart size={18} className="text-white" fill={isFavorite ? '#C9A45C' : 'none'} stroke={isFavorite ? '#C9A45C' : 'white'} />
            </button>
          </div>
        </div>

        {/* Operation badge */}
        <div className="absolute top-24 left-4" data-no-swipe>
          <span className="bg-latitud-orange text-latitud-black text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
            {property.operation_type}
          </span>
        </div>

        {/* Match badge */}
        {matchData && (
          <div className="absolute top-24 right-4" data-no-swipe>
            <div className="bg-white/90 backdrop-blur-sm text-latitud-black text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
              <Sparkles size={12} className="text-latitud-orange" /> {matchData.percentage}% match
            </div>
          </div>
        )}

        {/* Photo navigation */}
        {photos.length > 1 && (
          <>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
              {photos.map((_, i) => (
                <button key={i} onClick={() => goTo(i)} className={`h-1.5 rounded-full transition-all ${i === photoIndex ? 'w-6 bg-white' : 'w-3 bg-white/40'}`} />
              ))}
            </div>
            <button onClick={goPrev} className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/20 rounded-full backdrop-blur-sm">
              <ChevronLeft size={20} className="text-white" />
            </button>
            <button onClick={goNext} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/20 rounded-full backdrop-blur-sm">
              <ChevronRight size={20} className="text-white" />
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="px-5 -mt-6 relative z-10">
        <div className="bg-white rounded-t-3xl pt-6">
          {/* Price */}
          <p className="text-latitud-orange font-bold text-3xl mb-1">
            {formatPriceExact(property.price, property.currency)}
          </p>

          {/* Title */}
          <h1 className="font-heading text-2xl text-latitud-black leading-tight mb-2">
            {property.title}
          </h1>

          {/* Location */}
          <div className="flex items-center gap-1 text-latitud-gray text-sm mb-5">
            <MapPin size={14} className="text-latitud-orange" />
            <span>{property.zone}, {property.city}</span>
          </div>

          {/* Match reason */}
          {matchData?.reasonText && (
            <div className="flex items-start gap-2 bg-latitud-orange/8 rounded-xl px-3 py-2.5 border border-latitud-orange/15 mb-6">
              <Sparkles size={14} className="text-latitud-orange mt-0.5 shrink-0" />
              <p className="text-latitud-black text-xs leading-relaxed">{matchData.reasonText}</p>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {property.bedrooms > 0 && (
              <div className="bg-latitud-light rounded-xl p-3 text-center">
                <Bed size={18} className="text-latitud-orange mx-auto mb-1" />
                <p className="text-sm font-semibold text-latitud-black">{property.bedrooms}</p>
                <p className="text-[10px] text-latitud-gray">Recámaras</p>
              </div>
            )}
            {property.bathrooms > 0 && (
              <div className="bg-latitud-light rounded-xl p-3 text-center">
                <Bath size={18} className="text-latitud-orange mx-auto mb-1" />
                <p className="text-sm font-semibold text-latitud-black">{property.bathrooms}</p>
                <p className="text-[10px] text-latitud-gray">Baños</p>
              </div>
            )}
            {property.parking_spaces > 0 && (
              <div className="bg-latitud-light rounded-xl p-3 text-center">
                <Car size={18} className="text-latitud-orange mx-auto mb-1" />
                <p className="text-sm font-semibold text-latitud-black">{property.parking_spaces}</p>
                <p className="text-[10px] text-latitud-gray">Estac.</p>
              </div>
            )}
            {(property.construction_area || property.construction_m2) > 0 && (
              <div className="bg-latitud-light rounded-xl p-3 text-center">
                <Maximize size={18} className="text-latitud-orange mx-auto mb-1" />
                <p className="text-sm font-semibold text-latitud-black">{property.construction_area || property.construction_m2}</p>
                <p className="text-[10px] text-latitud-gray">m² const.</p>
              </div>
            )}
            {(property.land_area || property.land_m2) > 0 && (
              <div className="bg-latitud-light rounded-xl p-3 text-center">
                <Ruler size={18} className="text-latitud-orange mx-auto mb-1" />
                <p className="text-sm font-semibold text-latitud-black">{property.land_area || property.land_m2}</p>
                <p className="text-[10px] text-latitud-gray">m² terreno</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {property.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {property.tags.map(tag => (
                <span key={tag} className="text-xs bg-latitud-light text-latitud-gray px-3 py-1.5 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <h3 className="font-semibold text-latitud-black text-sm mb-2 uppercase tracking-wider">Descripción</h3>
            <p className="text-latitud-gray text-sm leading-relaxed">{property.description}</p>
          </div>

          {/* Amenities */}
          {property.amenities?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-latitud-black text-sm mb-3 uppercase tracking-wider">Amenidades</h3>
              <div className="grid grid-cols-2 gap-2">
                {property.amenities.map(a => (
                  <div key={a} className="flex items-center gap-2 text-sm text-latitud-gray">
                    <Check size={14} className="text-latitud-orange shrink-0" />
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lifestyle tags */}
          {property.lifestyle_tags?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-latitud-black text-sm mb-3 uppercase tracking-wider">Estilo de vida</h3>
              <div className="flex flex-wrap gap-2">
                {property.lifestyle_tags.map(t => (
                  <span key={t} className="text-xs bg-latitud-orange/10 text-latitud-orange px-3 py-1.5 rounded-full font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Extra details */}
          <div className="space-y-0 mb-2">
            {(property.land_area || property.land_m2) > 0 && (
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-sm text-latitud-gray">Terreno</span>
                <span className="text-sm font-medium text-latitud-black">{property.land_area || property.land_m2} m²</span>
              </div>
            )}
            {(property.construction_area || property.construction_m2) > 0 && (
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-sm text-latitud-gray">Construcción</span>
                <span className="text-sm font-medium text-latitud-black">{property.construction_area || property.construction_m2} m²</span>
              </div>
            )}
            {property.year_built > 0 && (
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-sm text-latitud-gray">Año de construcción</span>
                <span className="text-sm font-medium text-latitud-black">{property.year_built}</span>
              </div>
            )}
          </div>

          {/* Value phrase */}
          {property.value_phrase && (
            <div className="mt-6 p-4 bg-latitud-orange/5 rounded-xl border border-latitud-orange/10">
              <p className="text-latitud-black text-sm font-medium italic">{property.value_phrase}</p>
            </div>
          )}
        </div>
      </div>

      {/* Similar properties */}
      {similar.length > 0 && (
        <div className="px-5 mt-8">
          <h3 className="font-heading text-lg text-latitud-black mb-1">Propiedades similares</h3>
          <p className="text-xs text-latitud-gray mb-4">Opciones que también pueden encajar contigo</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
            {similar.map(p => (
              <PropertyThumb key={p.id} property={p} matchPercentage={p._match} />
            ))}
          </div>
        </div>
      )}

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-4 flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-3 rounded-xl border-2 border-latitud-black text-latitud-black font-semibold text-sm"
        >
          Volver
        </button>
        <a
          href={buildPropertyWhatsAppUrl(property)}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-3 rounded-xl border-2 border-[#25D366] text-[#1ebe57] font-semibold text-sm flex items-center justify-center gap-1.5"
        >
          <MessageCircle size={15} />
          WhatsApp
        </a>
        <button
          onClick={() => setShowVisit(true)}
          className="flex-1 py-3 rounded-xl bg-latitud-orange text-white font-semibold text-sm flex items-center justify-center gap-2 accent-glow"
        >
          <Calendar size={16} />
          Solicitar visita de esta propiedad
        </button>
      </div>

      <VisitModal
        open={showVisit}
        onClose={() => setShowVisit(false)}
        property={property}
        clientId={clientId}
        clientName={clientName}
        onSubmit={() => setShowVisit(false)}
      />
    </div>
  );
}