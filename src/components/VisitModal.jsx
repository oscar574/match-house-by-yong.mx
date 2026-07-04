import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DAYS = ['Hoy', 'Mañana', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const TIMES = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

export default function VisitModal({ open, onClose, property, clientId, clientName, onSubmit }) {
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open || !property) return null;

  const handleSubmit = async () => {
    setSaving(true);
    await base44.entities.VisitRequest.create({
      client_id: clientId,
      client_name: clientName || '',
      property_id: property.id,
      property_title: property.title,
      preferred_day: day,
      preferred_time: time,
      comment,
      advisor_name: property.advisor_name || ''
    });
    setSaving(false);
    onSubmit();
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
          className="w-full bg-white rounded-t-3xl px-6 pt-6 pb-10 max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg text-latitud-black">Solicitar visita</h3>
            <button onClick={onClose} className="p-1"><X size={20} className="text-latitud-gray" /></button>
          </div>
          <p className="text-sm text-latitud-gray mb-5">{property.title}</p>

          <div className="mb-5">
            <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block">Día preferido</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => setDay(d)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    day === d ? 'border-latitud-orange bg-orange-50 text-latitud-black' : 'border-gray-100 text-latitud-gray'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block">Horario preferido</label>
            <div className="flex flex-wrap gap-2">
              {TIMES.map(t => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    time === t ? 'border-latitud-orange bg-orange-50 text-latitud-black' : 'border-gray-100 text-latitud-gray'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block">Comentario <span className="text-latitud-gray/50">(opcional)</span></label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="¿Algo que debamos saber?"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!day || !time || saving}
            className="w-full bg-latitud-orange text-white font-semibold py-4 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}