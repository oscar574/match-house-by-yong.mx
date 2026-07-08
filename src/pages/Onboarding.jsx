import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ShieldCheck, RefreshCw, MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LatitudLogo from '@/components/LatitudLogo';
import { brandConfig } from '@/lib/brandConfig';

const LOOKING_FOR = ['Casa familiar', 'Inversión', 'Lujo', 'Playa', 'Norte de Mérida', 'Country Club lifestyle'];
const BUDGETS = ['Menos de $3M', '$3M a $5M', '$5M a $10M', '$10M a $20M', 'Más de $20M'];
const ZONES = ['Yucatán Country Club', 'Norte de Mérida', 'Centro de Mérida', 'Telchac', 'Progreso', 'Chelem', 'Ciudad de México', 'Santa Fe', 'Interlomas', 'Valle de Bravo'];
const ROOMS = ['1', '2', '3', '4 o más', 'No importa'];
const YESNO = ['Sí', 'No', 'Indiferente'];

const budgetMap = {
  'Menos de $3M': [0, 3000000],
  '$3M a $5M': [3000000, 5000000],
  '$5M a $10M': [5000000, 10000000],
  '$10M a $20M': [10000000, 20000000],
  'Más de $20M': [20000000, 100000000]
};

const investmentMap = {
  'Casa familiar': 'Familiar',
  'Inversión': 'Inversión',
  'Lujo': 'Lujo',
  'Playa': 'Playa',
  'Norte de Mérida': 'Norte',
  'Country Club lifestyle': 'Country Club'
};

function Chip({ label, active, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all text-sm font-medium flex items-center justify-between ${
        active ? 'border-[#C9A45C] bg-[#E6D3A3]/15 text-latitud-black' : 'border-gray-100 bg-white text-latitud-gray hover:border-gray-200'
      }`}
    >
      <span>{label}</span>
      {active && (
        <div className="w-5 h-5 rounded-full bg-[#C9A45C] flex items-center justify-center">
          <Check size={12} className="text-latitud-black" />
        </div>
      )}
    </motion.button>
  );
}

function MiniChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
        active ? 'border-[#C9A45C] bg-[#E6D3A3]/20 text-latitud-black' : 'border-gray-100 text-latitud-gray'
      }`}
    >
      {label}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-latitud-gray uppercase tracking-wider mb-2.5">{title}</p>
      {children}
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [lookingFor, setLookingFor] = useState('');
  const [budget, setBudget] = useState('');
  const [zones, setZones] = useState([]);
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [pool, setPool] = useState('');
  const [garden, setGarden] = useState('');
  const [contact, setContact] = useState({ name: '', whatsapp: '', email: '' });
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [saving, setSaving] = useState(false);

  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;
  const demoCode = brandConfig.demo_whatsapp_otp_code;

  const toggleZone = (z) => setZones(prev => prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]);

  const canContinue = () => {
    if (step === 0) return !!lookingFor;
    if (step === 1) return !!budget;
    if (step === 2) return zones.length > 0 && !!bedrooms && !!bathrooms && !!pool && !!garden;
    if (step === 3) return contact.name && contact.whatsapp && (!contact.email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email));
    return false;
  };

  const handleFinish = async () => {
    setSaving(true);
    const [budgetMin, budgetMax] = budgetMap[budget] || [0, 0];
    const bedsNum = bedrooms !== 'No importa' ? parseInt(bedrooms) : null;
    const bathsNum = bathrooms !== 'No importa' ? parseInt(bathrooms) : null;
    const amenities = [];
    if (pool === 'Sí') amenities.push('alberca');
    if (garden === 'Sí') amenities.push('jardín');

    const clientData = {
      name: contact.name,
      whatsapp: contact.whatsapp,
      email: contact.email || '',
      city: 'Mérida',
      looking_for: lookingFor,
      property_type_wanted: 'Casa',
      favorite_zones: zones,
      budget_range: budget,
      important_features: [],
      bedrooms_wanted: bedrooms,
      preferred_bedrooms: bedsNum,
      preferred_bathrooms: bathsNum,
      preferred_amenities: amenities,
      investment_profile: investmentMap[lookingFor] || '',
      budget_min_estimated: budgetMin,
      budget_max_estimated: budgetMax,
      onboarding_completed: true,
      phone_verified: true,
      whatsapp_verified_at: new Date().toISOString(),
      buyer_intent_score: 10,
      lead_score: 10,
      lead_status: 'explorando',
      commercial_stage: 'Onboarding completado',
      lead_source: 'MatchHouse',
      assigned_advisor: 'Carlos Ramírez'
    };

    const client = await base44.entities.Client.create(clientData);
    localStorage.setItem('latitud_client_id', client.id);
    localStorage.setItem('latitud_client_name', contact.name);
    navigate('/discover');
  };

  const verifyOtp = () => {
    if (otp === demoCode) {
      setOtpError('');
      handleFinish();
    } else {
      setOtpError('Código incorrecto. En modo demo usa ' + demoCode + '.');
    }
  };

  const next = () => setStep(s => s + 1);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/')} className="p-2 -ml-2 text-latitud-gray">
            <ArrowLeft size={24} />
          </button>
          <LatitudLogo size="sm" />
          <div className="w-10" />
        </div>
        <div className="h-1 bg-latitud-light rounded-full overflow-hidden">
          <motion.div className="h-full bg-[#C9A45C] rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <p className="text-xs text-latitud-gray mt-2">Paso {step + 1} de {totalSteps}</p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pt-6 pb-8 flex flex-col">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col">
              <h2 className="font-heading text-2xl text-latitud-black mb-1 leading-tight">¿Qué estás buscando?</h2>
              <p className="text-latitud-gray text-sm mb-6">Curado para ti según tu estilo de vida.</p>
              <div className="space-y-3 flex-1">
                {LOOKING_FOR.map(o => <Chip key={o} label={o} active={lookingFor === o} onClick={() => { setLookingFor(o); setTimeout(next, 250); }} />)}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col">
              <h2 className="font-heading text-2xl text-latitud-black mb-1 leading-tight">Presupuesto</h2>
              <p className="text-latitud-gray text-sm mb-6">Dentro de tu presupuesto, sin excederte.</p>
              <div className="space-y-3 flex-1">
                {BUDGETS.map(o => <Chip key={o} label={o} active={budget === o} onClick={() => { setBudget(o); setTimeout(next, 250); }} />)}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col overflow-y-auto">
              <h2 className="font-heading text-2xl text-latitud-black mb-1 leading-tight">Preferencias</h2>
              <p className="text-latitud-gray text-sm mb-5">Basado en tu lifestyle.</p>
              <Section title="Zonas que te interesan">
                <div className="flex flex-wrap gap-2">
                  {ZONES.map(z => <MiniChip key={z} label={z} active={zones.includes(z)} onClick={() => toggleZone(z)} />)}
                </div>
              </Section>
              <Section title="Recámaras">
                <div className="flex flex-wrap gap-2">{ROOMS.map(r => <MiniChip key={r} label={r} active={bedrooms === r} onClick={() => setBedrooms(r)} />)}</div>
              </Section>
              <Section title="Baños">
                <div className="flex flex-wrap gap-2">{ROOMS.map(r => <MiniChip key={'b' + r} label={r} active={bathrooms === r} onClick={() => setBathrooms(r)} />)}</div>
              </Section>
              <Section title="Alberca">
                <div className="flex flex-wrap gap-2">{YESNO.map(o => <MiniChip key={'p' + o} label={o} active={pool === o} onClick={() => setPool(o)} />)}</div>
              </Section>
              <Section title="Jardín">
                <div className="flex flex-wrap gap-2">{YESNO.map(o => <MiniChip key={'g' + o} label={o} active={garden === o} onClick={() => setGarden(o)} />)}</div>
              </Section>
              <button onClick={next} disabled={!canContinue()} className="mt-2 w-full bg-[#C9A45C] text-latitud-black font-semibold py-4 rounded-xl disabled:opacity-40 transition-opacity">
                Continuar
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col">
              <h2 className="font-heading text-2xl text-latitud-black mb-2 leading-tight">Guarda tu match</h2>
              <p className="text-latitud-gray text-sm mb-7">Recibe solo propiedades que realmente van contigo.</p>
              <div className="space-y-5 flex-1">
                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block">Nombre</label>
                  <input type="text" value={contact.name} onChange={e => setContact(p => ({ ...p, name: e.target.value }))} placeholder="Tu nombre" className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-[#C9A45C] focus:outline-none text-latitud-black text-base transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block">WhatsApp</label>
                  <input type="tel" value={contact.whatsapp} onChange={e => setContact(p => ({ ...p, whatsapp: e.target.value }))} placeholder="+52 999 123 4567" className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-[#C9A45C] focus:outline-none text-latitud-black text-base transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block">Correo <span className="text-latitud-gray/50">(opcional)</span></label>
                  <input type="email" value={contact.email} onChange={e => setContact(p => ({ ...p, email: e.target.value }))} placeholder="tu@correo.com" className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-[#C9A45C] focus:outline-none text-latitud-black text-base transition-colors" />
                  {contact.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email) && (
                    <p className="text-[10px] text-red-500 mt-1">Ingresa un correo válido</p>
                  )}
                </div>
                <p className="text-[10px] text-latitud-gray/70 flex items-center gap-1"><MessageCircle size={11} /> Usaremos tu WhatsApp solo para dar seguimiento a tus matches y visitas. No spam.</p>
              </div>
              <button onClick={next} disabled={!canContinue()} className="mt-6 w-full bg-[#C9A45C] text-latitud-black font-semibold py-4 rounded-xl disabled:opacity-40 transition-opacity flex items-center justify-center gap-2">
                {saving ? <div className="w-5 h-5 border-2 border-latitud-black/30 border-t-latitud-black rounded-full animate-spin" /> : 'Continuar'}
              </button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#E6D3A3]/25 flex items-center justify-center mb-5 mt-4">
                <ShieldCheck size={30} className="text-[#C9A45C]" />
              </div>
              <h2 className="font-heading text-2xl text-latitud-black mb-2 leading-tight">Verifica tu WhatsApp</h2>
              <p className="text-latitud-gray text-sm mb-1">Te enviamos un código por WhatsApp para confirmar tu número.</p>
              <p className="text-xs text-[#C9A45C] font-medium mb-6">Modo demo: usa el código {demoCode} para continuar.</p>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                placeholder="••••••"
                className="w-48 text-center text-2xl tracking-[0.5em] font-bold px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-[#C9A45C] focus:outline-none text-latitud-black transition-colors mb-2"
              />
              {otpError && <p className="text-xs text-red-500 mb-3">{otpError}</p>}

              <button onClick={() => setOtp('')} className="text-xs text-latitud-gray flex items-center gap-1 mb-6">
                <RefreshCw size={12} /> Reenviar código
              </button>

              <button
                onClick={verifyOtp}
                disabled={otp.length !== 6 || saving}
                className="w-full bg-[#C9A45C] text-latitud-black font-semibold py-4 rounded-xl disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
              >
                {saving ? <div className="w-5 h-5 border-2 border-latitud-black/30 border-t-latitud-black rounded-full animate-spin" /> : 'Verificar y continuar'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}