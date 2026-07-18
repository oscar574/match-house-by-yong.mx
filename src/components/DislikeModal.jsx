import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const REASONS = ['Precio', 'Diseño', 'No tiene lo que busco', 'Tamaño', 'Zona', 'Otro'];

export default function DislikeModal({ open, onClose, onSubmit }) {
  const [selected, setSelected] = useState('');
  const [locked, setLocked] = useState(false);

  // Reset state on each open
  useEffect(() => {
    if (open) { setSelected(''); setLocked(false); }
  }, [open]);

  // Single tap registers immediately: show selection briefly, then submit + close
  const handleSelect = (r) => {
    if (locked) return;
    setSelected(r);
    setLocked(true);
    setTimeout(() => onSubmit(r), 180);
  };

  // Closing (backdrop / X) discards without feedback — replaces "Omitir"
  const handleClose = () => {
    if (locked) return;
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="dislike"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
          onClick={handleClose}
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
              <button onClick={handleClose} className="p-1"><X size={20} className="text-latitud-gray" /></button>
            </div>
            <p className="text-sm text-latitud-gray mb-5">Esto nos ayuda a mostrarte mejores opciones.</p>

            <div className="space-y-2.5">
              {REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => handleSelect(r)}
                  disabled={locked}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    selected === r ? 'border-latitud-orange bg-[#EAF2FF] text-latitud-black' : 'border-gray-100 text-latitud-gray'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}