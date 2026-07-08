import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, CheckCircle, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { addLeadScore } from '@/lib/leadScoring';

const TIMES = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

// Convert ISO date + time to a readable day label for AdminVisits compat
const dayLabel = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
};

export default function VisitModal({ open, onClose, property, clientId, clientName, onSubmit }) {
  const [name, setName] = useState(clientName || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (!open || !property) return null;

  const handleSubmit = async () => {
    setSaving(true);
    await base44.entities.VisitRequest.create({
      client_id: clientId,
      client_name: name,
      client_whatsapp: phone,
      client_email: email,
      property_id: property.id,
      property_title: property.title,
      requested_date: date,
      requested_time: time,
      preferred_day: dayLabel(date),
      preferred_time: time,
      comment,
      advisor_name: property.advisor_name || '',
      status: 'solicitada'
    });

    // Update lead score
    if (clientId) {
      try {
        const c = await base44.entities.Client.get(clientId);
        const { score, status } = addLeadScore(c.lead_score || 0, 'REQUEST_VISIT', true);
        const updates = {
          lead_score: score,
          buyer_intent_score: score,
          lead_status: status,
          visit_requests_count: (c.visit_requests_count || 0) + 1,
          last_activity_date: new Date().toISOString()
        };
        if (!c.high_interest_property_ids?.includes(property.id)) {
          updates.high_interest_property_ids = [...(c.high_interest_property_ids || []), property.id];
        }
        await base44.entities.Client.update(clientId, updates);
      } catch (e) { /* ignore */ }
    }

    setSaving(false);
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setDate(''); setTime(''); setComment(''); setPhone(''); setEmail('');
      onSubmit();
    }, 2500);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 400 }}
          animate={{ y: 0 }}
          exit={{ y: 400 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={e => e.stopPropagation()}
          className="w-full bg-white rounded-t-3xl px-6 pt-6 pb-10 max-h-[88vh] overflow-y-auto"
        >
          {done ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h3 className="font-heading text-xl text-latitud-black mb-2">¡Solicitud enviada!</h3>
              <p className="text-sm text-latitud-gray max-w-xs mx-auto">
                Recibimos tu solicitud de visita. Un asesor de MatchHouse te confirmará el horario disponible a la brevedad.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-heading text-xl text-latitud-black">Agendar visita</h3>
                <button onClick={onClose} className="p-1"><X size={20} className="text-latitud-gray" /></button>
              </div>
              <p className="text-sm text-latitud-gray mb-5">{property.title}</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">Nombre completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">Teléfono</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="WhatsApp"
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">Correo</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Tu correo"
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">Fecha de la visita</label>
                  <input
                    type="date"
                    value={date}
                    min={todayISO()}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block flex items-center gap-1"><Clock size={11} /> Hora preferida</label>
                  <div className="flex flex-wrap gap-2">
                    {TIMES.map(t => (
                      <button
                        key={t}
                        onClick={() => setTime(t)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                          time === t ? 'border-latitud-orange bg-[#EAF2FF] text-latitud-black' : 'border-gray-100 text-latitud-gray'
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
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="¿Algo que debamos saber?"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none resize-none transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!name || !phone || !date || !time || saving}
                className="w-full bg-latitud-orange text-white font-semibold py-4 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 mt-6 active:scale-[0.99] transition-transform accent-glow"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Calendar size={18} />
                    Solicitar visita
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