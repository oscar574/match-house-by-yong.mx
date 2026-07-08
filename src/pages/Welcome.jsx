import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, BarChart3, Users, Calendar, LayoutDashboard, Palette, Plug, Building2, ShieldCheck } from 'lucide-react';
import LatitudLogo from '@/components/LatitudLogo';

const VALUES = [
  { icon: Sparkles, title: 'Smart property matching', desc: 'Casas que encajan contigo' },
  { icon: BarChart3, title: 'Buyer intent tracking', desc: 'Entendemos tu interés' },
  { icon: Users, title: 'Advisor-ready leads', desc: 'Conecta con un asesor' },
  { icon: Building2, title: 'Premium real estate', desc: 'Curaduría de calidad' }
];

const TEAM_VALUES = [
  { icon: Sparkles, title: 'Smart property discovery', desc: 'Curated matches, not endless listings.' },
  { icon: BarChart3, title: 'Buyer intent scoring', desc: 'Know who is most likely to buy.' },
  { icon: ShieldCheck, title: 'WhatsApp-first lead capture', desc: 'Frictionless, verified contacts.' },
  { icon: Calendar, title: 'Appointment requests', desc: 'Visits booked in one tap.' },
  { icon: LayoutDashboard, title: 'Advisor dashboard', desc: 'Leads, visits and intent in one place.' },
  { icon: Palette, title: 'White label ready', desc: 'Your brand, your colors, your inventory.' },
  { icon: Plug, title: 'EasyBroker-ready architecture', desc: 'Sync MLS inventory when ready.' }
];

export default function Welcome() {
  return (
    <div className="min-h-screen bg-latitud-black flex flex-col">
      {/* ===== HERO ===== */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200"
            alt="Luxury home"
            className="w-full h-full object-cover"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 8, ease: 'easeOut' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-latitud-black via-latitud-black/85 to-latitud-black/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-latitud-black/70 to-transparent" />
        </div>

        <div className="relative z-10 min-h-screen flex flex-col px-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="pt-12 pb-8">
            <LatitudLogo variant="white" size="md" />
          </motion.div>

          <div className="flex-1" />

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="pb-10">
            <motion.div initial={{ width: 0 }} animate={{ width: 32 }} transition={{ duration: 0.6, delay: 0.5 }} className="h-0.5 bg-[#C9A45C] mb-5" />
            <p className="text-[#C9A45C] text-xs font-semibold tracking-[0.2em] uppercase mb-3">Private real estate discovery, powered by AI.</p>
            <h1 className="font-heading text-3xl md:text-[2.75rem] md:leading-[1.1] text-white leading-tight mb-4">
              MatchHouse learns what you want and shows you homes worth seeing.
            </h1>
            <p className="text-white/55 text-base leading-relaxed mb-8 max-w-md">
              A private discovery experience that understands your lifestyle, budget and timing — then curates homes worth seeing.
            </p>

            <Link to="/onboarding">
              <motion.button whileTap={{ scale: 0.97 }} className="w-full bg-[#C9A45C] text-latitud-black font-semibold py-4 rounded-xl text-lg mb-3 active:bg-[#1A1A1A] transition-colors flex items-center justify-center gap-2 accent-glow">
                Start my match <ArrowRight size={20} />
              </motion.button>
            </Link>
            <Link to="/discover">
              <button className="w-full border border-white/20 text-white/80 font-medium py-4 rounded-xl text-base hover:bg-white/5 transition-colors">
                Explore homes
              </button>
            </Link>

            <p className="text-white/35 text-xs text-center mt-4">No spam. No endless listings. Just curated homes.</p>

            <div className="grid grid-cols-2 gap-3 mt-8">
              {VALUES.map((v, i) => {
                const Icon = v.icon;
                return (
                  <motion.div key={v.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 + i * 0.08 }} className="bg-white/[0.06] backdrop-blur-sm rounded-xl p-3 border border-white/10">
                    <Icon size={18} className="text-[#C9A45C] mb-2" />
                    <p className="text-white text-xs font-semibold leading-tight">{v.title}</p>
                    <p className="text-white/40 text-[10px] mt-0.5">{v.desc}</p>
                  </motion.div>
                );
              })}
            </div>

            <p className="text-white/30 text-xs text-center mt-8">Powered by YONG.MX</p>
          </motion.div>
        </div>
      </div>

      {/* ===== FOR REAL ESTATE TEAMS ===== */}
      <div className="bg-[#FFFDF8] px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <p className="text-[#C9A45C] text-xs font-semibold tracking-[0.2em] uppercase mb-2">For Real Estate Teams</p>
          <h2 className="font-heading text-2xl md:text-3xl text-latitud-black leading-tight mb-3">
            Turn property browsing into qualified buyer intent.
          </h2>
          <p className="text-latitud-gray text-sm leading-relaxed mb-6">
            MatchHouse helps real estate teams capture buyer preferences, track intent, schedule visits and prioritize the clients most likely to buy.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {TEAM_VALUES.map(v => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-white rounded-2xl p-4 shadow-sm border border-[#C9A45C]/15">
                  <Icon size={20} className="text-[#C9A45C] mb-2" />
                  <p className="text-sm font-semibold text-latitud-black">{v.title}</p>
                  <p className="text-xs text-latitud-gray mt-0.5">{v.desc}</p>
                </div>
              );
            })}
          </div>

          <Link to="/onboarding">
            <button className="w-full bg-latitud-black text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2">
              Request a demo <ArrowRight size={18} />
            </button>
          </Link>
          <p className="text-latitud-gray/60 text-[10px] text-center mt-3">White label ready · EasyBroker-ready architecture</p>
        </div>
      </div>
    </div>
  );
}