import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LatitudLogo from '@/components/LatitudLogo';
import BottomNav from '@/components/BottomNav';

const STATUS_LABELS = {
  'solicitada': 'Solicitada',
  'Pendiente': 'Pendiente',
  'Confirmada': 'Confirmada',
  'en revisi\u00f3n': 'En revisi\u00f3n',
  'reprogramada': 'Reprogramada',
  'Cancelada': 'Cancelada',
  'Completada': 'Completada',
  'no asisti\u00f3': 'No asisti\u00f3'
};
const STATUS_COLORS = {
  'solicitada': 'bg-amber-100 text-amber-700',
  'Pendiente': 'bg-amber-100 text-amber-700',
  'en revisi\u00f3n': 'bg-amber-100 text-amber-700',
  'Confirmada': 'bg-green-100 text-green-700',
  'reprogramada': 'bg-blue-100 text-blue-700',
  'Cancelada': 'bg-red-100 text-red-700',
  'Completada': 'bg-latitud-orange/15 text-latitud-orange',
  'no asisti\u00f3': 'bg-gray-100 text-latitud-gray'
};

export default function ClientVisits() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const clientId = localStorage.getItem('latitud_client_id');
    if (!clientId) { setLoading(false); return; }
    try {
      const [visits, tours] = await Promise.all([
        base44.entities.VisitRequest.filter({ client_id: clientId }),
        base44.entities.TourRequest.filter({ client_id: clientId })
      ]);
      const merged = [
        ...(tours || []).map(t => ({
          kind: 'tour', id: t.id, status: t.status,
          title: t.property_count > 1 ? `Recorrido de ${t.property_count} propiedades` : (t.property_titles?.[0] || 'Recorrido'),
          date: t.requested_date, time: t.requested_time, sub: t.zones_summary
        })),
        ...(visits || []).map(v => ({
          kind: 'visit', id: v.id, status: v.status,
          title: v.property_title || 'Visita',
          date: v.requested_date || v.confirmed_date, time: v.requested_time || v.confirmed_time, sub: null
        }))
      ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setItems(merged);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-latitud-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-latitud-black pb-28">
      <div className="px-5 pt-6 pb-4 sticky top-0 bg-latitud-black/95 backdrop-blur-sm z-30">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/discover')} className="p-1 -ml-1"><ArrowLeft size={22} className="text-latitud-white" /></button>
          <LatitudLogo variant="white" size="sm" />
          <div className="w-8" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={18} className="text-latitud-orange" />
          <h1 className="font-heading text-2xl text-latitud-white">Mis visitas</h1>
        </div>
        <p className="text-sm text-latitud-gray">Tus solicitudes de visita y recorridos.</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <Calendar size={40} className="text-latitud-gray mx-auto mb-3" />
            <p className="text-latitud-white/70 text-base mb-2">No tienes visitas solicitadas.</p>
            <p className="text-latitud-gray text-sm mb-6">Explora propiedades y solicita una visita cuando estés listo.</p>
            <button onClick={() => navigate('/discover')} className="bg-latitud-orange text-[color:var(--brand-accent-fg)] px-6 py-3 rounded-xl text-sm font-semibold">Descubrir propiedades</button>
          </div>
        ) : (
          items.map(item => (
            <div key={item.kind + item.id} className="bg-latitud-white/[0.05] rounded-2xl p-4 border border-latitud-white/10">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-latitud-orange font-semibold">{item.kind === 'tour' ? 'Recorrido' : 'Visita'}</p>
                  <h3 className="font-heading text-latitud-white text-base leading-tight mt-0.5">{item.title}</h3>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[item.status] || 'bg-gray-100 text-latitud-gray'}`}>
                  {STATUS_LABELS[item.status] || item.status}
                </span>
              </div>
              {(item.date || item.time) && (
                <div className="flex items-center gap-3 text-latitud-gray text-xs mt-2">
                  {item.date && <span className="flex items-center gap-1"><Calendar size={12} /> {item.date}</span>}
                  {item.time && <span className="flex items-center gap-1"><Clock size={12} /> {item.time}</span>}
                </div>
              )}
              {item.sub && <p className="text-latitud-gray text-xs mt-1.5">{item.sub}</p>}
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}