import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MapPin, DollarSign, Home, Star } from 'lucide-react';

export default function InsightModal({ open, onClose, client, onViewMatches }) {
  if (!open || !client) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-sm bg-white rounded-3xl p-6"
        >
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-latitud-orange/10 flex items-center justify-center">
              <Sparkles size={24} className="text-latitud-orange" />
            </div>
          </div>
          
          <h3 className="font-heading text-xl text-center text-latitud-black mb-2">
            Estamos entendiendo mejor lo que buscas.
          </h3>
          <p className="text-sm text-latitud-gray text-center mb-6">
            Con base en tus reacciones, este es tu perfil:
          </p>

          <div className="space-y-3 mb-6">
            {client.favorite_zones?.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-latitud-light rounded-xl">
                <MapPin size={18} className="text-latitud-orange mt-0.5" />
                <div>
                  <p className="text-xs text-latitud-gray">Zonas favoritas</p>
                  <p className="text-sm font-medium text-latitud-black">{client.favorite_zones.join(', ')}</p>
                </div>
              </div>
            )}
            {client.budget_range && (
              <div className="flex items-start gap-3 p-3 bg-latitud-light rounded-xl">
                <DollarSign size={18} className="text-latitud-orange mt-0.5" />
                <div>
                  <p className="text-xs text-latitud-gray">Rango de precio</p>
                  <p className="text-sm font-medium text-latitud-black">{client.budget_range}</p>
                </div>
              </div>
            )}
            {client.property_type_wanted && (
              <div className="flex items-start gap-3 p-3 bg-latitud-light rounded-xl">
                <Home size={18} className="text-latitud-orange mt-0.5" />
                <div>
                  <p className="text-xs text-latitud-gray">Tipo preferido</p>
                  <p className="text-sm font-medium text-latitud-black">{client.property_type_wanted}</p>
                </div>
              </div>
            )}
            {client.important_features?.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-latitud-light rounded-xl">
                <Star size={18} className="text-latitud-orange mt-0.5" />
                <div>
                  <p className="text-xs text-latitud-gray">Lo que más te importa</p>
                  <p className="text-sm font-medium text-latitud-black">{client.important_features.join(', ')}</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onViewMatches}
            className="w-full bg-latitud-orange text-white font-semibold py-3.5 rounded-xl"
          >
            Ver mis mejores coincidencias
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}