import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, CheckCircle, Clock, Pencil, MessageCircle } from 'lucide-react';
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

export default function VisitModal({ open, onClose, property, clientId, clientName, onSubmit }) {
  const [client, setClient] = useState(null);
  const [name, setName] = useState(clientName || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [editContact, setEditContact] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);

  const demoMode = brandConfig.demo_whatsapp_otp_enabled;

  useEffect(() => {
    if (open && clientId) {
      setLoadingClient(true);
      base44.entities.Client.get(clientId)
        .then(c => {
          setClient(c);
          setName(c.name || clientName || '');
          setPhone(c.whatsapp || '');
          setEmail(c.email || '');
        })
        .catch(() => { setName(clientName || ''); })
        .finally(() => setLoadingClient(false));
    }
  }, [open, clientId]);

  if (!open || !property) return null;

  const hasStoredContact = client?.name && client?.whatsapp;
  const isVerified = client?.phone_verified || demoMode;
  const showContactForm = !hasStoredContact || editContact;

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

    if (clientId && (name !== client?.name || phone !== client?.whatsapp || email !== client?.email)) {
      try { await base44.entities.Client.update(clientId, { name, whatsapp: phone, email }); } catch (e) { /* ignore */ }
    }

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

    try {
      await ensureLeadTask({
        clientId,
        clientName: name,
        advisor: property.advisor_name,
        title: `Confirmar cita - ${property.title}`,
        taskType: 'Confirmación de visita',
        priority: 'Alta',
        propertyId: property.id,
        propertyName: property.title
      });
    } catch (e) { /* ignore */ }

    setSaving(false);
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setDate(''); setTime(''); setComment(''); setEditContact(false);
      onSubmit();
    }, 2800);
  };

  const contactValid = name && phone && (!email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
  const canSubmit = date && time && (showContactForm ? contactValid : true) && !saving;

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
          className="w-full bg-white rounded-t-3xl px-6 pt-6 pb-10 max-h-[88vh] overflow-y-auto"
        >
          {done ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-[#E6D3A3]/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-[#C9A45C]" />
              </div>
              <h3 className="font-heading text-xl text-latitud-black mb-2">Listo.</h3>
              <p className="text-sm text-latitud-gray max-w-xs mx-auto">
                Recibimos tu solicitud de visita. Un asesor te confirmará por WhatsApp.
              </p>
            </div>
          ) : loadingClient ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-heading text-xl text-latitud-black">Agendar visita</h3>
                <button onClick={onClose} className="p-1"><X size={20} className="text-latitud-gray" /></button>
              </div>
              <p className="text-sm text-latitud-gray mb-5">{property.title}</p>

              <div className="space-y-4">
                {/* Frictionless: show stored contact summary instead of re-asking */}
                {!showContactForm && (
                  <div className="rounded-xl border border-[#C9A45C]/30 bg-[#FFFDF8] p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#E6D3A3]/30 flex items-center justify-center shrink-0">
                      <MessageCircle size={16} className="text-[#C9A45C]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-latitud-gray">Tu asesor usará este WhatsApp para confirmar la visita</p>
                      <p className="text-sm font-semibold text-latitud-black truncate">{phone}</p>
                    </div>
                    <button onClick={() => setEditContact(true)} className="text-[10px] text-[#C9A45C] font-semibold flex items-center gap-1 shrink-0">
                      <Pencil size={11} /> Editar
                    </button>
                  </div>
                )}

                {showContactForm && (
                  <>
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
                    <div>
                      <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">WhatsApp</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+52 999 123 4567"
                        className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">Correo <span className="text-latitud-gray/50">(opcional)</span></label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Tu correo"
                        className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none transition-colors"
                      />
                      {email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && (
                        <p className="text-[10px] text-red-500 mt-1">Ingresa un correo válido</p>
                      )}
                    </div>
                    <p className="text-[10px] text-latitud-gray/70">No spam. Solo seguimiento sobre tus matches y visitas.</p>
                  </>
                )}

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
                disabled={!canSubmit}
                className="w-full bg-latitud-orange text-latitud-black font-semibold py-4 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 mt-6 active:scale-[0.99] transition-transform accent-glow"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-latitud-black/30 border-t-latitud-black rounded-full animate-spin" />
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