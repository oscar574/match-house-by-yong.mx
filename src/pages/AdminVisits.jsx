import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, User, RotateCcw, CheckSquare, ListTodo, Mail, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getLeadStatusLabel } from '@/lib/leadScoring';

export default function AdminVisits() {
  const [visits, setVisits] = useState([]);
  const [clients, setClients] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('solicitada');

  useEffect(() => {
    (async () => {
      const [v, c] = await Promise.all([
        base44.entities.VisitRequest.list('-created_date', 100),
        base44.entities.Client.list('-created_date', 100)
      ]);
      const map = {};
      c.forEach(cl => { map[cl.id] = cl; });
      setClients(map);
      setVisits(v);
      setLoading(false);
    })();
  }, []);

  const updateStatus = async (id, status) => {
    await base44.entities.VisitRequest.update(id, { status });
    setVisits(prev => prev.map(v => v.id === id ? { ...v, status } : v));
  };

  const createFollowUpTask = async (visit) => {
    await base44.entities.Task.create({
      title: `Seguimiento visita - ${visit.property_title}`,
      task_type: 'Seguimiento',
      client_id: visit.client_id,
      client_name: visit.client_name,
      property_id: visit.property_id,
      assigned_to: visit.advisor_name || '',
      status: 'Pendiente',
      priority: 'Alta',
      due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    });
    alert('Tarea de seguimiento creada');
  };

  const filters = ['solicitada', 'Confirmada', 'Completada', 'Cancelada', 'Todas'];
  const filtered = visits.filter(v => filter === 'Todas' ? true : v.status === filter);

  const scoreColor = (s) => s >= 50 ? 'bg-latitud-orange/10 text-latitud-orange'
    : s >= 35 ? 'bg-green-50 text-green-600'
    : s >= 15 ? 'bg-yellow-50 text-yellow-600'
    : 'bg-gray-100 text-latitud-gray';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="font-heading text-2xl text-latitud-black mb-1">MatchHouse Visits</h1>
      <p className="text-sm text-latitud-gray mb-5">{visits.length} citas en total</p>

      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
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
            <p className="text-sm text-latitud-gray">No hay citas en esta categoría</p>
          </div>
        ) : (
          filtered.map(visit => {
            const client = clients[visit.client_id];
            const score = client?.buyer_intent_score ?? client?.lead_score ?? 0;
            const statusColors = {
              'solicitada': 'bg-yellow-50 text-yellow-600',
              'Confirmada': 'bg-latitud-orange/10 text-latitud-orange',
              'Completada': 'bg-green-50 text-green-600',
              'Cancelada': 'bg-red-50 text-red-500',
              'reprogramada': 'bg-blue-50 text-blue-500',
              'no asistió': 'bg-gray-100 text-latitud-gray'
            };
            return (
              <div key={visit.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-latitud-black truncate">{visit.property_title}</p>
                    <p className="text-xs text-latitud-gray flex items-center gap-1 mt-1">
                      <User size={10} /> {visit.client_name || 'Cliente'}
                    </p>
                    {visit.client_whatsapp && (
                      <p className="text-xs text-latitud-gray mt-0.5">{visit.client_whatsapp}</p>
                    )}
                    {visit.client_email && (
                      <p className="text-xs text-latitud-gray flex items-center gap-1 mt-0.5"><Mail size={10} /> {visit.client_email}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full capitalize ${statusColors[visit.status] || 'bg-gray-100 text-latitud-gray'}`}>
                      {visit.status}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-0.5 ${scoreColor(score)}`}>
                      <Zap size={9} /> {score} pts
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-latitud-gray mb-3">
                  <span className="flex items-center gap-1"><Calendar size={10} /> {visit.preferred_day || visit.requested_date || '—'}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {visit.preferred_time || visit.requested_time || '—'}</span>
                  {visit.advisor_name && <span className="flex items-center gap-1"><User size={10} /> {visit.advisor_name}</span>}
                </div>
                {visit.comment && <p className="text-xs text-latitud-gray italic mb-3">"{visit.comment}"</p>}

                {(visit.status === 'solicitada' || visit.status === 'Pendiente') && (
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
                {visit.status === 'Confirmada' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(visit.id, 'Completada')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-50 text-green-600 text-xs font-semibold"
                    >
                      <CheckSquare size={14} /> Completar
                    </button>
                    <button
                      onClick={() => updateStatus(visit.id, 'reprogramada')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 text-blue-500 text-xs font-semibold"
                    >
                      <RotateCcw size={14} /> Reprogramar
                    </button>
                  </div>
                )}
                {visit.status === 'Completada' && (
                  <button
                    onClick={() => createFollowUpTask(visit)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-latitud-light text-latitud-gray text-xs font-semibold"
                  >
                    <ListTodo size={14} /> Crear tarea de seguimiento
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}