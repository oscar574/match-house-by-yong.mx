import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import LatitudLogo from '@/components/LatitudLogo';

export default function ResetPassword() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setError('');
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken: token, newPassword: password });
      window.location.href = '/login';
    } catch (err) {
      setError('Error al restablecer contraseña. El enlace puede haber expirado.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-latitud-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10"><LatitudLogo variant="white" size="lg" /></div>
        <h2 className="font-heading text-2xl text-white text-center mb-2">Nueva contraseña</h2>
        <p className="text-white/50 text-sm text-center mb-8">Ingresa tu nueva contraseña.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nueva contraseña" className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:border-latitud-orange focus:outline-none" />
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirmar contraseña" className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:border-latitud-orange focus:outline-none" />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading || !password || !confirm} className="w-full bg-latitud-orange text-white font-semibold py-4 rounded-xl disabled:opacity-50 flex items-center justify-center">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Restablecer contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}