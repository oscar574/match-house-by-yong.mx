import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Calendar, Info, MessageCircle, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PropertyCard from '@/components/PropertyCard';
import PropertyCarousel from '@/components/PropertyCarousel';
import DislikeModal from '@/components/DislikeModal';
import VisitModal from '@/components/VisitModal';
import InsightModal from '@/components/InsightModal';
import LatitudLogo from '@/components/LatitudLogo';
import { calculateMatch } from '@/lib/matchEngine';
import { addLeadScore } from '@/lib/leadScoring';
import { countDuplicates } from '@/lib/duplicateDetection';

// Only show homes that generate commission for Latitud
function isCommissionVisible(p) {
  const commissionOk = p.commission_status === 'Confirmada' || p.shared_commission === true || p.collaboration_enabled === true;
  const statusOk = p.status === 'Disponible';
  const visibleOk = (p.is_visible_in_app !== false) && (p.visible_to_clients !== false);
  const notDuplicate = p.is_duplicate !== true || !p.duplicate_master_property_id;
  const hasData = p.price > 0 && p.construction_area > 0;
  const hasPhoto = (p.cover_photo_url || (p.photos && p.photos.length > 0) || (p.photo_urls && p.photo_urls.length > 0)) !== false;
  const isCasa = p.property_type === 'Casa';
  return commissionOk && statusOk && visibleOk && notDuplicate && hasData && hasPhoto && isCasa;
}

export default function Discover() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDislike, setShowDislike] = useState(false);
  const [showVisit, setShowVisit] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const [reactionCount, setReactionCount] = useState(0);
  const [direction, setDirection] = useState(0);
  const [leadScore, setLeadScore] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

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

    // Load max 20 properties initially (progressive loading)
    const allProps = await base44.entities.Property.list('-created_date', 50);

    // Get already reacted properties
    let reactedIds = [];
    if (clientId) {
      const reactions = await base44.entities.Reaction.filter({ client_id: clientId });
      reactedIds = reactions.map(r => r.property_id);
    }

    // Filter: only commission-visible, available, non-duplicate homes
    let available = allProps.filter(isCommissionVisible);
    available = available.filter(p => !reactedIds.includes(p.id));
    // Hide duplicate copies - only masters visible
    available = available.filter(p => p.is_duplicate !== true);

    // Log duplicate stats for admin visibility
    const dupStats = countDuplicates(allProps);

    // Enrich with match score
    if (clientData) {
      available = available.map(p => {
        const match = calculateMatch(p, clientData);
        return { ...p, _matchPercentage: match.percentage, _matchReason: match.reasonText };
      });
    }

    // Sort by match if available, else by most recent
    available.sort((a, b) => (b._matchPercentage || 0) - (a._matchPercentage || 0));

    setProperties(available);
    setLoading(false);
  };

  const currentProperty = properties[currentIndex];

  // Build carousels from all loaded properties (max 20 each)
  const carousels = useMemo(() => {
    const pool = properties;
    const budgetMax = client?.budget_max_estimated || null;
    const favZones = client?.favorite_zones || [];

    const recommended = pool.slice(0, 20);
    const newHomes = [...pool].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 20);
    const inBudget = budgetMax ? pool.filter(p => p.price <= budgetMax).slice(0, 20) : pool.slice(0, 20);
    const inFavZones = favZones.length > 0 ? pool.filter(p => favZones.includes(p.zone)).slice(0, 20) : pool.slice(0, 20);
    const withPool = pool.filter(p => p.amenities?.some(a => a.toLowerCase().includes('alberca') || a.toLowerCase().includes('piscina'))).slice(0, 20);
    const luxury = [...pool].sort((a, b) => b.price - a.price).slice(0, 20);
    const meridaNorte = pool.filter(p => p.city === 'Mérida' && (p.zone?.toLowerCase().includes('norte') || p.zone?.toLowerCase().includes('merida'))).slice(0, 20);
    const countryClub = pool.filter(p => p.zone?.includes('Country Club') || p.zone?.includes('Yucatán')).slice(0, 20);

    return [
      { title: 'Recomendadas para ti', subtitle: 'Basado en tu perfil', properties: recommended },
      { title: 'Casas nuevas', subtitle: 'Últimas incorporadas', properties: newHomes },
      { title: 'Dentro de tu presupuesto', subtitle: 'A tu alcance', properties: inBudget },
      { title: 'En tus zonas favoritas', subtitle: 'Donde quieres vivir', properties: inFavZones },
      { title: 'Casas con alberca', subtitle: 'Disfruta el sol', properties: withPool },
      { title: 'Casas de lujo', subtitle: 'Las más exclusivas', properties: luxury },
      { title: 'Casas en Mérida Norte', subtitle: 'Mejor zona de la ciudad', properties: meridaNorte },
      { title: 'Yucatán Country Club', subtitle: 'Vida de club', properties: countryClub },
    ].filter(c => c.properties.length > 0);
  }, [properties, client]);

  const handleReaction = async (type, extra = {}) => {
    if (!currentProperty) return;
    const clientId = localStorage.getItem('latitud_client_id');
    if (!clientId) return;

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

    // Update client counts + lead score
    const updates = { last_activity_date: new Date().toISOString() };
    let action = null;
    if (type === 'like') {
      updates.liked_count = (client?.liked_count || 0) + 1;
      action = 'SAVE_FAVORITE';
    }
    if (type === 'dislike') {
      updates.disliked_count = (client?.disliked_count || 0) + 1;
    }
    if (type === 'visit_request') {
      updates.visit_requests_count = (client?.visit_requests_count || 0) + 1;
      action = 'REQUEST_VISIT';
    }

    // Lead scoring
    const hasVisit = (client?.visit_requests_count || 0) > 0 || type === 'visit_request';
    const { score: newScore, status: newStatus } = addLeadScore(
      leadScore,
      action,
      hasVisit
    );
    updates.lead_score = newScore;
    updates.lead_status = newStatus;
    setLeadScore(newScore);

    // Maintenance: keep arrays short
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

    await base44.entities.Client.update(clientId, updates);

    const newCount = reactionCount + 1;
    setReactionCount(newCount);
    if (newCount % 5 === 0 && newCount > 0) setShowInsight(true);

    setDirection(type === 'like' || type === 'visit_request' ? 1 : -1);
    setCurrentIndex(i => i + 1);
  };

  const handleDislike = () => setShowDislike(true);
  const handleLike = () => handleReaction('like');
  const handleVisit = () => setShowVisit(true);

  if (loading) {
    return (
      <div className="min-h-screen bg-latitud-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  const noMore = currentIndex >= properties.length;
  const hasSwipable = !noMore && currentProperty;

  return (
    <div className="min-h-screen bg-latitud-black pb-10">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-center justify-between sticky top-0 bg-latitud-black/95 backdrop-blur-sm z-30">
        <LatitudLogo variant="white" size="sm" />
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/favorites')} className="text-white/60 hover:text-latitud-orange transition-colors relative">
            <Heart size={20} />
            {client?.liked_count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-latitud-orange text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {client.liked_count}
              </span>
            )}
          </button>
          <button onClick={() => navigate('/profile')} className="text-white/60 hover:text-latitud-orange transition-colors">
            <MessageCircle size={20} />
          </button>
        </div>
      </div>

      {/* Hero swipe deck */}
      {hasSwipable ? (
        <div className="px-4 pb-2 relative">
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles size={16} className="text-latitud-orange" />
              <h2 className="font-heading text-xl text-white">Tu mejor opción hoy</h2>
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
                <Heart size={28} className="text-white" fill="white" />
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
              <span className="w-16 text-center">Me gusta</span>
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
          <h3 className="font-heading text-xl text-white mb-2">Has visto todas las propiedades</h3>
          <p className="text-white/50 text-sm mb-6">Estamos buscando más opciones para ti.</p>
          <button
            onClick={() => navigate('/favorites')}
            className="bg-latitud-orange text-white font-semibold px-8 py-3 rounded-xl"
          >
            Ver mis favoritas
          </button>
        </div>
      )}

      {/* Netflix-style carousels */}
      <div className="pt-4">
        {carousels.map((c, i) => (
          <PropertyCarousel
            key={i}
            title={c.title}
            subtitle={c.subtitle}
            properties={c.properties}
          />
        ))}
      </div>

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
    </div>
  );
}