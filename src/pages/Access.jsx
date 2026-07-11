import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import LatitudLogo from '@/components/LatitudLogo';
import { base44 } from '@/api/base44Client';
import { normalizePhoneMX, isValidMX, formatPhoneDisplay } from '@/lib/phoneNormalize';

export default function Access() {
  const navigate = useNavigate();
  const [step, setStep] = useState('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const normalized = normalizePhoneMX(phoneInput);

  const sendCode = async () => {
    setError('');
    if (!isValidMX(normalized)) {
      setError('Ingresa un teléfono mexicano válido de 10 dígitos.');
      return;
    }
    setSending(true);
    try {
      const res = await base44.functions.invoke('clientAccess', { action: 'sendOtp', phone: normalized });
      const data = res.data || {};
      if (!data.ok) { setError(data.error || 'No se pudo enviar el código.'); setSending(false); return; }
      if (data.demoCode) setDemoCode(data.demoCode);
      localStorage.setItem('latitud_pending_phone', normalized);
      setStep('code');
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Error al enviar el código.');
    }
    setSending(false);
  };

  const verify = async () => {
    setError('');
    const phone = localStorage.getItem('latitud_pending_phone');
    if (!phone) { setStep('phone'); return; }
    setVerifying(true);
    try {
      const res = await base44.functions.invoke('clientAccess', { action: 'verifyOtp', phone, code });
      const data = res.data || {};
      if (!data.ok) { setError(data.error || 'Código incorrecto.'); setVerifying(false); return; }
      localStorage.setItem('latitud_client_id', data.client_id);
      localStorage.setItem('latitud_session_token', data.session_token);
      localStorage.removeItem('latitud_pending_phone');
      navigate(data.needsOnboarding ? '/onboarding' : '/discover', { replace: true });
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Error al verificar.');
    }
    setVerifying(false);
  };

  const resend = async () => {
    setCode('');
    setError('');
    await sendCode();
  };

  return (
    <div className="min-h-screen bg-latitud-black flex flex-col">
      <div className="px-4 pt-6 pb-2 flex items-center justify-between">
        <button onClick={() => (step === 'code' ? setStep('phone') : navigate('/'))} className="p-2 -ml-2 text-white/70">
          <ArrowLeft size={22} />
        </button>
        <LatitudLogo variant="white" size="sm" />
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-10">
        <div className="w-full max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-latitud-orange/15 flex items-center justify-center mb-5">
            <ShieldCheck size={26} className="text-latitud-orange" />
          </div>

          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="font-heading text-2xl text-white mb-2">Acceso con WhatsApp</h1>
                <p className="text-white/50 text-sm mb-6">Te enviaremos un código de 6 dígitos por WhatsApp para verificar tu número.</p>
                <label className="text-xs text-white/50 uppercase tracking-wider mb-1.5 block">Tu teléfono</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  placeholder="999 123 4567"
                  className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-lg focus:border-latitud-orange focus:outline-none"
                />
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                <button
                  onClick={sendCode}
                  disabled={sending || !isValidMX(normalized)}
                  className="w-full bg-latitud-orange text-latitud-black font-semibold py-4 rounded-xl mt-5 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : 'Enviar código'}
                </button>
                {isValidMX(normalized) && (
                  <p className="text-white/30 text-xs text-center mt-3">Lo enviaremos a {formatPhoneDisplay(normalized)}</p>
                )}
              </motion.div>
            ) : (
              <motion.div key="code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="font-heading text-2xl text-white mb-2">Ingresa el código</h1>
                <p className="text-white/50 text-sm mb-5">Lo enviamos a {formatPhoneDisplay(normalized)}</p>
                {demoCode && (
                  <div className="bg-latitud-orange/15 border border-latitud-orange/30 rounded-xl px-4 py-3 mb-5">
                    <p className="text-latitud-orange text-sm font-semibold">Modo demo</p>
                    <p className="text-white/70 text-xs mt-0.5">Usa el código <span className="font-bold tracking-widest">{demoCode}</span></p>
                  </div>
                )}
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/10 text-white text-center text-2xl tracking-[0.5em] focus:border-latitud-orange focus:outline-none"
                />
                {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
                <button
                  onClick={verify}
                  disabled={verifying || code.length !== 6}
                  className="w-full bg-latitud-orange text-latitud-black font-semibold py-4 rounded-xl mt-5 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {verifying ? <Loader2 size={18} className="animate-spin" /> : 'Verificar y entrar'}
                </button>
                <button onClick={resend} disabled={sending} className="w-full flex items-center justify-center gap-2 text-white/50 text-sm mt-3 py-2">
                  <RefreshCw size={14} /> Reenviar código
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}