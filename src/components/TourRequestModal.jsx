import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, CheckCircle, Clock, MessageCircle, MapPin, Home } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { addLeadScore, ensureLeadTask } from '@/lib/leadScoring';
import { brandConfig } from '@/lib/brandConfig';

const TIMES = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

const dayLabel = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
};

const buildWhatsAppMessage = (client, properties) => {
  const titles = properties.map(p => `• ${p.title} (${p.zone})`).join('\n');
  const zones = [...new Set(properties.map(p => p.zone).filter(Boolean))].slice(0, 3).join(', ');
  const prices = properties.map(p => p.price).filter(Boolean);
  const range = prices.length
    ? `$${Math.min(...prices).toLocaleString()} – $${Math.max(...prices).toLocaleString()}`
    : client?.budget_range || '—';
  return (brandConfig.default_whatsapp_message_template || '')
    .replace('{{client_name}}', client?.name || '')
    .replace('{{property_titles}}', titles)
    .replace('{{budget_range}}', range)
    .replace('{{preferred_zones}}', zones || '—');
};

export default function TourRequestModal({ open, onClose, properties, client, clientId, onSubmit }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [waLink, setWaLink] = useState('');

  useEffect(() => {
    if (open) { setDate(''); setTime(''); setNotes(''); setDone(false); setWaLink(''); }
  }, [open]);

  if (!open) return null;

  const propertyIds = properties.map(p => p.id);
  const titles = properties.map(p => p.title);
  const zones = [...new Set(properties.map(p => p.zone).filter(Boolean))];
  const prices = properties.map(p => p.price).filter(Boolean);
  const priceRange = prices.length
    ? `$${Math.min(...prices).toLocaleString()} – $${Math.max(...prices).toLocaleString()}`
    : client?.budget_range || '—';
  const waTarget = (brandConfig.advisor_whatsapp || brandConfig.company_whatsapp || brandConfig.contact_whatsapp || '').replace(/[^0-9]/g, '');
  const isVerified = client?.phone_verified || brandConfig.demo_whatsapp_otp_enabled;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await base44.entities.TourRequest.create({
        client_id: clientId,
        client_name: client?.name || '',
        client_whatsapp: client?.whatsapp || '',
        client_email: client?.email || '',
        advisor_name: client?.assigned_advisor || '',
        property_ids: propertyIds,
        favorite_property_ids_snapshot: propertyIds,
        property_titles: titles,
        zones_summary: zones.slice(0, 4).join(', '),
        price_range_summary: priceRange,
        property_count: properties.length,
        requested_date: date,
        requested_time: time,
        preferred_day: dayLabel(date),
        notes,
        status: 'solicitada',
        whatsapp_verified: !!isVerified,
        buyer_intent_score: client?.buyer_intent_score ?? client?.lead_score ?? 0,
        source: 'favorites_tour_request'
      });

      const c = await base44.entities.Client.get(clientId);
      const { score, status } = addLeadScore(c.lead_score || 0, 'REQUEST_TOUR', true);
      await base44.entities.Client.update(clientId, {
        lead_score: score,
        buyer_intent_score: score,
        lead_status: status,
        visit_requests_count: (c.visit_requests_count || 0) + 1,
        last_activity_date: new Date().toISOString()
      });

      await ensureLeadTask({
        clientId,
        clientName: client?.name,
        advisor: client?.assigned_advisor,
        title: `Confirmar recorrido - ${client?.name} (${properties.length} propiedades)`,
        taskType: 'Confirmación de visita',
        priority: 'Alta'
      });

      if (waTarget) {
        const msg = buildWhatsAppMessage(client, properties);
        setWaLink(`https://wa.me/${waTarget}?text=${encodeURIComponent(msg)}`);
      }
    } catch (e) { /* ignore */ }
    setSaving(false);
    setDone(true);
  };

  const openWhatsApp = async () => {
    if (!waLink) return;
    try {
      const c = await base44.entities.Client.get(clientId);
      const { score } = addLeadScore(c.lead_score || 0, 'OPEN_WHATSAPP', true);
      await base44.entities.Client.update(clientId, { buyer_intent_score: score, lead_score: score });
    } catch (e) { /* ignore */ }
    window.open(waLink, '_blank');
  };

  const canSubmit = date && time && !saving && properties.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 400 }}
          animate={{ y: 0 }}
          exit={{ y: 400 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={e => e.stopPropagation()}
          className="w-full bg-white rounded-t-3xl px-6 pt-6 pb-10 max-h-[90vh] overflow-y-auto"
        >
          {done ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#E6D3A3]/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-[#C9A45C]" />
              </div>
              <h3 className="font-heading text-xl text-latitud-black mb-2">Listo.</h3>
              <p className="text-sm text-latitud-gray max-w-xs mx-auto mb-5">
                Tu asesor recibió tu selección y te contactará por WhatsApp para confirmar el recorrido.
              </p>
              {waLink ? (
                <button
                  onClick={openWhatsApp}
                  className="w-full bg-[#25D366] text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 mb-2"
                >
                  <MessageCircle size={18} /> Abrir WhatsApp
                </button>
              ) : (
                <p className="text-[11px] text-latitud-gray">Tu asesor recibirá esta solicitud dentro del panel.</p>
              )}
              <button onClick={onSubmit} className="w-full text-sm text-latitud-gray font-medium py-2">Cerrar</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-heading text-xl text-latitud-black">Agendar recorrido</h3>
                <button onClick={onClose} className="p-1"><X size={20} className="text-latitud-gray" /></button>
              </div>
              <p className="text-sm text-latitud-gray mb-4">Tu asesor recibirá estas propiedades para ayudarte a organizar el recorrido.</p>

              {/* Resumen */}
              <div className="rounded-xl border border-[#C9A45C]/30 bg-[#FFFDF8] p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Home size={14} className="text-[#C9A45C]" />
                  <span className="text-sm font-semibold text-latitud-black">{properties.length} propiedades en tu selección</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="text-latitud-gray mt-0.5 shrink-0" />
                    <span className="text-latitud-gray"><span className="text-latitud-black font-medium">Zonas:</span> {zones.slice(0, 4).join(', ') || '—'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-latitud-gray mt-0.5">$</span>
                    <span className="text-latitud-gray"><span className="text-latitud-black font-medium">Rango:</span> {priceRange}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageCircle size={12} className="text-latitud-gray mt-0.5 shrink-0" />
                    <span className="text-latitud-gray"><span className="text-latitud-black font-medium">WhatsApp:</span> {client?.whatsapp || '—'} {isVerified && <span className="text-green-600 font-medium">· verificado</span>}</span>
                  </div>
                </div>
                {/* mini list */}
                <div className="mt-3 pt-3 border-t border-[#C9A45C]/15 space-y-1">
                  {properties.slice(0, 5).map(p => (
                    <p key={p.id} className="text-[11px] text-latitud-gray truncate">• {p.title}</p>
                  ))}
                  {properties.length > 5 && <p className="text-[11px] text-latitud-gray/60">+ {properties.length - 5} más</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">Fecha preferida</label>
                  <input
                    type="date"
                    value={date}
                    min={todayISO()}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block flex items-center gap-1"><Clock size={11} /> Horario preferido</label>
                  <div className="flex flex-wrap gap-2">
                    {TIMES.map(t => (
                      <button
                        key={t}
                        onClick={() => setTime(t)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                          time === t ? 'border-latitud-orange bg-[#E6D3A3]/25 text-latitud-black' : 'border-gray-100 text-latitud-gray'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block">Comentario <span className="text-latitud-gray/50">(opcional)</span></label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ej. Me gustaría visitar las casas de Temozón y Cabo Norte este fin de semana."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none resize-none transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full bg-latitud-orange text-latitud-black font-semibold py-4 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 mt-6 active:scale-[0.99] transition-transform accent-glow"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-latitud-black/30 border-t-latitud-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Calendar size={18} />
                    Solicitar recorrido
                  </>
                )}
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}