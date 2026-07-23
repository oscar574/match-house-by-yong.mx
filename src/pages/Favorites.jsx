import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, MapPin, Bed, Bath, Car, Maximize, Ruler, Trash2, Sparkles, Calendar, MessageCircle, Compass, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatPriceExact, calculateMatch } from '@/lib/matchEngine';
import { isBuyerVisible } from '@/lib/commissionRules';
import { getClientFavorites } from '@/lib/favoritesCount';
import { partitionByClientPreferences } from '@/lib/clientFilters';
import { buildPropertyWhatsAppUrl } from '@/lib/brandConfig';
import { getCoverPhoto, getFallbackImage } from '@/lib/propertyImages';
import TourRequestModal from '@/components/TourRequestModal';
import PropertyThumb from '@/components/PropertyThumb';
import BottomNav from '@/components/BottomNav';
import LatitudLogo from '@/components/LatitudLogo';
import { useToast } from '@/components/ui/use-toast';

export default function Favorites() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [likedProperties, setLikedProperties] = useState([]);
  const [dislikedProperties, setDislikedProperties] = useState([]);
  const [likedTotal, setLikedTotal] = useState(0);
  const [dislikedTotal, setDislikedTotal] = useState(0);
  const [unavailableLikedCount, setUnavailableLikedCount] = useState(0);
  const [alsoLike, setAlsoLike] = useState([]);
  const [curatedProperties, setCuratedProperties] = useState([]);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const { toast } = useToast();

  const activeTab = searchParams.get('tab') === 'disliked' ? 'disliked' : 'liked';

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const clientId = localStorage.getItem('latitud_client_id');
    if (!clientId) { setLoading(false); return; }

    const clientData = await base44.entities.Client.get(clientId);
    setClient(clientData);

    const fav = await getClientFavorites(clientId);

    // Clean up duplicate reactions (keep one per client+property) with
    // individual deletes — deleteMany is not part of the SDK.
    if (fav.duplicateReactionIds.length > 0) {
      await Promise.all(fav.duplicateReactionIds.map(rid =>
        base44.entities.Reaction.delete(rid).catch(err => console.error('Error al borrar reacción duplicada', rid, err))
      ));
    }

    // Sync the stored counters with the real unique totals so they never drift.
    if (clientData && (clientData.liked_count !== fav.likedIds.length || clientData.disliked_count !== fav.dislikedIds.length)) {
      try {
        const updated = await base44.entities.Client.update(clientId, {
          liked_count: fav.likedIds.length,
          disliked_count: fav.dislikedIds.length
        });
        setClient(prev => ({ ...prev, ...updated }));
      } catch (e) { /* ignore */ }
    }

    setLikedTotal(fav.likedIds.length);
    setDislikedTotal(fav.dislikedIds.length);

    const enrich = (p) => {
      const match = calculateMatch(p, clientData);
      return { ...p, _matchPercentage: match.percentage, _matchReason: match.reasonText, _available: isBuyerVisible(p) };
    };
    const sortByMatch = (a, b) => (b._matchPercentage || 0) - (a._matchPercentage || 0);

    // Render only available properties; track how many are no longer available.
    const likedAll = fav.likedProperties.map(enrich);
    const likedAvailable = likedAll.filter(p => p._available);
    setLikedProperties(likedAvailable.sort(sortByMatch));
    setUnavailableLikedCount(likedAll.length - likedAvailable.length);
    setDislikedProperties(fav.dislikedProperties.map(enrich).filter(p => p._available).sort(sortByMatch));

    // Recommendations — separate query by zone, independent from favorites list.
    const available = await base44.entities.Property.filter({ status: 'Disponible' });
    const { inZone } = partitionByClientPreferences(available, clientData);
    const also = inZone
      .filter(p => !fav.likedIds.includes(p.id) && !fav.dislikedIds.includes(p.id))
      .map(p => ({ ...p, _match: calculateMatch(p, clientData).percentage }))
      .sort((a, b) => (b._match || 0) - (a._match || 0))
      .slice(0, 8);
    setAlsoLike(also);

    // Selección del asesor — fetched directly by ID, in saved order.
    const curatedIds = clientData?.curated_property_ids || [];
    if (curatedIds.length > 0) {
      const curatedFetched = await base44.entities.Property.filter({ id: { $in: curatedIds } });
      const propMap = Object.fromEntries(curatedFetched.map(p => [p.id, p]));
      setCuratedProperties(curatedIds.map(id => propMap[id]).filter(Boolean));
    } else {
      setCuratedProperties([]);
    }

    setLoading(false);
  };

  const removeFavorite = async (property) => {
    const clientId = localStorage.getItem('latitud_client_id');
    if (!clientId) return;
    try {
      // Delete ALL 'like' reactions for this client+property so duplicates
      // don't make the property reappear.
      const likeReactions = await base44.entities.Reaction.filter({ client_id: clientId, property_id: property.id, reaction_type: 'like' });
      await Promise.all(likeReactions.map(r =>
        base44.entities.Reaction.delete(r.id).catch(err => console.error('Error al borrar reacción like', r.id, err))
      ));
      const c = client;
      await base44.entities.Client.update(clientId, {
        liked_count: Math.max(0, (c?.liked_count || 1) - 1),
        favorite_property_ids: (c?.favorite_property_ids || []).filter(pid => pid !== property.id)
      });
      toast({ title: 'Propiedad eliminada de tu selección.' });
      loadFavorites();
    } catch (e) { /* ignore */ }
  };

  const moveToLiked = async (property) => {
    const clientId = localStorage.getItem('latitud_client_id');
    if (!clientId) return;
    try {
      const dislikeReactions = await base44.entities.Reaction.filter({ client_id: clientId, property_id: property.id, reaction_type: 'dislike' });
      await Promise.all(dislikeReactions.map(r =>
        base44.entities.Reaction.delete(r.id).catch(err => console.error('Error al borrar reacción dislike', r.id, err))
      ));
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
      const c = client;
      await base44.entities.Client.update(clientId, {
        liked_count: (c?.liked_count || 0) + 1,
        disliked_count: Math.max(0, (c?.disliked_count || 1) - 1),
        favorite_property_ids: [...(c?.favorite_property_ids || []), property.id].slice(-50),
        rejected_property_ids: (c?.rejected_property_ids || []).filter(pid => pid !== property.id)
      });
      toast({ title: 'Propiedad movida a tu selección.' });
      loadFavorites();
    } catch (e) { /* ignore */ }
  };

  const switchTab = (tab) => {
    if (tab === 'disliked') setSearchParams({ tab: 'disliked' });
    else setSearchParams({});
  };

  const renderCard = (property, isDisliked) => {
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
            {property.parking_spaces > 0 && <span className="flex items-center gap-1"><Car size={13} /> {property.parking_spaces}</span>}
            {(property.construction_area || property.construction_m2) > 0 && <span className="flex items-center gap-1"><Maximize size={13} /> {property.construction_area || property.construction_m2} m²</span>}
            {(property.land_area || property.land_m2) > 0 && <span className="flex items-center gap-1"><Ruler size={13} /> {property.land_area || property.land_m2} m²</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/property/${property.id}`); }}
              className="flex-1 text-xs font-semibold py-2.5 rounded-xl border border-white/20 text-white"
            >
              Ver detalle
            </button>
            <a
              href={buildPropertyWhatsAppUrl(property)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3 text-xs font-semibold py-2.5 rounded-xl bg-[#25D366] text-white flex items-center justify-center gap-1.5"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
            {isDisliked ? (
              <button
                onClick={(e) => { e.stopPropagation(); moveToLiked(property); }}
                title="Mover a favoritos"
                className="px-3 text-xs font-semibold py-2.5 rounded-xl bg-latitud-orange text-white flex items-center justify-center"
              >
                <Heart size={14} />
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); removeFavorite(property); }}
                className="px-3 text-xs font-semibold py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-red-300 hover:border-red-300/30 transition-colors flex items-center justify-center"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-latitud-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  const atLimit = likedTotal >= 20;

  return (
    <div className="min-h-screen bg-latitud-black pb-28">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 sticky top-0 bg-latitud-black/95 backdrop-blur-sm z-30">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/discover')} className="p-1 -ml-1">
            <Heart size={22} className="text-white" />
          </button>
          <LatitudLogo variant="white" size="sm" />
          <div className="w-8" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Heart size={18} className="text-latitud-orange" fill="currentColor" />
          <h1 className="font-heading text-2xl text-white">{activeTab === 'disliked' ? 'No me interesan' : 'Mi selección'}</h1>
        </div>
        <p className="text-sm text-white/50 leading-snug">
          {activeTab === 'disliked'
            ? 'Propiedades que descartaste. Puedes devolverlas a tu selección cuando quieras.'
            : likedProperties.length > 0
              ? 'Estas son las propiedades que más encajan contigo. Tu asesor podrá ayudarte a organizar un recorrido.'
              : 'Aún no tienes propiedades guardadas.'}
        </p>
      </div>

      {activeTab === 'liked' && unavailableLikedCount > 0 && (
        <p className="px-4 pt-1 text-xs text-white/40">{unavailableLikedCount} propiedades que guardaste ya no están publicadas. Tu asesor puede confirmarte si siguen a la venta.</p>
      )}

      {/* Tabs */}
      <div className="px-4 pt-2 pb-1">
        <div className="flex gap-2">
          <button
            onClick={() => switchTab('liked')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${activeTab === 'liked' ? 'bg-latitud-orange text-white' : 'bg-white/[0.06] text-white/50 border border-white/10'}`}
          >
            Me gustan {likedProperties.length > 0 ? `· ${likedProperties.length}` : ''}
          </button>
          <button
            onClick={() => switchTab('disliked')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${activeTab === 'disliked' ? 'bg-latitud-orange text-white' : 'bg-white/[0.06] text-white/50 border border-white/10'}`}
          >
            No me interesan {dislikedProperties.length > 0 ? `· ${dislikedProperties.length}` : ''}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-4 space-y-4">
        {/* Selección de tu asesor — always visible, independent of swipes */}
        {curatedProperties.length > 0 && (
          <div className="bg-[#C9A45C]/10 border border-[#C9A45C]/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Star size={16} className="text-[#C9A45C]" fill="currentColor" />
              <h3 className="font-heading text-base text-white">Selección de tu asesor</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
              {curatedProperties.map(p => (
                <PropertyThumb key={p.id} property={p} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'liked' && (
          <>
            {/* Profile summary + tour request */}
            {likedProperties.length > 0 && client && (
              <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/10">
                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                  <div>
                    <span className="text-[11px] text-white font-semibold leading-tight block">{client.budget_range || '—'}</span>
                    <span className="text-[9px] text-white/40">Presupuesto</span>
                  </div>
                  <div>
                    <MapPin size={14} className="text-latitud-orange mx-auto mb-0.5" />
                    <span className="text-[11px] text-white font-semibold leading-tight block truncate">{(client.favorite_zones || []).slice(0, 2).join(', ') || '—'}</span>
                    <span className="text-[9px] text-white/40">Zonas</span>
                  </div>
                  <div>
                    <Heart size={14} className="text-latitud-orange mx-auto mb-0.5" />
                    <span className="text-[11px] text-white font-semibold leading-tight block">{likedProperties.length} guardadas</span>
                    <span className="text-[9px] text-white/40">Selección</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowTour(true)}
                  className="w-full mt-1 py-3 rounded-xl bg-latitud-orange text-white font-semibold text-sm flex items-center justify-center gap-2 accent-glow"
                >
                  <Calendar size={16} /> Solicitar recorrido
                </button>
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
                {likedProperties.map(property => renderCard(property, false))}
              </>
            )}
          </>
        )}

        {activeTab === 'disliked' && (
          <>
            {dislikedProperties.length === 0 ? (
              <div className="text-center py-20">
                <Heart size={40} className="text-white/20 mx-auto mb-3" />
                <p className="text-white/70 text-base mb-2">No has descartado propiedades.</p>
                <p className="text-white/40 text-sm mb-6 max-w-xs mx-auto">
                  Las propiedades que descartes aparecerán aquí y podrás devolverlas a tu selección.
                </p>
                <button onClick={() => navigate('/discover')} className="bg-latitud-orange text-white px-6 py-3 rounded-xl text-sm font-semibold">
                  Descubrir propiedades
                </button>
              </div>
            ) : (
              dislikedProperties.map(property => renderCard(property, true))
            )}
          </>
        )}

        {/* También te pueden gustar — in-zone recommendations */}
        {activeTab === 'liked' && alsoLike.length > 0 && (
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

        {activeTab === 'liked' && likedProperties.length === 0 && (
          <div className="pt-6">
            <button onClick={() => navigate('/discover')} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 text-white/70 font-medium text-sm">
              <Compass size={15} /> Seguir explorando
            </button>
          </div>
        )}
      </div>

      <TourRequestModal
        open={showTour}
        onClose={() => setShowTour(false)}
        properties={likedProperties}
        client={client}
        clientId={localStorage.getItem('latitud_client_id')}
        onSubmit={() => setShowTour(false)}
      />
      <BottomNav />
    </div>
  );
}