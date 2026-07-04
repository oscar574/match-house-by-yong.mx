import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LatitudLogo from '@/components/LatitudLogo';

export default function Welcome() {
  return (
    <div className="min-h-screen bg-latitud-black flex flex-col relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img 
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200" 
          alt="Luxury home" 
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-latitud-black via-latitud-black/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen px-6">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="pt-12 pb-8"
        >
          <LatitudLogo variant="white" size="md" />
        </motion.div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Main content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="pb-12"
        >
          <h1 className="font-heading text-3xl md:text-4xl text-white leading-tight mb-4">
            Encuentra una propiedad que se sienta como tuya.
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-10">
            Dinos qué buscas y te mostraremos propiedades que realmente encajen contigo.
          </p>

          <Link to="/onboarding">
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="w-full bg-latitud-orange text-white font-semibold py-4 rounded-xl text-lg mb-4 active:bg-orange-600 transition-colors"
            >
              Encontrar mi propiedad
            </motion.button>
          </Link>

          <Link to="/onboarding?has_advisor=true">
            <button className="w-full border border-white/20 text-white/80 font-medium py-4 rounded-xl text-base hover:bg-white/5 transition-colors">
              Ya tengo un asesor
            </button>
          </Link>

          <p className="text-white/30 text-xs text-center mt-6">
            Powered by Latitud Inmobiliaria
          </p>
        </motion.div>
      </div>
    </div>
  );
}