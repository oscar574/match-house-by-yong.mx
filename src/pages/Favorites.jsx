import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, Bed, Bath, Maximize, Trash2, Sparkles, Calendar, Compass, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatPriceExact, calculateMatch } from '@/lib/matchEngine';
import { getCoverPhoto, getFallbackImage } from '@/lib/propertyImages';
import TourRequestModal from '@/components/TourRequestModal';
import PropertyThumb from '@/components/PropertyThumb';
import LatitudLogo from '@/components/LatitudLogo';

const similarityScore = (p, client) => {
  let s = 0;
  if (client?.favorite_zones?.includes(p.zone)) s += 3;
  const maxB = client?.budget_max_estimated || 0;
  if (maxB > 0 && p.price <= maxB) s += 2;
  if (client?.preferred_bedrooms && p.bedrooms === client.preferred_bedrooms) s += 2;
  const feats = client?.important_features || [];
  (p.amenities || []).forEach(a => {
    if (feats.some(f => a.toLowerCase().includes(f.toLowerCase()))) s += 1;
  });
  return s;
};

export default function Favorites() {
  const navigate = useNavigate();
  const [likedProperties, setLikedProperties] = useState([]);
  const [alsoLike, setAlsoLike] = useState([]);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const clientId = localStorage.getItem('latitud_client_id');
    if (!clientId) { setLoading(false); return; }

    const [clientData, reactions, allProps] = await Promise.all([
      base44.entities.Client.get(clientId),
      base44.entities.Reaction.filter({ client_id: clientId, reaction_type: 'like' }),
      base44.entities.Property.filter({ status: 'Disponible' })
    ]);

    setClient(clientData);
    const likedIds = reactions.map(r => r.property_id);
    const liked = allProps.filter(p => likedIds.includes(p.id) && p.is_duplicate !== true).map(p => {
      const match = calculateMatch(p, clientData);
      return { ...p, _matchPercentage: match.percentage, _matchReason: match.reasonText };
    }).sort((a, b) => b._matchPercentage - a._matchPercentage);

    setLikedProperties(liked);

    const also = allProps
      .filter(p => !likedIds.includes(p.id) && p.is_duplicate !== true)
      .map(p => ({ ...p, _sim: similarityScore(p, clientData), _match: calculateMatch(p, clientData).percentage }))
      .sort((a, b) => b._sim - a._sim || b._match - a._match)
      .slice(0, 6);
    setAlsoLike(also);

    setLoading(false);
  };

  const removeFavorite = async (property) => {
    const clientId = localStorage.getItem('latitud_client_id');
    if (!clientId) return;
    try {
      const likeReactions = await base44.entities.Reaction.filter({ client_id: clientId, property_id: property.id, reaction_type: 'like' });
      if (likeReactions.length > 0) {
        await base44.entities.Reaction.delete(likeReactions[0].id);
      }
      const c = client;
      await base44.entities.Client.update(clientId, {
        liked_count: Math.max(0, (c?.liked_count || 1) - 1),
        favorite_property_ids: (c?.favorite_property_ids || []).filter(pid => pid !== property.id)
      });
      loadFavorites();
    } catch (e) { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-latitud-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  const atLimit = likedProperties.length >= 20;

  return (
    <div className="min-h-screen bg-latitud-black">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 sticky top-0 bg-latitud-black/95 backdrop-blur-sm z-30">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/discover')} className="p-1 -ml-1">
            <ArrowLeft size={22} className="text-white" />
          </button>
          <LatitudLogo variant="white" size="sm" />
          <div className="w-8" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Heart size={18} className="text-latitud-orange" fill="currentColor" />
          <h1 className="font-heading text-2xl text-white">Mi selección</h1>
        </div>
        <p className="text-sm text-white/50 leading-snug">
          {likedProperties.length > 0
            ? 'Estas son las propiedades que más encajan contigo. Tu asesor podrá ayudarte a organizar un recorrido.'
            : 'Aún no tienes propiedades guardadas.'}
        </p>
      </div>

      {/* List */}
      <div className="px-4 py-4 space-y-4 pb-36">
        {/* Profile summary */}
        {likedProperties.length > 0 && client && (
          <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/10">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <DollarSign size={14} className="text-latitud-orange mx-auto mb-1" />
                <p className="text-[11px] text-white font-semibold leading-tight">{client.budget_range || '—'}</p>
                <p className="text-[9px] text-white/40">Presupuesto</p>
              </div>
              <div>
                <MapPin size={14} className="text-latitud-orange mx-auto mb-1" />
                <p className="text-[11px] text-white font-semibold leading-tight truncate">{(client.favorite_zones || []).slice(0, 2).join(', ') || '—'}</p>
                <p className="text-[9px] text-white/40">Zonas</p>
              </div>
              <div>
                <Heart size={14} className="text-latitud-orange mx-auto mb-1" />
                <p className="text-[11px] text-white font-semibold leading-tight">{likedProperties.length} guardadas</p>
                <p className="text-[9px] text-white/40">Selección</p>
              </div>
            </div>
          </div>
        )}

        {likedProperties.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={40} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/70 text-base mb-2">Tu selección está vacía.</p>
            <p className="text-white/40 text-sm mb-6 max-w-xs mx-auto">
              Guarda las casas que te gusten y solicita un recorrido cuando estés listo.
            </p>
            <button onClick={() => navigate('/discover')} className="bg-latitud-orange text-white px-6 py-3 rounded-xl text-sm font-semibold">
              Descubrir propiedades
            </button>
          </div>
        ) : (
          <>
            {atLimit && (
              <div className="bg-[#E6D3A3]/15 border border-[#C9A45C]/30 rounded-xl p-3 text-center">
                <p className="text-[11px] text-[#E6D3A3]">Ya tienes 20 propiedades guardadas. Elimina alguna para agregar nuevas opciones.</p>
              </div>
            )}
            {likedProperties.map(property => {
              const cover = getCoverPhoto(property);
              return (
                <div
                  key={property.id}
                  onClick={() => navigate(`/property/${property.id}`)}
                  className="bg-white/[0.04] rounded-2xl overflow-hidden border border-white/10 cursor-pointer hover:border-white/20 transition-colors"
                >
                  <div className="relative h-52">
                    <img
                      src={cover}
                      alt={property.title}
                      onError={(e) => { e.target.src = getFallbackImage(property); }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute top-3 right-3">
                      <span className="bg-latitud-orange text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                        {property._matchPercentage}% match
                      </span>
                    </div>
                    {property._matchReason && (
                      <div className="absolute bottom-3 left-3 right-3 flex items-start gap-1.5 bg-black/40 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
                        <Sparkles size={12} className="text-latitud-orange mt-0.5 shrink-0" />
                        <p className="text-white/90 text-[11px] leading-snug">{property._matchReason}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-latitud-orange font-bold text-lg mb-1">{formatPriceExact(property.price, property.currency)}</p>
                    <h3 className="font-heading text-base text-white leading-tight mb-1.5">{property.title}</h3>
                    <div className="flex items-center gap-1 text-white/50 text-xs mb-3">
                      <MapPin size={12} />
                      <span>{property.zone}, {property.city}</span>
                    </div>
                    <div className="flex items-center gap-4 text-white/70 text-xs mb-4">
                      {property.bedrooms > 0 && <span className="flex items-center gap-1"><Bed size={13} /> {property.bedrooms}</span>}
                      {property.bathrooms > 0 && <span className="flex items-center gap-1"><Bath size={13} /> {property.bathrooms}</span>}
                      {property.construction_area > 0 && <span className="flex items-center gap-1"><Maximize size={13} /> {property.construction_area} m²</span>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/property/${property.id}`); }}
                        className="flex-1 text-xs font-semibold py-2.5 rounded-xl border border-white/20 text-white"
                      >
                        Ver detalle
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFavorite(property); }}
                        className="px-4 text-xs font-semibold py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-red-300 hover:border-red-300/30 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Trash2 size={14} /> Quitar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* También te pueden gustar */}
        {alsoLike.length > 0 && (
          <div className="pt-6">
            <h3 className="font-heading text-lg text-white mb-1">También te pueden gustar</h3>
            <p className="text-xs text-white/40 mb-4">Basado en tus zonas, presupuesto y preferencias</p>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
              {alsoLike.map(p => (
                <PropertyThumb key={p.id} property={p} matchPercentage={p._match} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      {likedProperties.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-latitud-black/95 backdrop-blur-sm border-t border-white/10 px-4 py-3 flex gap-3 z-40">
          <button
            onClick={() => navigate('/discover')}
            className="px-4 py-3 rounded-xl border border-white/20 text-white/80 font-semibold text-sm flex items-center gap-1.5"
          >
            <Compass size={15} /> Seguir explorando
          </button>
          <button
            onClick={() => setShowTour(true)}
            className="flex-1 py-3 rounded-xl bg-latitud-orange text-white font-semibold text-sm flex items-center justify-center gap-2 accent-glow"
          >
            <Calendar size={16} /> Solicitar recorrido
          </button>
        </div>
      )}

      <TourRequestModal
        open={showTour}
        onClose={() => setShowTour(false)}
        properties={likedProperties}
        client={client}
        clientId={localStorage.getItem('latitud_client_id')}
        onSubmit={() => setShowTour(false)}
      />
    </div>
  );
}