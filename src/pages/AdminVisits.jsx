import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AdminVisits() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pendiente');

  useEffect(() => {
    base44.entities.VisitRequest.list('-created_date', 50).then(v => {
      setVisits(v);
      setLoading(false);
    });
  }, []);

  const updateStatus = async (id, status) => {
    await base44.entities.VisitRequest.update(id, { status });
    setVisits(prev => prev.map(v => v.id === id ? { ...v, status } : v));
  };

  const filtered = filter === 'Todas' ? visits : visits.filter(v => v.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="font-heading text-2xl text-latitud-black mb-1">Visitas</h1>
      <p className="text-sm text-latitud-gray mb-5">{visits.length} solicitudes de visita</p>

      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {['Pendiente', 'Confirmada', 'Completada', 'Cancelada', 'Todas'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f ? 'bg-latitud-orange text-white' : 'bg-white text-latitud-gray border border-gray-100'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={32} className="text-latitud-gray/30 mx-auto mb-2" />
            <p className="text-sm text-latitud-gray">No hay visitas en esta categoría</p>
          </div>
        ) : (
          filtered.map(visit => (
            <div key={visit.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-latitud-black">{visit.property_title}</p>
                  <p className="text-xs text-latitud-gray flex items-center gap-1 mt-1">
                    <User size={10} /> {visit.client_name}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                  visit.status === 'Pendiente' ? 'bg-yellow-50 text-yellow-600' :
                  visit.status === 'Confirmada' ? 'bg-latitud-orange/10 text-latitud-orange' :
                  visit.status === 'Completada' ? 'bg-green-50 text-green-600' :
                  'bg-red-50 text-red-500'
                }`}>{visit.status}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-latitud-gray mb-3">
                <span className="flex items-center gap-1"><Calendar size={10} /> {visit.preferred_day}</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {visit.preferred_time}</span>
              </div>
              {visit.comment && <p className="text-xs text-latitud-gray italic mb-3">"{visit.comment}"</p>}
              {visit.status === 'Pendiente' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(visit.id, 'Confirmada')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-latitud-orange/10 text-latitud-orange text-xs font-semibold"
                  >
                    <CheckCircle size={14} /> Confirmar
                  </button>
                  <button
                    onClick={() => updateStatus(visit.id, 'Cancelada')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 text-latitud-gray text-xs font-semibold"
                  >
                    <XCircle size={14} /> Cancelar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}