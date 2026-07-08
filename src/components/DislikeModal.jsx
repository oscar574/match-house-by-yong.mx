import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const REASONS = ['Precio', 'Zona', 'Tamaño', 'Diseño', 'Tipo de propiedad', 'No tiene lo que busco', 'Otro'];

export default function DislikeModal({ open, onClose, onSubmit }) {
  const [selected, setSelected] = useState('');

  if (!open) return null;

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
          initial={{ y: 300 }}
          animate={{ y: 0 }}
          exit={{ y: 300 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={e => e.stopPropagation()}
          className="w-full bg-white rounded-t-3xl px-6 pt-6 pb-10"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg text-latitud-black">¿Qué no te gustó?</h3>
            <button onClick={onClose} className="p-1"><X size={20} className="text-latitud-gray" /></button>
          </div>
          <p className="text-sm text-latitud-gray mb-5">Esto nos ayuda a mostrarte mejores opciones.</p>

          <div className="space-y-2.5">
            {REASONS.map(r => (
              <button
                key={r}
                onClick={() => setSelected(r)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  selected === r ? 'border-latitud-orange bg-[#EAF2FF] text-latitud-black' : 'border-gray-100 text-latitud-gray'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => onSubmit('')}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-latitud-gray"
            >
              Omitir
            </button>
            <button
              onClick={() => onSubmit(selected)}
              disabled={!selected}
              className="flex-1 py-3 rounded-xl bg-latitud-orange text-white text-sm font-semibold disabled:opacity-40"
            >
              Enviar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}