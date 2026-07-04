import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Calendar, Info, MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PropertyCard from '@/components/PropertyCard';
import DislikeModal from '@/components/DislikeModal';
import VisitModal from '@/components/VisitModal';
import InsightModal from '@/components/InsightModal';
import LatitudLogo from '@/components/LatitudLogo';
import { calculateMatch, formatPrice } from '@/lib/matchEngine';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const clientId = localStorage.getItem('latitud_client_id');
    let clientData = null;

    if (clientId) {
      clientData = await base44.entities.Client.get(clientId);
      setClient(clientData);
    }

    const allProps = await base44.entities.Property.filter({ status: 'Disponible', visible_to_clients: true });
    
    // Get already reacted properties
    let reactedIds = [];
    if (clientId) {
      const reactions = await base44.entities.Reaction.filter({ client_id: clientId });
      reactedIds = reactions.map(r => r.property_id);
    }

    // Filter out reacted and sort by match
    let available = allProps.filter(p => !reactedIds.includes(p.id));
    
    if (clientData) {
      available = available.map(p => {
        const match = calculateMatch(p, clientData);
        return { ...p, _matchPercentage: match.percentage, _matchReason: match.reasonText };
      }).sort((a, b) => b._matchPercentage - a._matchPercentage);
    }

    setProperties(available);
    setLoading(false);
  };

  const currentProperty = properties[currentIndex];

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

    // Update client counts
    const updates = { last_activity_date: new Date().toISOString() };
    if (type === 'like') updates.liked_count = (client?.liked_count || 0) + 1;
    if (type === 'dislike') updates.disliked_count = (client?.disliked_count || 0) + 1;
    if (type === 'visit_request') updates.visit_requests_count = (client?.visit_requests_count || 0) + 1;
    await base44.entities.Client.update(clientId, updates);

    const newCount = reactionCount + 1;
    setReactionCount(newCount);

    // Show insight every 5 reactions
    if (newCount % 5 === 0 && newCount > 0) {
      setShowInsight(true);
    }

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

  return (
    <div className="min-h-screen bg-latitud-black flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <LatitudLogo variant="white" size="sm" />
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/favorites')} className="text-white/60 hover:text-latitud-orange transition-colors">
            <Heart size={20} />
          </button>
          <button onClick={() => navigate('/profile')} className="text-white/60 hover:text-latitud-orange transition-colors">
            <MessageCircle size={20} />
          </button>
        </div>
      </div>

      {/* Intro text */}
      {currentIndex === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-6 pb-4"
        >
          <h2 className="font-heading text-xl text-white">Estas propiedades podrían gustarte.</h2>
          <p className="text-white/40 text-sm">Desliza para descubrir qué opciones se parecen más a lo que buscas.</p>
        </motion.div>
      )}

      {/* Card area */}
      <div className="flex-1 px-4 pb-4 relative">
        {noMore ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 rounded-full bg-latitud-orange/10 flex items-center justify-center mb-4">
              <Heart size={28} className="text-latitud-orange" />
            </div>
            <h3 className="font-heading text-xl text-white mb-2">Has visto todas las propiedades</h3>
            <p className="text-white/50 text-sm mb-6">Estamos buscando más opciones para ti. Pronto tendremos nuevas propiedades compatibles.</p>
            <button 
              onClick={() => navigate('/favorites')}
              className="bg-latitud-orange text-white font-semibold px-8 py-3 rounded-xl"
            >
              Ver mis favoritas
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: direction > 0 ? 100 : -100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: direction > 0 ? -100 : 100, scale: 0.95 }}
              transition={{ duration: 0.35 }}
              className="h-full"
            >
              <PropertyCard 
                property={currentProperty}
                matchPercentage={currentProperty._matchPercentage}
                matchReason={currentProperty._matchReason}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Action buttons */}
      {!noMore && (
        <div className="px-4 pb-8 pt-2">
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
            <span className="w-14 text-center">No</span>
            <span className="w-16 text-center">Me gusta</span>
            <span className="w-14 text-center">Visitar</span>
            <span className="w-14 text-center">Detalles</span>
          </div>
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
    </div>
  );
}