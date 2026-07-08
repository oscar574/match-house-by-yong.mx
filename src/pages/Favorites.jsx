import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, Bed, Bath, Calendar, Maximize } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatPrice, calculateMatch } from '@/lib/matchEngine';
import { getCoverPhoto, getFallbackImage, getPropertyPhotos } from '@/lib/propertyImages';
import { countDuplicates } from '@/lib/duplicateDetection';
import LatitudLogo from '@/components/LatitudLogo';

export default function Favorites() {
  const navigate = useNavigate();
  const [likedProperties, setLikedProperties] = useState([]);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-latitud-light">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/discover')} className="p-1 -ml-1">
            <ArrowLeft size={22} className="text-latitud-black" />
          </button>
          <LatitudLogo size="sm" />
          <div className="w-8" />
        </div>
        <h1 className="font-heading text-2xl text-latitud-black">Mis favoritas</h1>
        <p className="text-sm text-latitud-gray">{likedProperties.length} propiedades guardadas</p>
      </div>

      {/* List */}
      <div className="px-4 py-4 space-y-4">
        {likedProperties.length === 0 ? (
          <div className="text-center py-16">
            <Heart size={40} className="text-latitud-gray/30 mx-auto mb-3" />
            <p className="text-latitud-gray text-sm">Aún no tienes propiedades favoritas.</p>
            <button onClick={() => navigate('/discover')} className="mt-4 bg-latitud-orange text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
              Descubrir propiedades
            </button>
          </div>
        ) : (
          likedProperties.map(property => {
            const propertyPhotos = getPropertyPhotos(property);
            return (
            <button 
              key={property.id} 
              onClick={() => navigate(`/property/${property.id}`)}
              className="w-full bg-white rounded-2xl overflow-hidden shadow-sm text-left"
            >
              <div className="relative h-48">
                <img src={propertyPhotos[0] || getCoverPhoto(property)} alt={property.title} onError={(e) => { e.target.src = getFallbackImage(property); }} className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3">
                  <span className="bg-latitud-orange text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    {property._matchPercentage}%
                  </span>
                </div>
                <div className="absolute top-3 left-3">
                  <span className="bg-white/90 text-latitud-black text-xs font-semibold px-2.5 py-1 rounded-full">
                    {property.operation_type}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-latitud-orange font-bold text-lg">{formatPrice(property.price, property.currency)}</p>
                <h3 className="font-heading text-base text-latitud-black leading-tight mb-1">{property.title}</h3>
                <div className="flex items-center gap-1 text-latitud-gray text-xs mb-2">
                  <MapPin size={12} />
                  <span>{property.zone}, {property.city}</span>
                </div>
                <div className="flex items-center gap-3 text-latitud-gray text-xs">
                  {property.bedrooms > 0 && <span className="flex items-center gap-1"><Bed size={12} /> {property.bedrooms}</span>}
                  {property.bathrooms > 0 && <span className="flex items-center gap-1"><Bath size={12} /> {property.bathrooms}</span>}
                  {property.construction_area > 0 && <span className="flex items-center gap-1"><Maximize size={12} /> {property.construction_area}m²</span>}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/property/${property.id}`); }}
                    className="flex-1 text-xs font-semibold py-2 rounded-xl border border-latitud-black text-latitud-black"
                  >
                    Ver detalle
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="flex-1 text-xs font-semibold py-2 rounded-xl bg-latitud-orange text-white flex items-center justify-center gap-1"
                  >
                    <Calendar size={12} /> Agendar
                  </button>
                </div>
              </div>
            </button>
          );
          })
        )}
      </div>
    </div>
  );
}