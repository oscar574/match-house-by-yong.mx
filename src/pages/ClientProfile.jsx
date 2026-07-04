import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ThumbsDown, Calendar, MapPin, Star, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LatitudLogo from '@/components/LatitudLogo';

export default function ClientProfile() {
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const clientId = localStorage.getItem('latitud_client_id');
    if (!clientId) { setLoading(false); return; }
    
    const [clientData, allReactions] = await Promise.all([
      base44.entities.Client.get(clientId),
      base44.entities.Reaction.filter({ client_id: clientId })
    ]);
    
    setClient(clientData);
    setReactions(allReactions);
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('latitud_client_id');
    localStorage.removeItem('latitud_client_name');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <p className="text-latitud-gray mb-4">No se encontró tu perfil.</p>
        <button onClick={() => navigate('/')} className="bg-latitud-orange text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
          Iniciar de nuevo
        </button>
      </div>
    );
  }

  const likes = reactions.filter(r => r.reaction_type === 'like');
  const dislikes = reactions.filter(r => r.reaction_type === 'dislike');
  const visitReqs = reactions.filter(r => r.reaction_type === 'visit_request');

  return (
    <div className="min-h-screen bg-latitud-light">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/discover')} className="p-1 -ml-1">
            <ArrowLeft size={22} className="text-latitud-black" />
          </button>
          <LatitudLogo size="sm" />
          <div className="w-8" />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-latitud-orange/10 flex items-center justify-center">
            <span className="text-xl font-bold text-latitud-orange">{client.name?.[0]}</span>
          </div>
          <div>
            <h1 className="font-heading text-xl text-latitud-black">{client.name}</h1>
            <p className="text-xs text-latitud-gray">{client.city} · {client.budget_range}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <Heart size={16} className="text-red-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-latitud-black">{likes.length}</p>
            <p className="text-[10px] text-latitud-gray">Me gusta</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <ThumbsDown size={16} className="text-latitud-gray mx-auto mb-1" />
            <p className="text-lg font-bold text-latitud-black">{dislikes.length}</p>
            <p className="text-[10px] text-latitud-gray">No me interesa</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <Calendar size={16} className="text-latitud-orange mx-auto mb-1" />
            <p className="text-lg font-bold text-latitud-black">{visitReqs.length}</p>
            <p className="text-[10px] text-latitud-gray">Visitas</p>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm text-latitud-black mb-3">Mis preferencias</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-latitud-gray">Busco</span><span className="text-latitud-black font-medium">{client.looking_for}</span></div>
            <div className="flex justify-between"><span className="text-latitud-gray">Presupuesto</span><span className="text-latitud-black font-medium">{client.budget_range}</span></div>
            <div className="flex justify-between"><span className="text-latitud-gray">Recámaras</span><span className="text-latitud-black font-medium">{client.bedrooms_wanted}</span></div>
            <div className="flex justify-between"><span className="text-latitud-gray">Plazo</span><span className="text-latitud-black font-medium">{client.estimated_purchase_date}</span></div>
            <div className="flex justify-between"><span className="text-latitud-gray">Pago</span><span className="text-latitud-black font-medium">{client.payment_method}</span></div>
          </div>
        </div>

        {/* Zones */}
        {client.favorite_zones?.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-sm text-latitud-black mb-3">Zonas de interés</h3>
            <div className="flex flex-wrap gap-2">
              {client.favorite_zones.map(z => (
                <span key={z} className="text-xs bg-latitud-light text-latitud-black px-3 py-1.5 rounded-full flex items-center gap-1">
                  <MapPin size={10} className="text-latitud-orange" /> {z}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        {client.important_features?.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-sm text-latitud-black mb-3">Lo que más me importa</h3>
            <div className="flex flex-wrap gap-2">
              {client.important_features.map(f => (
                <span key={f} className="text-xs bg-latitud-orange/10 text-latitud-orange px-3 py-1.5 rounded-full flex items-center gap-1">
                  <Star size={10} /> {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Advisor */}
        {client.assigned_advisor && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-sm text-latitud-black mb-2">Tu asesor</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-latitud-orange/20 flex items-center justify-center">
                <span className="text-latitud-orange font-bold text-sm">{client.assigned_advisor[0]}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-latitud-black">{client.assigned_advisor}</p>
                <p className="text-xs text-latitud-gray">Consultor Latitud Inmobiliaria</p>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 text-latitud-gray text-sm mt-4"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}