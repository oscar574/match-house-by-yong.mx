import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Calendar, Share2, Bed, Bath, Car, Maximize, MapPin, ChevronLeft, ChevronRight, Sparkles, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatPriceExact, calculateMatch } from '@/lib/matchEngine';
import { getPropertyPhotos, getFallbackImage } from '@/lib/propertyImages';
import VisitModal from '@/components/VisitModal';

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

          // Register a view reaction (for tracking)
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

          // Check if already favorite
          const favs = await base44.entities.Reaction.filter({ client_id: clientId, property_id: p.id, reaction_type: 'like' });
          if (cancelled) return;
          setIsFavorite(favs.length > 0);
        } catch (e) { /* ignore */ }
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const toggleFavorite = async () => {
    const clientId = localStorage.getItem('latitud_client_id');
    if (!clientId || !property) return;
    if (isFavorite) {
      setIsFavorite(false);
    } else {
      setIsFavorite(true);
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
        const updates = {
          liked_count: (client.liked_count || 0) + 1,
          last_activity_date: new Date().toISOString(),
          favorite_property_ids: [...(client.favorite_property_ids || []), property.id].slice(-50)
        };
        await base44.entities.Client.update(clientId, updates);
      }
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

  const photos = getPropertyPhotos(property);
  const clientId = localStorage.getItem('latitud_client_id');
  const clientName = localStorage.getItem('latitud_client_name');

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Photo gallery */}
      <div className="relative h-[60vh]">
        <img
          src={photos[photoIndex] || getFallbackImage(property)}
          alt={property.title}
          onError={(e) => { e.target.src = getFallbackImage(property); }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <Share2 size={18} className="text-white" />
            </button>
            <button onClick={toggleFavorite} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <Heart size={18} className="text-white" fill={isFavorite ? '#FF7A00' : 'none'} stroke={isFavorite ? '#FF7A00' : 'white'} />
            </button>
          </div>
        </div>

        {/* Operation badge */}
        <div className="absolute top-24 left-4">
          <span className="bg-latitud-orange text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
            {property.operation_type}
          </span>
        </div>

        {/* Match badge */}
        {matchData && (
          <div className="absolute top-24 right-4">
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
                <button key={i} onClick={() => setPhotoIndex(i)} className={`h-1.5 rounded-full transition-all ${i === photoIndex ? 'w-6 bg-white' : 'w-3 bg-white/40'}`} />
              ))}
            </div>
            <button onClick={() => setPhotoIndex(i => Math.max(0, i - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/20 rounded-full backdrop-blur-sm">
              <ChevronLeft size={20} className="text-white" />
            </button>
            <button onClick={() => setPhotoIndex(i => Math.min(photos.length - 1, i + 1))} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/20 rounded-full backdrop-blur-sm">
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
            {property.construction_area > 0 && (
              <div className="bg-latitud-light rounded-xl p-3 text-center">
                <Maximize size={18} className="text-latitud-orange mx-auto mb-1" />
                <p className="text-sm font-semibold text-latitud-black">{property.construction_area}</p>
                <p className="text-[10px] text-latitud-gray">m² const.</p>
              </div>
            )}
            {property.parking_spaces > 0 && (
              <div className="bg-latitud-light rounded-xl p-3 text-center">
                <Car size={18} className="text-latitud-orange mx-auto mb-1" />
                <p className="text-sm font-semibold text-latitud-black">{property.parking_spaces}</p>
                <p className="text-[10px] text-latitud-gray">Estac.</p>
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

          {/* Extra details */}
          <div className="space-y-0 mb-2">
            {property.land_area > 0 && (
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-sm text-latitud-gray">Terreno</span>
                <span className="text-sm font-medium text-latitud-black">{property.land_area} m²</span>
              </div>
            )}
            {property.construction_area > 0 && (
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-sm text-latitud-gray">Construcción</span>
                <span className="text-sm font-medium text-latitud-black">{property.construction_area} m²</span>
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

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-4 flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-3 rounded-xl border-2 border-latitud-black text-latitud-black font-semibold text-sm"
        >
          Volver
        </button>
        <button
          onClick={() => setShowVisit(true)}
          className="flex-1 py-3 rounded-xl bg-latitud-orange text-white font-semibold text-sm flex items-center justify-center gap-2 accent-glow"
        >
          <Calendar size={16} />
          Agendar visita
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