import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, UserCheck } from 'lucide-react';
import LatitudLogo from '@/components/LatitudLogo';

export default function Welcome() {
  return (
    <div className="min-h-screen bg-latitud-black flex flex-col relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <motion.img 
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200" 
          alt="Luxury home" 
          className="w-full h-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 8, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-latitud-black via-latitud-black/80 to-latitud-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-latitud-black/60 to-transparent" />
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
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: 32 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="h-0.5 bg-latitud-orange mb-5"
          />
          
          <h1 className="font-heading text-3xl md:text-4xl text-white leading-tight mb-4">
            Encuentra una propiedad que realmente vaya contigo.
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-10 max-w-md">
            Descubre casas compatibles con tu estilo de vida, presupuesto y momento de compra, sin perderte entre cientos de listados.
          </p>

          <Link to="/onboarding">
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="w-full bg-latitud-orange text-white font-semibold py-4 rounded-xl text-lg mb-4 active:bg-[#0B2D5C] transition-colors flex items-center justify-center gap-2 accent-glow"
            >
              Empezar mi match
              <ArrowRight size={20} />
            </motion.button>
          </Link>

          <Link to="/onboarding?has_advisor=true">
            <button className="w-full border border-white/20 text-white/80 font-medium py-4 rounded-xl text-base hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
              <UserCheck size={18} />
              Ya tengo asesor
            </button>
          </Link>

          <p className="text-white/30 text-xs text-center mt-8">
            Powered by YONG.MX
          </p>
        </motion.div>
      </div>
    </div>
  );
}