import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, BarChart3, Users, Calendar, LayoutDashboard, Palette, Plug, Building2, ShieldCheck } from 'lucide-react';
import LatitudLogo from '@/components/LatitudLogo';
import { validateClientSession, needsOnboarding } from '@/lib/clientSession';

const VALUES = [
  { icon: Sparkles, title: 'Match inteligente de propiedades', desc: 'Casas que encajan contigo' },
  { icon: BarChart3, title: 'Seguimiento de intención', desc: 'Entendemos tu interés' },
  { icon: Users, title: 'Leads listos para el asesor', desc: 'Conecta con un asesor' },
  { icon: Building2, title: 'Inmobiliaria premium', desc: 'Selección de calidad' }
];

const TEAM_VALUES = [
  { icon: Sparkles, title: 'Descubrimiento inteligente', desc: 'Matches seleccionados, no listados infinitos.' },
  { icon: BarChart3, title: 'Scoring de intención', desc: 'Sabe quién tiene mayor probabilidad de comprar.' },
  { icon: ShieldCheck, title: 'Captura por WhatsApp', desc: 'Contactos verificados, sin fricción.' },
  { icon: Calendar, title: 'Solicitudes de visita', desc: 'Visitas agendadas en un toque.' },
  { icon: LayoutDashboard, title: 'Panel del asesor', desc: 'Leads, visitas e intención en un solo lugar.' },
  { icon: Palette, title: 'Listo para white label', desc: 'Tu marca, tus colores, tu inventario.' },
  { icon: Plug, title: 'Arquitectura EasyBroker-ready', desc: 'Sincroniza inventario MLS cuando quieras.' }
];

export default function Welcome() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await validateClientSession();
      if (r?.status === 'valid') { navigate(needsOnboarding(r.client) ? '/onboarding' : '/discover', { replace: true }); return; }
      if (r === 'transient') { navigate('/discover', { replace: true }); return; }
      // 'none' or 'invalid' → show the landing/login flow
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-latitud-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-latitud-black flex flex-col">
      {/* ===== HERO ===== */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200"
            alt="Casa de lujo"
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
            <p className="text-[#C9A45C] text-xs font-semibold tracking-[0.2em] uppercase mb-3">Descubrimiento inmobiliario privado, con IA.</p>
            <h1 className="font-heading text-3xl md:text-[2.75rem] md:leading-[1.1] text-white leading-tight mb-4">
              MatchHouse aprende lo que buscas y te muestra casas que vale la pena ver.
            </h1>
            <p className="text-white/55 text-base leading-relaxed mb-8 max-w-md">
              Una experiencia privada que entiende tu estilo de vida, tu presupuesto y tu momento — para mostrarte solo propiedades a tu altura.
            </p>

            <Link to="/access">
              <motion.button whileTap={{ scale: 0.97 }} className="w-full bg-[#C9A45C] text-latitud-black font-semibold py-4 rounded-xl text-lg active:bg-[#1A1A1A] transition-colors flex items-center justify-center gap-2 accent-glow">
                Encontrar mi match <ArrowRight size={20} />
              </motion.button>
            </Link>

            <p className="text-white/35 text-xs text-center mt-4">No spam. No es un portal. Solo casas seleccionadas para ti.</p>

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

      {/* ===== PARA EQUIPOS INMOBILIARIOS ===== */}
      <div className="bg-[#FFFDF8] px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <p className="text-[#C9A45C] text-xs font-semibold tracking-[0.2em] uppercase mb-2">Para equipos inmobiliarios</p>
          <h2 className="font-heading text-2xl md:text-3xl text-latitud-black leading-tight mb-3">
            Convierte la búsqueda de propiedades en intención de compra calificada.
          </h2>
          <p className="text-latitud-gray text-sm leading-relaxed mb-6">
            MatchHouse ayuda a los equipos inmobiliarios a capturar preferencias, medir intención, agendar visitas y priorizar a los clientes con mayor probabilidad de comprar.
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
              Solicitar una demo <ArrowRight size={18} />
            </button>
          </Link>
          <p className="text-latitud-gray/60 text-[10px] text-center mt-3">Listo para white label · Arquitectura EasyBroker-ready</p>
        </div>
      </div>
    </div>
  );
}