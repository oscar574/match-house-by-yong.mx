import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import LatitudLogo from '@/components/LatitudLogo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {}
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-latitud-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10"><LatitudLogo variant="white" size="lg" /></div>
        <h2 className="font-heading text-2xl text-white text-center mb-2">Recuperar contraseña</h2>
        {!sent ? (
          <>
            <p className="text-white/50 text-sm text-center mb-8">Ingresa tu correo y te enviaremos instrucciones.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:border-latitud-orange focus:outline-none" />
              <button type="submit" disabled={loading || !email} className="w-full bg-latitud-orange text-white font-semibold py-4 rounded-xl disabled:opacity-50 flex items-center justify-center">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Enviar instrucciones'}
              </button>
            </form>
          </>
        ) : (
          <p className="text-white/60 text-sm text-center mt-4">Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.</p>
        )}
        <a href="/login" className="block text-center text-white/40 text-sm mt-6 hover:text-latitud-orange transition-colors">Volver a iniciar sesión</a>
      </div>
    </div>
  );
}