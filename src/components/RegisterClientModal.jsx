import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { normalizePhoneMX, isValidMX, formatPhoneDisplay } from '@/lib/phoneNormalize';
import { budgetLabel } from '@/lib/clientFilters';
import { formatThousands, parseThousands } from '@/lib/priceFormat';
import { useToast } from '@/components/ui/use-toast';

const OPERATIONS = [
  { value: 'Comprar', label: 'Comprar' },
  { value: 'Rentar', label: 'Rentar' },
  { value: 'Explorar', label: 'Solo explorar' }
];

export default function RegisterClientModal({ open, onClose, onExisting, onCreated }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [email, setEmail] = useState('');
  const [operation, setOperation] = useState('Explorar');
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [bedroomsMin, setBedroomsMin] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(''); setPhoneInput(''); setEmail(''); setOperation('Explorar');
      setPriceMin(0); setPriceMax(0); setBedroomsMin(0);
    }
  }, [open]);

  if (!open) return null;
  const normalized = normalizePhoneMX(phoneInput);
  const phoneValid = isValidMX(normalized);
  const canSave = name.trim() && phoneValid && !saving;

  const submit = async () => {
    setSaving(true);
    try {
      // Search by normalized phone — never duplicate.
      const existing = await base44.entities.Client.filter({ whatsapp: normalized });
      if (existing.length > 0) {
        const master = existing.find(c => !c.duplicate_of) || existing[0];
        toast({ title: 'Este cliente ya está registrado', description: 'Abrimos su registro existente.' });
        onExisting(master.id);
        return;
      }
      const created = await base44.entities.Client.create({
        name: name.trim(),
        whatsapp: normalized,
        email: email.trim(),
        operation_preference: operation,
        budget_min_estimated: priceMin || 0,
        budget_max_estimated: priceMax || 0,
        budget_range: budgetLabel(priceMin || 0, priceMax || 0),
        preferred_bedrooms: bedroomsMin || 0,
        bedrooms_wanted: bedroomsMin > 0 ? `${bedroomsMin}+` : 'No importa',
        property_type_wanted: 'Casa',
        city: 'Mérida',
        phone_verified: false,
        onboarding_completed: false,
        commercial_stage: 'Nuevo',
        lead_source: 'Asesor (alta manual)',
        assigned_advisor: 'Carlos Ramírez'
      });
      toast({ title: 'Cliente registrado', description: 'Cuando verifique su WhatsApp, se vinculará a este registro.' });
      onCreated(created.id);
    } catch (e) {
      toast({ title: 'Error al registrar', description: e.message || 'Intenta de nuevo.' });
    }
    setSaving(false);
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
        <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} transition={{ type: 'spring', damping: 25 }} onClick={e => e.stopPropagation()} className="w-full bg-white rounded-t-3xl px-6 pt-6 pb-10 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading text-xl text-latitud-black">Registrar cliente</h3>
            <button onClick={onClose} className="p-1"><X size={20} className="text-latitud-gray" /></button>
          </div>
          <p className="text-sm text-latitud-gray mb-5">Si el teléfono ya existe, abrimos el registro existente — nunca se duplica.</p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">Nombre *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del cliente" className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">WhatsApp *</label>
              <input type="tel" inputMode="numeric" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="999 123 4567" className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none" />
              {phoneInput && !phoneValid && <p className="text-[10px] text-red-500 mt-1">Teléfono mexicano de 10 dígitos</p>}
              {phoneValid && <p className="text-[10px] text-latitud-gray mt-1">Se guardará como {formatPhoneDisplay(normalized)}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">Correo <span className="text-latitud-gray/50">(opcional)</span></label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none" />
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-latitud-gray uppercase tracking-wider mb-3">Preferencias (opcional)</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {OPERATIONS.map(o => (
                  <button key={o.value} onClick={() => setOperation(o.value)} className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 ${operation === o.value ? 'border-latitud-orange bg-[#E6D3A3]/15 text-latitud-black' : 'border-gray-100 text-latitud-gray'}`}>{o.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] text-latitud-gray block mb-1">Presupuesto mín</label>
                  <input type="text" inputMode="numeric" value={priceMin ? formatThousands(priceMin) : ''} onChange={e => setPriceMin(parseThousands(e.target.value))} placeholder="0" className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-latitud-gray block mb-1">Presupuesto máx</label>
                  <input type="text" inputMode="numeric" value={priceMax ? formatThousands(priceMax) : ''} onChange={e => setPriceMax(parseThousands(e.target.value))} placeholder="Sin límite" className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-latitud-gray block mb-1.5">Recámaras mín</label>
                <div className="flex gap-2 flex-wrap">
                  {[0, 1, 2, 3, 4].map(n => (
                    <button key={n} onClick={() => setBedroomsMin(n)} className={`px-3 py-2 rounded-xl text-sm font-medium border-2 ${bedroomsMin === n ? 'border-latitud-orange bg-[#E6D3A3]/15 text-latitud-black' : 'border-gray-100 text-latitud-gray'}`}>{n === 0 ? 'Cualquiera' : `${n}+`}</button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={submit} disabled={!canSave} className="w-full bg-latitud-orange text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 mt-2">
              {saving ? <Loader2 size={18} className="animate-spin" /> : 'Registrar cliente'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}