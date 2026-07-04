import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import LatitudLogo from '@/components/LatitudLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = '/admin';
    } catch (err) {
      setError('Credenciales incorrectas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider('google', '/admin');
  };

  return (
    <div className="min-h-screen bg-latitud-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <LatitudLogo variant="white" size="lg" />
        </div>
        <h2 className="font-heading text-2xl text-white text-center mb-2">Panel de Asesores</h2>
        <p className="text-white/50 text-sm text-center mb-8">Inicia sesión para acceder al panel interno.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:border-latitud-orange focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:border-latitud-orange focus:outline-none"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-latitud-orange text-white font-semibold py-4 rounded-xl disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Iniciar sesión'}
          </button>
        </form>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs">o</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button onClick={handleGoogle} className="w-full border border-white/20 text-white py-3.5 rounded-xl font-medium text-sm hover:bg-white/5 transition-colors">
          Continuar con Google
        </button>

        <a href="/forgot-password" className="block text-center text-white/40 text-sm mt-6 hover:text-latitud-orange transition-colors">
          ¿Olvidaste tu contraseña?
        </a>
      </div>
    </div>
  );
}