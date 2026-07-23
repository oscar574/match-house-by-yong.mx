import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { availableZonesFromProperties, budgetLabel } from '@/lib/clientFilters';
import { formatThousands, parseThousands } from '@/lib/priceFormat';

const OPERATIONS = [
  { value: 'Comprar', label: 'Comprar' },
  { value: 'Rentar', label: 'Rentar' },
  { value: 'Explorar', label: 'Solo explorar' }
];
const BEDROOMS_MIN = [0, 1, 2, 3, 4];
const BEDROOMS_MAX = [0, 2, 3, 4, 5];

export default function SearchPreferencesModal({ open, onClose, client, onSaved }) {
  const [operation, setOperation] = useState('Explorar');
  const [zones, setZones] = useState([]);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [bedroomsMin, setBedroomsMin] = useState(0);
  const [bedroomsMax, setBedroomsMax] = useState(0);
  const [availableZones, setAvailableZones] = useState([]);
  const [zoneQuery, setZoneQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [wantsPool, setWantsPool] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOperation(client?.operation_preference || 'Explorar');
    setZones(client?.favorite_zones || []);
    setPriceMin(client?.budget_min_estimated > 0 ? client.budget_min_estimated : 0);
    setPriceMax(client?.budget_max_estimated > 0 ? client.budget_max_estimated : 0);
    setBedroomsMin(client?.preferred_bedrooms > 0 ? client.preferred_bedrooms : 0);
    setBedroomsMax(client?.preferred_bedrooms_max > 0 ? client.preferred_bedrooms_max : 0);
    setWantsPool(!!client?.wants_pool);
    setZoneQuery('');
    (async () => {
      try {
        // Page through the FULL inventory so the zone picker reflects every
        // zone actually available, not just the most recent 1,000.
        const all = [];
        const seen = new Set();
        for (let pages = 0; pages < 30; pages++) {
          const batch = seen.size === 0
            ? await base44.entities.Property.list('-created_date', 1000)
            : await base44.entities.Property.filter({ id: { $nin: Array.from(seen) } }, '-created_date', 1000);
          if (!batch || batch.length === 0) break;
          batch.forEach(p => seen.add(p.id));
          all.push(...batch);
          if (batch.length < 1000) break;
        }
        setAvailableZones(availableZonesFromProperties(all));
      } catch (e) { /* ignore */ }
    })();
  }, [open, client]);

  const toggleZone = (z) => setZones(prev => prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]);
  const filteredZones = availableZones.filter(z => z.toLowerCase().includes(zoneQuery.toLowerCase()));

  const save = async () => {
    if (!client?.id) return;
    setSaving(true);
    try {
      const min = priceMin || 0;
      const max = priceMax || 0;
      await base44.entities.Client.update(client.id, {
        operation_preference: operation,
        favorite_zones: zones,
        budget_min_estimated: min,
        budget_max_estimated: max,
        budget_range: budgetLabel(min, max),
        preferred_bedrooms: bedroomsMin,
        preferred_bedrooms_max: bedroomsMax,
        bedrooms_wanted: bedroomsMin > 0 ? `${bedroomsMin}+` : 'No importa',
        wants_pool: wantsPool
      });
      if (onSaved) await onSaved();
      onClose();
    } catch (e) { /* ignore */ }
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[88vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-heading text-lg text-latitud-black">Mis preferencias de búsqueda</h2>
              <button onClick={onClose} className="p-1 -mr-1"><X size={20} className="text-latitud-gray" /></button>
            </div>

            <div className="px-5 py-5 space-y-6">
              {/* Operation */}
              <div>
                <p className="text-xs font-semibold text-latitud-gray uppercase tracking-wider mb-2">¿Qué quieres hacer?</p>
                <div className="grid grid-cols-3 gap-2">
                  {OPERATIONS.map(o => (
                    <button key={o.value} onClick={() => setOperation(o.value)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 ${operation === o.value ? 'border-[#C9A45C] bg-[#E6D3A3]/15 text-latitud-black' : 'border-gray-100 text-latitud-gray'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zones */}
              <div>
                <p className="text-xs font-semibold text-latitud-gray uppercase tracking-wider mb-2">Zonas de interés</p>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-latitud-gray" />
                  <input value={zoneQuery} onChange={e => setZoneQuery(e.target.value)} placeholder="Buscar zona o ciudad"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-100 text-sm focus:border-[#C9A45C] focus:outline-none" />
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {filteredZones.map(z => (
                    <button key={z} onClick={() => toggleZone(z)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${zones.includes(z) ? 'border-[#C9A45C] bg-[#E6D3A3]/20 text-latitud-black' : 'border-gray-100 text-latitud-gray'}`}>
                      {z}
                    </button>
                  ))}
                  {filteredZones.length === 0 && <p className="text-xs text-latitud-gray">No se encontraron zonas.</p>}
                </div>
              </div>

              {/* Price */}
              <div>
                <p className="text-xs font-semibold text-latitud-gray uppercase tracking-wider mb-2">Rango de precio (MXN)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-latitud-gray block mb-1">Mínimo</label>
                    <input type="text" inputMode="numeric" value={priceMin ? formatThousands(priceMin) : ''} onChange={e => setPriceMin(parseThousands(e.target.value))} placeholder="0"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm focus:border-[#C9A45C] focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-latitud-gray block mb-1">Máximo</label>
                    <input type="text" inputMode="numeric" value={priceMax ? formatThousands(priceMax) : ''} onChange={e => setPriceMax(parseThousands(e.target.value))} placeholder="Sin límite"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm focus:border-[#C9A45C] focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* Bedrooms */}
              <div>
                <p className="text-xs font-semibold text-latitud-gray uppercase tracking-wider mb-2">Recámaras</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-latitud-gray block mb-1.5">Mínimo</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {BEDROOMS_MIN.map(n => (
                        <button key={n} onClick={() => setBedroomsMin(n)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${bedroomsMin === n ? 'border-[#C9A45C] bg-[#E6D3A3]/20 text-latitud-black' : 'border-gray-100 text-latitud-gray'}`}>
                          {n === 0 ? 'Cualquiera' : `${n}+`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-latitud-gray block mb-1.5">Máximo</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {BEDROOMS_MAX.map(n => (
                        <button key={n} onClick={() => setBedroomsMax(n)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${bedroomsMax === n ? 'border-[#C9A45C] bg-[#E6D3A3]/20 text-latitud-black' : 'border-gray-100 text-latitud-gray'}`}>
                          {n === 0 ? 'Cualquiera' : `≤ ${n}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <p className="text-xs font-semibold text-latitud-gray uppercase tracking-wider mb-2">Amenidades</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setWantsPool(v => !v)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${wantsPool ? 'border-[#C9A45C] bg-[#E6D3A3]/20 text-latitud-black' : 'border-gray-100 text-latitud-gray'}`}>
                    Alberca
                  </button>
                </div>
              </div>

              <button onClick={save} disabled={saving || !client?.id}
                className="w-full bg-[#C9A45C] text-latitud-black font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <div className="w-5 h-5 border-2 border-latitud-black/30 border-t-latitud-black rounded-full animate-spin" /> : 'Guardar preferencias'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}