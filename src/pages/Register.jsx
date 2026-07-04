import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import LatitudLogo from '@/components/LatitudLogo';

export default function Register() {
  const [step, setStep] = useState('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    setError('');
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Error al registrarse.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { access_token } = await base44.auth.verifyOtp({ email, otpCode });
      base44.auth.setToken(access_token);
      window.location.href = '/admin';
    } catch (err) {
      setError('Código incorrecto. Intenta de nuevo.');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    await base44.auth.resendOtp(email);
  };

  return (
    <div className="min-h-screen bg-latitud-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <LatitudLogo variant="white" size="lg" />
        </div>

        {step === 'register' ? (
          <>
            <h2 className="font-heading text-2xl text-white text-center mb-2">Crear cuenta</h2>
            <p className="text-white/50 text-sm text-center mb-8">Regístrate para acceder al panel de asesores.</p>
            <form onSubmit={handleRegister} className="space-y-4">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:border-latitud-orange focus:outline-none" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:border-latitud-orange focus:outline-none" />
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmar contraseña" className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:border-latitud-orange focus:outline-none" />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading || !email || !password} className="w-full bg-latitud-orange text-white font-semibold py-4 rounded-xl disabled:opacity-50 flex items-center justify-center">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Crear cuenta'}
              </button>
            </form>
            <button onClick={() => base44.auth.loginWithProvider('google', '/admin')} className="w-full border border-white/20 text-white py-3.5 rounded-xl font-medium text-sm mt-4 hover:bg-white/5 transition-colors">
              Continuar con Google
            </button>
            <a href="/login" className="block text-center text-white/40 text-sm mt-6 hover:text-latitud-orange transition-colors">¿Ya tienes cuenta? Inicia sesión</a>
          </>
        ) : (
          <>
            <h2 className="font-heading text-2xl text-white text-center mb-2">Verificar correo</h2>
            <p className="text-white/50 text-sm text-center mb-8">Ingresa el código que enviamos a {email}</p>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="Código de verificación" className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:border-latitud-orange focus:outline-none text-center text-lg tracking-widest" />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading || !otpCode} className="w-full bg-latitud-orange text-white font-semibold py-4 rounded-xl disabled:opacity-50 flex items-center justify-center">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verificar'}
              </button>
            </form>
            <button onClick={handleResend} className="block text-center text-white/40 text-sm mt-4 hover:text-latitud-orange transition-colors w-full">Reenviar código</button>
          </>
        )}
      </div>
    </div>
  );
}