import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Check, Bell, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LatitudLogo from '@/components/LatitudLogo';
import { countAvailable, availableZonesFromProperties, budgetLabel } from '@/lib/clientFilters';
import { formatThousands, parseThousands } from '@/lib/priceFormat';
import { formatPhoneDisplay, normalizePhoneMX } from '@/lib/phoneNormalize';
import { isDemoSkipAccess, ensureDemoClient } from '@/lib/demoAccess';

const OPERATIONS = [
  { value: 'Comprar', label: 'Comprar', desc: 'Encuentra tu próxima casa' },
  { value: 'Rentar', label: 'Rentar', desc: 'Renta por una temporada' },
  { value: 'Explorar', label: 'Solo explorar', desc: 'Ver opciones sin compromiso' }
];
const QUICK_BUDGETS = [
  { label: 'Hasta $3,000,000', min: 0, max: 3000000 },
  { label: '$3,000,000 - $5,000,000', min: 3000000, max: 5000000 },
  { label: '$5,000,000 - $10,000,000', min: 5000000, max: 10000000 },
  { label: '$10,000,000 - $20,000,000', min: 10000000, max: 20000000 }
];
const BEDROOMS_MIN = [0, 1, 2, 3, 4];
const BEDROOMS_MAX = [0, 2, 3, 4, 5];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const totalSteps = 5;
  const [ready, setReady] = useState(false);
  const [operation, setOperation] = useState('');
  const [zones, setZones] = useState([]);
  const [zoneQuery, setZoneQuery] = useState('');
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [bedroomsMin, setBedroomsMin] = useState(0);
  const [bedroomsMax, setBedroomsMax] = useState(0);
  const [notifications, setNotifications] = useState(true);
  const [contact, setContact] = useState({ name: '', whatsapp: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [allProps, setAllProps] = useState([]);
  const [loadingCount, setLoadingCount] = useState(true);

  useEffect(() => {
    (async () => {
      // Onboarding now completes an existing client created by the OTP flow
      // (or pre-registered by an advisor). It must NOT create a new verified
      // record — phone verification happens in the OTP flow.
      let clientId = localStorage.getItem('latitud_client_id');
      if (!clientId) {
        // Demo mode: create a demo client and continue onboarding. Otherwise
        // require phone capture via /access.
        if (await isDemoSkipAccess()) {
          clientId = await ensureDemoClient();
        } else {
          navigate('/access', { replace: true }); return;
        }
      }
      try {
        const client = await base44.entities.Client.get(clientId);
        if (client) {
          setOperation(client.operation_preference || '');
          setZones(client.favorite_zones || []);
          setPriceMin(client.budget_min_estimated > 0 ? client.budget_min_estimated : 0);
          setPriceMax(client.budget_max_estimated > 0 ? client.budget_max_estimated : 0);
          setBedroomsMin(client.preferred_bedrooms > 0 ? client.preferred_bedrooms : 0);
          setBedroomsMax(client.preferred_bedrooms_max > 0 ? client.preferred_bedrooms_max : 0);
          setNotifications(client.notifications_enabled !== false);
          setContact({ name: client.name || '', whatsapp: client.whatsapp || '', email: client.email || '' });
          // Start at the first incomplete step (advisor preload wins, client completes the rest).
          let start = 0;
          if (client.operation_preference) start = 1;
          if (client.favorite_zones?.length > 0) start = 2;
          if (client.budget_max_estimated > 0) start = 3;
          if (client.bedrooms_wanted && client.bedrooms_wanted !== 'No importa') start = 4;
          setStep(start);
        }
      } catch (e) { /* ignore */ }
      setReady(true);
      try {
        const props = await base44.entities.Property.list('-created_date', 1000);
        setAllProps(props);
      } catch (e) { /* ignore */ }
      setLoadingCount(false);
    })();
  }, []);

  const availableZones = useMemo(() => availableZonesFromProperties(allProps), [allProps]);
  const prefs = { operation, zones, priceMin, priceMax, bedroomsMin, bedroomsMax };
  const availableCount = useMemo(() => countAvailable(allProps, prefs), [allProps, prefs]);

  const filteredZones = availableZones.filter(z => z.toLowerCase().includes(zoneQuery.toLowerCase()));
  const progress = ((step + 1) / totalSteps) * 100;

  const toggleZone = (z) => setZones(prev => prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]);

  const canNext = () => {
    if (step === 4) return !!(contact.name && contact.whatsapp);
    return true;
  };

  const next = () => setStep(s => Math.min(s + 1, totalSteps - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));
  const skip = () => {
    if (step === 0 && !operation) setOperation('Explorar');
    next();
  };

  const finish = async () => {
    setSaving(true);
    try {
      const clientId = localStorage.getItem('latitud_client_id');
      const normalizedPhone = normalizePhoneMX(contact.whatsapp);
      const updates = {
        name: contact.name,
        whatsapp: normalizedPhone,
        email: contact.email || '',
        city: 'Mérida',
        operation_preference: operation || 'Explorar',
        favorite_zones: zones,
        budget_min_estimated: priceMin || 0,
        budget_max_estimated: priceMax || 0,
        budget_range: budgetLabel(priceMin, priceMax),
        preferred_bedrooms: bedroomsMin,
        preferred_bedrooms_max: bedroomsMax,
        bedrooms_wanted: bedroomsMin > 0 ? `${bedroomsMin}+` : 'No importa',
        property_type_wanted: 'Casa',
        notifications_enabled: notifications,
        onboarding_completed: true,
        commercial_stage: 'Onboarding completado',
        last_activity_date: new Date().toISOString()
      };
      // Phone is verified by the OTP flow — onboarding must NOT set phone_verified.
      let targetId = clientId;
      if (clientId) {
        await base44.entities.Client.update(clientId, updates);
      } else {
        // No local session — search by normalized WhatsApp to avoid duplicates.
        const existing = await base44.entities.Client.filter({ whatsapp: normalizedPhone });
        if (existing.length > 0) {
          const master = existing.find(c => !c.duplicate_of) || existing[0];
          await base44.entities.Client.update(master.id, updates);
          targetId = master.id;
        } else {
          const created = await base44.entities.Client.create({ ...updates, lead_source: 'MatchHouse', assigned_advisor: 'Carlos Ramírez', buyer_intent_score: 10, lead_score: 10, lead_status: 'explorando' });
          targetId = created.id;
        }
      }
      localStorage.setItem('latitud_client_id', targetId);
      localStorage.setItem('latitud_client_name', contact.name);
      navigate('/discover', { replace: true });
    } catch (e) { /* ignore */ }
    setSaving(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => step > 0 ? back() : navigate('/')} className="p-2 -ml-2 text-latitud-gray"><ArrowLeft size={24} /></button>
          <LatitudLogo size="sm" />
          <div className="w-10" />
        </div>
        <div className="h-1 bg-latitud-light rounded-full overflow-hidden">
          <motion.div className="h-full bg-[#C9A45C] rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <p className="text-xs text-latitud-gray mt-2">Paso {step + 1} de {totalSteps}</p>
      </div>

      {/* Live counter */}
      <div className="px-6 pt-2">
        <div className="flex items-center gap-2 bg-[#E6D3A3]/15 border border-[#C9A45C]/20 rounded-xl px-3 py-2">
          <Check size={14} className="text-[#C9A45C] shrink-0" />
          <p className="text-xs text-latitud-black font-medium">
            {loadingCount ? 'Calculando propiedades disponibles…' : `${availableCount.toLocaleString('es-MX')} propiedades disponibles con tus filtros`}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pt-5 pb-8 flex flex-col">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col">
              <h2 className="font-heading text-2xl text-latitud-black mb-1 leading-tight">¿Qué quieres hacer?</h2>
              <p className="text-latitud-gray text-sm mb-6">Esto enfoca tu búsqueda.</p>
              <div className="space-y-3 flex-1">
                {OPERATIONS.map(o => (
                  <button key={o.value} onClick={() => setOperation(o.value)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all text-sm font-medium flex items-center justify-between ${operation === o.value ? 'border-[#C9A45C] bg-[#E6D3A3]/15 text-latitud-black' : 'border-gray-100 bg-white text-latitud-gray hover:border-gray-200'}`}>
                    <div>
                      <span className="block">{o.label}</span>
                      <span className="block text-xs text-latitud-gray font-normal mt-0.5">{o.desc}</span>
                    </div>
                    {operation === o.value && <div className="w-5 h-5 rounded-full bg-[#C9A45C] flex items-center justify-center shrink-0"><Check size={12} className="text-latitud-black" /></div>}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col">
              <h2 className="font-heading text-2xl text-latitud-black mb-1 leading-tight">¿En qué zona buscas?</h2>
              <p className="text-latitud-gray text-sm mb-5">Elige una o varias zonas del inventario actual.</p>
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-latitud-gray" />
                <input value={zoneQuery} onChange={e => setZoneQuery(e.target.value)} placeholder="Buscar zona o ciudad"
                  className="w-full pl-9 pr-3 py-3 rounded-xl border-2 border-gray-100 focus:border-[#C9A45C] focus:outline-none text-sm" />
              </div>
              <div className="flex flex-wrap gap-2 flex-1 overflow-y-auto">
                {filteredZones.map(z => (
                  <button key={z} onClick={() => toggleZone(z)}
                    className={`px-3 py-2 rounded-full text-xs font-medium border-2 ${zones.includes(z) ? 'border-[#C9A45C] bg-[#E6D3A3]/20 text-latitud-black' : 'border-gray-100 text-latitud-gray'}`}>
                    {z}
                  </button>
                ))}
                {filteredZones.length === 0 && <p className="text-sm text-latitud-gray">No se encontraron zonas.</p>}
              </div>
              {zones.length > 0 && <p className="text-xs text-latitud-gray mt-3">{zones.length} zona(s) seleccionada(s)</p>}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col">
              <h2 className="font-heading text-2xl text-latitud-black mb-1 leading-tight">Rango de precio</h2>
              <p className="text-latitud-gray text-sm mb-6">Filtramos dentro de tu presupuesto.</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="text-xs text-latitud-gray mb-1.5 block">Mínimo (MXN)</label>
                  <input type="text" inputMode="numeric" value={priceMin ? formatThousands(priceMin) : ''} onChange={e => setPriceMin(parseThousands(e.target.value))} placeholder="0"
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 focus:border-[#C9A45C] focus:outline-none text-base" />
                </div>
                <div>
                  <label className="text-xs text-latitud-gray mb-1.5 block">Máximo (MXN)</label>
                  <input type="text" inputMode="numeric" value={priceMax ? formatThousands(priceMax) : ''} onChange={e => setPriceMax(parseThousands(e.target.value))} placeholder="Sin límite"
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 focus:border-[#C9A45C] focus:outline-none text-base" />
                </div>
              </div>
              <p className="text-xs font-semibold text-latitud-gray uppercase tracking-wider mb-2">Rangos rápidos</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_BUDGETS.map(q => (
                  <button key={q.label} onClick={() => { setPriceMin(q.min); setPriceMax(q.max); }}
                    className={`px-3 py-2 rounded-full text-xs font-medium border-2 ${priceMin === q.min && priceMax === q.max ? 'border-[#C9A45C] bg-[#E6D3A3]/20 text-latitud-black' : 'border-gray-100 text-latitud-gray'}`}>
                    {q.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col">
              <h2 className="font-heading text-2xl text-latitud-black mb-1 leading-tight">Recámaras</h2>
              <p className="text-latitud-gray text-sm mb-6">¿Cuántas necesitas?</p>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-latitud-gray uppercase tracking-wider mb-2 block">Mínimo</label>
                  <div className="flex gap-2 flex-wrap">
                    {BEDROOMS_MIN.map(n => (
                      <button key={n} onClick={() => setBedroomsMin(n)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 ${bedroomsMin === n ? 'border-[#C9A45C] bg-[#E6D3A3]/15 text-latitud-black' : 'border-gray-100 text-latitud-gray'}`}>
                        {n === 0 ? 'Cualquiera' : `${n}+`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-latitud-gray uppercase tracking-wider mb-2 block">Máximo</label>
                  <div className="flex gap-2 flex-wrap">
                    {BEDROOMS_MAX.map(n => (
                      <button key={n} onClick={() => setBedroomsMax(n)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 ${bedroomsMax === n ? 'border-[#C9A45C] bg-[#E6D3A3]/15 text-latitud-black' : 'border-gray-100 text-latitud-gray'}`}>
                        {n === 0 ? 'Cualquiera' : `≤ ${n}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col">
              <h2 className="font-heading text-2xl text-latitud-black mb-1 leading-tight">Activar notificaciones</h2>
              <p className="text-latitud-gray text-sm mb-6">Te avisamos cuando haya nuevos matches para ti.</p>
              <div className="flex items-center justify-between bg-latitud-light rounded-xl p-3 mb-5">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-[#C9A45C]" />
                  <span className="text-sm font-medium text-latitud-black">Notificaciones por WhatsApp</span>
                </div>
                <button onClick={() => setNotifications(n => !n)} className={`w-11 h-6 rounded-full transition-colors relative ${notifications ? 'bg-[#C9A45C]' : 'bg-gray-200'}`}>
                  <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${notifications ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block">Nombre</label>
                  <input type="text" value={contact.name} onChange={e => setContact(p => ({ ...p, name: e.target.value }))} placeholder="Tu nombre"
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 focus:border-[#C9A45C] focus:outline-none text-base" />
                </div>
                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block">WhatsApp (verificado)</label>
                  <div className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-base text-latitud-gray">
                    {formatPhoneDisplay(contact.whatsapp) || '—'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block">Correo <span className="text-latitud-gray/50">(opcional)</span></label>
                  <input type="email" value={contact.email} onChange={e => setContact(p => ({ ...p, email: e.target.value }))} placeholder="tu@correo.com"
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 focus:border-[#C9A45C] focus:outline-none text-base" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Buttons */}
      <div className="px-6 pb-8 flex items-center gap-3">
        {step > 0 && (
          <button onClick={back} className="px-5 py-3.5 rounded-xl border-2 border-gray-100 text-latitud-gray font-semibold text-sm">Atrás</button>
        )}
        {step < 4 && (
          <button onClick={skip} className="px-5 py-3.5 rounded-xl text-latitud-gray font-medium text-sm">Omitir</button>
        )}
        {step < 4 ? (
          <button onClick={next} disabled={!canNext()} className="flex-1 bg-[#C9A45C] text-[#1A1A1A] font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40">
            Siguiente <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={finish} disabled={!canNext() || saving} className="flex-1 bg-[#C9A45C] text-[#1A1A1A] font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40">
            {saving ? <div className="w-5 h-5 border-2 border-[#1A1A1A]/30 border-t-[#1A1A1A] rounded-full animate-spin" /> : 'Comenzar a explorar'}
          </button>
        )}
      </div>
    </div>
  );
}