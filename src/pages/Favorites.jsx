import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, Bed, Bath, Calendar, Maximize, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatPriceExact, calculateMatch } from '@/lib/matchEngine';
import { getCoverPhoto, getFallbackImage, getPropertyPhotos } from '@/lib/propertyImages';
import VisitModal from '@/components/VisitModal';
import LatitudLogo from '@/components/LatitudLogo';

export default function Favorites() {
  const navigate = useNavigate();
  const [likedProperties, setLikedProperties] = useState([]);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visitProperty, setVisitProperty] = useState(null);

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
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-latitud-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-latitud-black">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 sticky top-0 bg-latitud-black/95 backdrop-blur-sm z-30">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate('/discover')} className="p-1 -ml-1">
            <ArrowLeft size={22} className="text-white" />
          </button>
          <LatitudLogo variant="white" size="sm" />
          <div className="w-8" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Heart size={18} className="text-latitud-orange" fill="currentColor" />
          <h1 className="font-heading text-2xl text-white">Mis favoritas</h1>
        </div>
        <p className="text-sm text-white/50">{likedProperties.length} propiedades guardadas</p>
      </div>

      {/* List */}
      <div className="px-4 py-4 space-y-4 pb-28">
        {likedProperties.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={40} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/50 text-sm mb-1">Aún no tienes propiedades favoritas.</p>
            <p className="text-white/30 text-xs mb-6">Toca el corazón en Discover para guardarlas aquí.</p>
            <button onClick={() => navigate('/discover')} className="bg-latitud-orange text-white px-6 py-3 rounded-xl text-sm font-semibold">
              Descubrir propiedades
            </button>
          </div>
        ) : (
          likedProperties.map(property => {
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
                <div className="absolute top-3 left-3">
                  <span className="bg-white/90 backdrop-blur-sm text-latitud-black text-xs font-semibold px-2.5 py-1 rounded-full">
                    {property.operation_type}
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
                    onClick={(e) => { e.stopPropagation(); setVisitProperty(property); }}
                    className="flex-1 text-xs font-semibold py-2.5 rounded-xl bg-latitud-orange text-white flex items-center justify-center gap-1.5"
                  >
                    <Calendar size={13} /> Agendar visita
                  </button>
                </div>
              </div>
            </div>
          );
          })
        )}
      </div>

      <VisitModal
        open={!!visitProperty}
        onClose={() => setVisitProperty(null)}
        property={visitProperty}
        clientId={localStorage.getItem('latitud_client_id')}
        clientName={localStorage.getItem('latitud_client_name')}
        onSubmit={() => setVisitProperty(null)}
      />
    </div>
  );
}