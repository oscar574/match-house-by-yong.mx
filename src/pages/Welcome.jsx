import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, BarChart3, Users, Building2, UserCheck } from 'lucide-react';
import LatitudLogo from '@/components/LatitudLogo';

const VALUES = [
  { icon: Sparkles, title: 'Smart property matching', desc: 'Casas que encajan contigo' },
  { icon: BarChart3, title: 'Buyer intent tracking', desc: 'Entendemos tu interés' },
  { icon: Users, title: 'Advisor-ready leads', desc: 'Conecta con un asesor' },
  { icon: Building2, title: 'Premium real estate', desc: 'Curaduría de calidad' }
];

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
          className="pb-10"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 32 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="h-0.5 bg-latitud-orange mb-5"
          />

          <h1 className="font-heading text-3xl md:text-[2.75rem] md:leading-[1.1] text-white leading-tight mb-4">
            Find the property that actually fits you.
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-8 max-w-md">
            Discover homes that match your lifestyle, budget and timing — without scrolling through endless listings.
          </p>

          <Link to="/onboarding">
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="w-full bg-latitud-orange text-white font-semibold py-4 rounded-xl text-lg mb-3 active:bg-[#0B2D5C] transition-colors flex items-center justify-center gap-2 accent-glow"
            >
              Start my match
              <ArrowRight size={20} />
            </motion.button>
          </Link>

          <Link to="/discover">
            <button className="w-full border border-white/20 text-white/80 font-medium py-4 rounded-xl text-base hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
              View properties
            </button>
          </Link>

          <Link to="/onboarding?has_advisor=true" className="block">
            <p className="text-white/40 text-xs text-center mt-3 flex items-center justify-center gap-1">
              <UserCheck size={13} /> Ya tengo asesor
            </p>
          </Link>

          {/* Value section */}
          <div className="grid grid-cols-2 gap-3 mt-8">
            {VALUES.map((v, i) => {
              const Icon = v.icon;
              return (
                <motion.div
                  key={v.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + i * 0.08 }}
                  className="bg-white/[0.06] backdrop-blur-sm rounded-xl p-3 border border-white/10"
                >
                  <Icon size={18} className="text-latitud-orange mb-2" />
                  <p className="text-white text-xs font-semibold leading-tight">{v.title}</p>
                  <p className="text-white/40 text-[10px] mt-0.5">{v.desc}</p>
                </motion.div>
              );
            })}
          </div>

          <p className="text-white/30 text-xs text-center mt-8">
            Powered by YONG.MX
          </p>
        </motion.div>
      </div>
    </div>
  );
}