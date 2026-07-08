import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LatitudLogo from '@/components/LatitudLogo';

const QUESTIONS = [
  {
    id: 'looking_for',
    question: '¿Qué estás buscando?',
    type: 'single',
    options: ['Comprar una casa', 'Comprar departamento', 'Comprar terreno', 'Invertir', 'Rentar', 'Solo estoy explorando']
  },
  {
    id: 'city',
    question: '¿En qué ciudad quieres buscar?',
    type: 'single',
    options: ['Mérida', 'Costa de Yucatán', 'Ciudad de México', 'Valle de Bravo', 'Otra zona']
  },
  {
    id: 'favorite_zones',
    question: '¿Qué zonas te interesan?',
    subtitle: 'Puedes seleccionar varias.',
    type: 'multi',
    options: ['Yucatán Country Club', 'Norte de Mérida', 'Centro de Mérida', 'Telchac', 'Progreso', 'Chelem', 'Ciudad de México', 'Santa Fe', 'Interlomas', 'Bosques de las Lomas', 'Valle de Bravo']
  },
  {
    id: 'budget_range',
    question: '¿Cuál es tu presupuesto?',
    type: 'single',
    options: ['Menos de $3M', '$3M a $5M', '$5M a $10M', '$10M a $20M', 'Más de $20M', 'Aún no estoy seguro']
  },
  {
    id: 'important_features',
    question: '¿Qué es más importante para ti?',
    subtitle: 'Selecciona máximo 3.',
    type: 'multi',
    maxSelect: 3,
    options: ['Ubicación', 'Precio', 'Inversión', 'Seguridad', 'Cercanía a escuelas', 'Cercanía a playa', 'Diseño y arquitectura', 'Jardín', 'Alberca', 'Campo de golf', 'Vista', 'Amenidades', 'Privacidad', 'Potencial de renta']
  },
  {
    id: 'estimated_purchase_date',
    question: '¿Cuándo planeas comprar o rentar?',
    type: 'single',
    options: ['Este mes', 'En 1 a 3 meses', 'En 3 a 6 meses', 'Más de 6 meses', 'Solo estoy explorando']
  },
  {
    id: 'payment_method',
    question: '¿Cómo planeas pagar?',
    type: 'single',
    options: ['Contado', 'Crédito hipotecario', 'Fideicomiso', 'Financiamiento', 'Aún no lo sé']
  },
  {
    id: 'bedrooms_wanted',
    question: '¿Cuántas recámaras necesitas?',
    type: 'single',
    options: ['1', '2', '3', '4 o más', 'No importa']
  }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [contactInfo, setContactInfo] = useState({ name: '', whatsapp: '', email: '' });
  const [saving, setSaving] = useState(false);

  const totalSteps = QUESTIONS.length + 1; // +1 for contact info
  const isContactStep = step === QUESTIONS.length;
  const currentQ = !isContactStep ? QUESTIONS[step] : null;
  const progress = ((step + 1) / totalSteps) * 100;

  const handleSelect = (option) => {
    if (currentQ.type === 'single') {
      setAnswers(prev => ({ ...prev, [currentQ.id]: option }));
      setTimeout(() => setStep(s => s + 1), 300);
    } else {
      const current = answers[currentQ.id] || [];
      if (current.includes(option)) {
        setAnswers(prev => ({ ...prev, [currentQ.id]: current.filter(o => o !== option) }));
      } else {
        if (currentQ.maxSelect && current.length >= currentQ.maxSelect) return;
        setAnswers(prev => ({ ...prev, [currentQ.id]: [...current, option] }));
      }
    }
  };

  const isSelected = (option) => {
    const val = answers[currentQ?.id];
    if (Array.isArray(val)) return val.includes(option);
    return val === option;
  };

  const handleFinish = async () => {
    if (!contactInfo.name || !contactInfo.whatsapp) return;
    setSaving(true);

    const lookingFor = answers.looking_for || '';
    let propertyType = '';
    if (lookingFor.includes('casa')) propertyType = 'Casa';
    else if (lookingFor.includes('departamento')) propertyType = 'Departamento';
    else if (lookingFor.includes('terreno')) propertyType = 'Terreno';

    const clientData = {
      name: contactInfo.name,
      whatsapp: contactInfo.whatsapp,
      email: contactInfo.email || '',
      city: answers.city || '',
      looking_for: answers.looking_for || '',
      property_type_wanted: propertyType,
      favorite_zones: answers.favorite_zones || [],
      budget_range: answers.budget_range || '',
      important_features: answers.important_features || [],
      estimated_purchase_date: answers.estimated_purchase_date || '',
      payment_method: answers.payment_method || '',
      bedrooms_wanted: answers.bedrooms_wanted || '',
      onboarding_completed: true,
      buyer_intent_score: 10,
      lead_score: 10,
      lead_status: 'explorando',
      commercial_stage: 'Onboarding completado',
      lead_source: 'MatchHouse',
      assigned_advisor: answers.city === 'Ciudad de México' ? 'Ana Martínez' : 'Carlos Ramírez'
    };

    const client = await base44.entities.Client.create(clientData);
    localStorage.setItem('latitud_client_id', client.id);
    localStorage.setItem('latitud_client_name', contactInfo.name);
    navigate('/discover');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/')}
            className="p-2 -ml-2 text-latitud-gray"
          >
            <ArrowLeft size={24} />
          </button>
          <LatitudLogo size="sm" />
          <div className="w-10" />
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-latitud-light rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-latitud-orange rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <p className="text-xs text-latitud-gray mt-2">{step + 1} de {totalSteps}</p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pt-6 pb-8 flex flex-col">
        <AnimatePresence mode="wait">
          {!isContactStep ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="font-heading text-2xl text-latitud-black mb-1 leading-tight">
                {currentQ.question}
              </h2>
              {currentQ.subtitle && (
                <p className="text-latitud-gray text-sm mb-6">{currentQ.subtitle}</p>
              )}
              {!currentQ.subtitle && <div className="mb-6" />}

              <div className="space-y-3 flex-1">
                {currentQ.options.map(option => (
                  <motion.button
                    key={option}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect(option)}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-sm font-medium flex items-center justify-between ${
                      isSelected(option)
                        ? 'border-latitud-orange bg-orange-50 text-latitud-black'
                        : 'border-gray-100 bg-white text-latitud-gray hover:border-gray-200'
                    }`}
                  >
                    <span>{option}</span>
                    {isSelected(option) && (
                      <div className="w-5 h-5 rounded-full bg-latitud-orange flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>

              {currentQ.type === 'multi' && (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!(answers[currentQ.id]?.length > 0)}
                  className="mt-6 w-full bg-latitud-orange text-white font-semibold py-4 rounded-xl disabled:opacity-40 transition-opacity"
                >
                  Continuar
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="contact"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="font-heading text-2xl text-latitud-black mb-2 leading-tight">
                ¿Cómo podemos llamarte?
              </h2>
              <p className="text-latitud-gray text-sm mb-8">
                Para personalizar tu experiencia y conectarte con un asesor.
              </p>

              <div className="space-y-5 flex-1">
                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block">Nombre</label>
                  <input
                    type="text"
                    value={contactInfo.name}
                    onChange={e => setContactInfo(p => ({ ...p, name: e.target.value }))}
                    placeholder="Tu nombre"
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-latitud-orange focus:outline-none text-latitud-black text-base transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block">WhatsApp</label>
                  <input
                    type="tel"
                    value={contactInfo.whatsapp}
                    onChange={e => setContactInfo(p => ({ ...p, whatsapp: e.target.value }))}
                    placeholder="+52 999 123 4567"
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-latitud-orange focus:outline-none text-latitud-black text-base transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-2 block">Correo <span className="text-latitud-gray/50">(opcional)</span></label>
                  <input
                    type="email"
                    value={contactInfo.email}
                    onChange={e => setContactInfo(p => ({ ...p, email: e.target.value }))}
                    placeholder="tu@correo.com"
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-latitud-orange focus:outline-none text-latitud-black text-base transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleFinish}
                disabled={!contactInfo.name || !contactInfo.whatsapp || saving}
                className="mt-6 w-full bg-latitud-orange text-white font-semibold py-4 rounded-xl disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Comenzar a descubrir'
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}