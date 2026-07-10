import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Calendar, Info, Sparkles, SlidersHorizontal } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PropertyCard from '@/components/PropertyCard';
import PropertyCarousel from '@/components/PropertyCarousel';
import DislikeModal from '@/components/DislikeModal';
import VisitModal from '@/components/VisitModal';
import InsightModal from '@/components/InsightModal';
import SearchPreferencesModal from '@/components/SearchPreferencesModal';
import BottomNav from '@/components/BottomNav';
import LatitudLogo from '@/components/LatitudLogo';
import { calculateMatch } from '@/lib/matchEngine';
import { isBuyerVisible } from '@/lib/commissionRules';
import { partitionByClientPreferences } from '@/lib/clientFilters';
import { addLeadScore, ensureLeadTask } from '@/lib/leadScoring';
import { countDuplicates } from '@/lib/duplicateDetection';
import { useToast } from '@/components/ui/use-toast';

export default function Discover() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDislike, setShowDislike] = useState(false);
  const [showVisit, setShowVisit] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [reactionCount, setReactionCount] = useState(0);
  const [direction, setDirection] = useState(0);
  const [leadScore, setLeadScore] = useState(0);
  const { toast } = useToast();

  // Progressive loading refs
  const [loadEpoch, setLoadEpoch] = useState(0);
  const reactedIdsRef = useRef(new Set());
  const fetchedIdsRef = useRef(new Set());
  const exhaustedRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const emptyStreakRef = useRef(0);
  const clientRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  // Enrich visible, not-yet-reacted, non-duplicate properties with match score.
  // Zone / budget / operation / bedrooms hard filtering happens later in
  // partitionByClientPreferences — the match score only orders within that subset.
  const enrichAndFilter = (items, clientData) => {
    let avail = items.filter(isBuyerVisible);
    avail = avail.filter(p => !reactedIdsRef.current.has(p.id));
    avail = avail.filter(p => p.is_duplicate !== true);
    if (clientData) {
      avail = avail.map(p => {
        const match = calculateMatch(p, clientData);
        return { ...p, _matchPercentage: match.percentage, _matchReason: match.reasonText };
      });
    }
    avail.sort((a, b) => (b._matchPercentage || 0) - (a._matchPercentage || 0));
    return avail;
  };

  const loadData = async () => {
    const clientId = localStorage.getItem('latitud_client_id');
    let clientData = null;

    if (clientId) {
      try {
        clientData = await base44.entities.Client.get(clientId);
        setClient(clientData);
        setLeadScore(clientData.lead_score || 0);
      } catch (e) { /* ignore */ }
    }
    clientRef.current = clientData;

    let reactedIds = [];
    if (clientId) {
      const reactions = await base44.entities.Reaction.filter({ client_id: clientId });
      reactedIds = reactions.map(r => r.property_id);
    }
    reactedIdsRef.current = new Set(reactedIds);

    const first = await base44.entities.Property.list('-created_date', 50);
    first.forEach(p => fetchedIdsRef.current.add(p.id));
    exhaustedRef.current = first.length < 50;
    countDuplicates(first);

    const deck = enrichAndFilter(first, clientData);
    setProperties(deck);
    setCurrentIndex(0);
    setLoading(false);
  };

  const loadMore = async () => {
    if (loadingMoreRef.current || exhaustedRef.current) return;
    if (fetchedIdsRef.current.size === 0) { setLoadEpoch(e => e + 1); return; }
    loadingMoreRef.current = true;
    try {
      const more = await base44.entities.Property.filter(
        { id: { $nin: Array.from(fetchedIdsRef.current) } },
        '-created_date',
        50
      );
      if (more.length === 0) {
        exhaustedRef.current = true;
      } else {
        more.forEach(p => fetchedIdsRef.current.add(p.id));
        if (more.length < 50) exhaustedRef.current = true;
        const newDeck = enrichAndFilter(more, clientRef.current);
        if (newDeck.length > 0) {
          emptyStreakRef.current = 0;
          setProperties(prev => [...prev, ...newDeck]);
        } else {
          emptyStreakRef.current += 1;
          if (emptyStreakRef.current >= 10) exhaustedRef.current = true;
        }
      }
    } catch (e) { /* ignore transient */ }
    loadingMoreRef.current = false;
    setLoadEpoch(e => e + 1);
  };

  // Hard partition by client preferences (zones + budget + operation + bedrooms).
  const partitioned = useMemo(() => partitionByClientPreferences(properties, client), [properties, client]);
  const inZone = partitioned.inZone;
  const outOfZone = partitioned.outOfZone;

  // Auto-load next batch when fewer than 10 in-zone cards remain in the deck.
  useEffect(() => {
    if (loading) return;
    const remaining = inZone.length - currentIndex;
    if (remaining < 10 && !exhaustedRef.current && !loadingMoreRef.current) {
      loadMore();
    }
  }, [currentIndex, inZone.length, loading, loadEpoch]);

  const currentProperty = inZone[currentIndex];

  // Carousels — only in-zone properties (hard filter). No English subtitles.
  const carousels = useMemo(() => {
    const pool = inZone;
    if (pool.length === 0) return [];
    const budgetMax = client?.budget_max_estimated || null;
    const recommended = [...pool].sort((a, b) => (b._matchPercentage || 0) - (a._matchPercentage || 0)).slice(0, 20);
    const newMatches = [...pool].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 20);
    const inBudget = budgetMax ? pool.filter(p => p.price <= budgetMax).slice(0, 20) : pool.slice(0, 20);
    const familyHomes = pool.filter(p => (p.bedrooms || 0) >= 3).slice(0, 20);
    const withPool = pool.filter(p => p.amenities?.some(a => a.toLowerCase().includes('alberca') || a.toLowerCase().includes('piscina'))).slice(0, 20);
    const investments = pool.filter(p => p.rental_potential || (p.investment_profile && p.investment_profile !== 'N/A')).slice(0, 20);

    return [
      { title: 'Tu match perfecto', properties: recommended },
      { title: 'Recién llegadas', properties: newMatches },
      { title: 'Dentro de tu presupuesto', properties: inBudget },
      { title: 'Joyas de tu zona', properties: recommended },
      { title: 'Para toda la familia', properties: familyHomes },
      { title: 'Con alberca', properties: withPool },
      { title: 'Ideales para invertir', properties: investments }
    ].filter(c => c.properties.length > 0);
  }, [inZone, client]);

  const showOutOfZone = inZone.length < 10 && outOfZone.length > 0;

  const handleReaction = async (type, extra = {}) => {
    if (!currentProperty) return;
    const clientId = localStorage.getItem('latitud_client_id');
    if (!clientId) return;

    if (type === 'like' && (client?.liked_count || 0) >= 20) {
      toast({ title: 'Límite alcanzado', description: 'Ya tienes 20 propiedades guardadas. Elimina alguna para agregar nuevas opciones.' });
      return;
    }

    await base44.entities.Reaction.create({
      client_id: clientId,
      property_id: currentProperty.id,
      reaction_type: type,
      property_title: currentProperty.title,
      property_zone: currentProperty.zone,
      property_city: currentProperty.city,
      property_price: currentProperty.price,
      property_type: currentProperty.property_type,
      ...extra
    });
    reactedIdsRef.current.add(currentProperty.id);

    const updates = { last_activity_date: new Date().toISOString() };
    let action = null;
    let bonusAction = null;
    if (type === 'like') {
      const newLiked = (client?.liked_count || 0) + 1;
      updates.liked_count = newLiked;
      action = 'SAVE_FAVORITE';
      if (newLiked === 3) bonusAction = 'SAVE_3_FAVORITES';
      if (newLiked === 5) bonusAction = 'SAVE_5_FAVORITES';
    }
    if (type === 'dislike') {
      updates.disliked_count = (client?.disliked_count || 0) + 1;
    }
    if (type === 'visit_request') {
      updates.visit_requests_count = (client?.visit_requests_count || 0) + 1;
      action = 'REQUEST_VISIT';
    }

    const hasVisit = (client?.visit_requests_count || 0) > 0 || type === 'visit_request';
    const { score: newScore, status: newStatus } = addLeadScore(leadScore, action, hasVisit);
    updates.lead_score = newScore;
    updates.buyer_intent_score = newScore;
    updates.lead_status = newStatus;
    setLeadScore(newScore);

    if (bonusAction) {
      const b = addLeadScore(updates.lead_score, bonusAction, hasVisit);
      updates.lead_score = b.score;
      updates.buyer_intent_score = b.score;
      updates.lead_status = b.status;
      setLeadScore(b.score);
    }

    if (type === 'like') {
      toast({ title: 'Agregada a tu selección.' });
      const newLiked = (client?.liked_count || 0) + 1;
      if (newLiked === 3) {
        toast({ title: 'Ya tienes varias propiedades guardadas.', description: 'Puedes solicitar un recorrido cuando quieras.' });
      }
    }

    if (type === 'like' && client?.favorite_property_ids) {
      if (!client.favorite_property_ids.includes(currentProperty.id)) {
        updates.favorite_property_ids = [...client.favorite_property_ids, currentProperty.id].slice(-50);
      }
    }
    if (type === 'dislike' && client?.rejected_property_ids) {
      if (!client.rejected_property_ids.includes(currentProperty.id)) {
        updates.rejected_property_ids = [...client.rejected_property_ids, currentProperty.id].slice(-50);
      }
    }

    const updated = await base44.entities.Client.update(clientId, updates);
    setClient(prev => ({ ...prev, ...updates, favorite_property_ids: updates.favorite_property_ids || prev?.favorite_property_ids, rejected_property_ids: updates.rejected_property_ids || prev?.rejected_property_ids }));
    clientRef.current = { ...clientRef.current, ...updates };

    if (type === 'like' && ((client?.liked_count || 0) + 1) === 3) {
      ensureLeadTask({ clientId, clientName: client?.name, advisor: client?.assigned_advisor, title: `Cliente guardó 3 propiedades — enviar recomendaciones`, taskType: 'Enviar propiedades', priority: 'Media' });
    }

    const newCount = reactionCount + 1;
    setReactionCount(newCount);
    if (newCount % 5 === 0 && newCount > 0) setShowInsight(true);

    setDirection(type === 'like' || type === 'visit_request' ? 1 : -1);
    setCurrentIndex(i => i + 1);
  };

  const handleDislike = () => setShowDislike(true);
  const handleLike = () => handleReaction('like');
  const handleVisit = () => setShowVisit(true);

  const onPrefsSaved = async () => {
    // Refetch the client so the hard filters (zones/budget/operation/bedrooms)
    // re-apply immediately, and reset the deck to the top.
    const clientId = localStorage.getItem('latitud_client_id');
    if (clientId) {
      try {
        const c = await base44.entities.Client.get(clientId);
        setClient(c);
        clientRef.current = c;
        setLeadScore(c.lead_score || 0);
      } catch (e) { /* ignore */ }
    }
    setCurrentIndex(0);
    setDirection(0);
    toast({ title: 'Preferencias actualizadas', description: 'Tu búsqueda se refiltró.' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-latitud-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  const noMore = currentIndex >= inZone.length;
  const hasSwipable = !noMore && currentProperty;

  return (
    <div className="min-h-screen bg-latitud-black pb-28">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-center justify-between sticky top-0 bg-latitud-black/95 backdrop-blur-sm z-30">
        <LatitudLogo variant="white" size="sm" />
        <div className="flex items-center gap-3">
          <button onClick={() => setShowPrefs(true)} className="text-white/60 hover:text-latitud-orange transition-colors">
            <SlidersHorizontal size={20} />
          </button>
          <button onClick={() => navigate('/favorites')} className="text-white/60 hover:text-latitud-orange transition-colors relative">
            <Heart size={20} />
            {client?.liked_count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-latitud-orange text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {client.liked_count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hero swipe deck */}
      {hasSwipable ? (
        <div className="px-4 pb-2 relative">
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles size={16} className="text-latitud-orange" />
              <h2 className="font-heading text-xl text-white">Tu match perfecto</h2>
            </div>
            <p className="text-white/40 text-xs ml-6">Desliza para ver más · Toca el corazón para guardar</p>
          </div>
          <div className="relative min-h-[60vh]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: direction > 0 ? 100 : -100, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: direction > 0 ? -100 : 100, scale: 0.95 }}
                transition={{ duration: 0.35 }}
                className="h-full min-h-[60vh]"
              >
                <PropertyCard
                  property={currentProperty}
                  matchPercentage={currentProperty._matchPercentage}
                  matchReason={currentProperty._matchReason}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Action buttons */}
          <div className="px-4 pb-6 pt-4">
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleDislike}
                className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10"
              >
                <X size={24} className="text-white/70" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleLike}
                className="w-16 h-16 rounded-full bg-latitud-orange flex items-center justify-center shadow-lg accent-glow"
              >
                <Heart size={28} className="text-latitud-black" fill="#050505" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleVisit}
                className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10"
              >
                <Calendar size={22} className="text-white/70" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(`/property/${currentProperty.id}`)}
                className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10"
              >
                <Info size={22} className="text-white/70" />
              </motion.button>
            </div>
            <div className="flex items-center justify-center gap-8 mt-3 text-[10px] text-white/30 tracking-wider uppercase">
              <span className="w-14 text-center">Descartar</span>
              <span className="w-16 text-center">Guardar</span>
              <span className="w-14 text-center">Agendar</span>
              <span className="w-14 text-center">Detalles</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-latitud-orange/10 flex items-center justify-center mb-4 mx-auto">
            <Heart size={28} className="text-latitud-orange" />
          </div>
          <h3 className="font-heading text-xl text-white mb-2">Has visto todas las propiedades de tu zona</h3>
          <p className="text-white/50 text-sm mb-6">Estamos buscando más opciones para ti. Ajusta tus preferencias para ver otras zonas.</p>
          <div className="flex flex-col items-center gap-3">
            <button onClick={() => setShowPrefs(true)} className="bg-latitud-orange text-white font-semibold px-8 py-3 rounded-xl">Ajustar preferencias</button>
            <button onClick={() => navigate('/favorites')} className="text-white/70 font-medium px-8 py-3 rounded-xl border border-white/20">Ver mis favoritas</button>
          </div>
        </div>
      )}

      {/* Netflix-style carousels (in-zone only) */}
      <div className="pt-4">
        {carousels.map((c, i) => (
          <PropertyCarousel key={i} title={c.title} properties={c.properties} />
        ))}
      </div>

      {/* Fuera de tu zona — clearly separated section, only when in-zone < 10 */}
      {showOutOfZone && (
        <div className="pt-6">
          <div className="px-4 mb-2 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] uppercase tracking-wider text-white/40 whitespace-nowrap">Fuera de tu zona</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <PropertyCarousel title="Podrían interesarte" properties={outOfZone} />
        </div>
      )}

      {/* Modals */}
      <DislikeModal
        open={showDislike}
        onClose={() => setShowDislike(false)}
        onSubmit={(reason) => {
          handleReaction('dislike', { dislike_reason: reason });
          setShowDislike(false);
        }}
      />
      <VisitModal
        open={showVisit}
        onClose={() => setShowVisit(false)}
        property={currentProperty}
        clientId={localStorage.getItem('latitud_client_id')}
        clientName={localStorage.getItem('latitud_client_name')}
        onSubmit={() => {
          handleReaction('visit_request');
          setShowVisit(false);
        }}
      />
      <InsightModal
        open={showInsight}
        onClose={() => setShowInsight(false)}
        client={client}
        onViewMatches={() => { setShowInsight(false); navigate('/favorites'); }}
      />
      <SearchPreferencesModal
        open={showPrefs}
        onClose={() => setShowPrefs(false)}
        client={client}
        onSaved={onPrefsSaved}
      />

      <BottomNav />
    </div>
  );
}