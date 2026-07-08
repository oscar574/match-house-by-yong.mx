import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, User, RotateCcw, CheckSquare, ListTodo, Zap, MessageCircle, Home, MapPin, BadgeCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AdminVisits() {
  const [visits, setVisits] = useState([]);
  const [tours, setTours] = useState([]);
  const [clients, setClients] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('recorridos');
  const [filter, setFilter] = useState('Todas');

  useEffect(() => {
    (async () => {
      const [v, t, c] = await Promise.all([
        base44.entities.VisitRequest.list('-created_date', 100),
        base44.entities.TourRequest.list('-created_date', 100),
        base44.entities.Client.list('-created_date', 100)
      ]);
      const map = {};
      c.forEach(cl => { map[cl.id] = cl; });
      setClients(map);
      setVisits(v);
      setTours(t);
      setLoading(false);
    })();
  }, []);

  const updateVisit = async (id, status) => {
    await base44.entities.VisitRequest.update(id, { status });
    setVisits(prev => prev.map(v => v.id === id ? { ...v, status } : v));
  };
  const updateTour = async (id, status) => {
    await base44.entities.TourRequest.update(id, { status });
    setTours(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const createFollowUpTask = async (item, isTour) => {
    await base44.entities.Task.create({
      title: isTour
        ? `Seguimiento recorrido - ${item.client_name} (${item.property_count} propiedades)`
        : `Seguimiento visita - ${item.property_title}`,
      task_type: 'Seguimiento',
      client_id: item.client_id,
      client_name: item.client_name,
      property_id: isTour ? '' : item.property_id,
      assigned_to: item.advisor_name || '',
      status: 'Pendiente',
      priority: 'Alta',
      due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    });
    alert('Tarea de seguimiento creada');
  };

  const openTourWhatsApp = (tour) => {
    const titles = (tour.property_titles || []).map(t => `• ${t}`).join('\n');
    const msg = `Hola ${tour.client_name}, recibí tu selección en MatchHouse de ${tour.property_count} propiedades:\n${titles}\n\n¿Te funciona agendar el recorrido para ${tour.preferred_day || tour.requested_date || 'esta semana'}?`;
    const phone = (tour.client_whatsapp || '').replace(/[^0-9]/g, '');
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };
  const openVisitWhatsApp = (visit) => {
    const msg = `Hola ${visit.client_name}, recibí tu solicitud de visita para "${visit.property_title}". ¿Te funciona ${visit.preferred_day || visit.requested_date || 'esta semana'}?`;
    const phone = (visit.client_whatsapp || '').replace(/[^0-9]/g, '');
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const scoreColor = (s) => s >= 60 ? 'bg-latitud-orange/10 text-latitud-orange'
    : s >= 35 ? 'bg-green-50 text-green-600'
    : s >= 15 ? 'bg-yellow-50 text-yellow-600'
    : 'bg-gray-100 text-latitud-gray';

  const statusColors = {
    'solicitada': 'bg-yellow-50 text-yellow-600',
    'en revisión': 'bg-yellow-50 text-yellow-600',
    'Confirmada': 'bg-latitud-orange/10 text-latitud-orange',
    'Completada': 'bg-green-50 text-green-600',
    'Cancelada': 'bg-red-50 text-red-500',
    'reprogramada': 'bg-blue-50 text-blue-500',
    'no asistió': 'bg-gray-100 text-latitud-gray'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  const list = tab === 'recorridos' ? tours : visits;
  const filtered = filter === 'Todas' ? list : list.filter(i => i.status === filter);
  const filters = tab === 'recorridos'
    ? ['Todas', 'solicitada', 'Confirmada', 'Completada', 'Cancelada']
    : ['Todas', 'solicitada', 'Confirmada', 'Completada', 'Cancelada'];

  return (
    <div className="px-4 py-6">
      <h1 className="font-heading text-2xl text-latitud-black mb-1">Visitas y recorridos</h1>
      <p className="text-sm text-latitud-gray mb-4">{tours.length} recorridos · {visits.length} citas individuales</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setTab('recorridos'); setFilter('Todas'); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold ${tab === 'recorridos' ? 'bg-latitud-orange text-white' : 'bg-white text-latitud-gray border border-gray-100'}`}
        >
          Recorridos ({tours.length})
        </button>
        <button
          onClick={() => { setTab('visitas'); setFilter('Todas'); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold ${tab === 'visitas' ? 'bg-latitud-orange text-white' : 'bg-white text-latitud-gray border border-gray-100'}`}
        >
          Citas individuales ({visits.length})
        </button>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
              filter === f ? 'bg-latitud-black text-white' : 'bg-white text-latitud-gray border border-gray-100'
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
            <p className="text-sm text-latitud-gray">No hay solicitudes en esta categoría</p>
          </div>
        ) : filtered.map(item => {
          const client = clients[item.client_id];
          const score = client?.buyer_intent_score ?? client?.lead_score ?? 0;
          const isTour = tab === 'recorridos';
          const isPending = item.status === 'solicitada' || item.status === 'Pendiente' || item.status === 'en revisión';
          return (
            <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  {isTour ? (
                    <p className="text-sm font-semibold text-latitud-black flex items-center gap-1.5">
                      <Home size={13} className="text-[#C9A45C]" /> Recorrido · {item.property_count} propiedades
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-latitud-black truncate">{item.property_title}</p>
                  )}
                  <p className="text-xs text-latitud-gray flex items-center gap-1 mt-1">
                    <User size={10} /> {item.client_name || 'Cliente'}
                  </p>
                  {item.client_whatsapp && (
                    <p className="text-xs text-latitud-gray mt-0.5 flex items-center gap-1">
                      <MessageCircle size={10} /> {item.client_whatsapp}
                      {item.whatsapp_verified && <BadgeCheck size={11} className="text-green-500" />}
                    </p>
                  )}
                  {item.client_email && (
                    <p className="text-xs text-latitud-gray mt-0.5 truncate">{item.client_email}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full capitalize ${statusColors[item.status] || 'bg-gray-100 text-latitud-gray'}`}>
                    {item.status}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-0.5 ${scoreColor(score)}`}>
                    <Zap size={9} /> {score} pts
                  </span>
                </div>
              </div>

              {isTour && (
                <div className="rounded-xl bg-latitud-light p-3 mb-2 text-xs space-y-1">
                  {item.zones_summary && (
                    <p className="text-latitud-gray flex items-center gap-1"><MapPin size={10} className="text-latitud-orange" /> {item.zones_summary}</p>
                  )}
                  {item.price_range_summary && (
                    <p className="text-latitud-gray">Rango: <span className="text-latitud-black font-medium">{item.price_range_summary}</span></p>
                  )}
                  <div className="pt-1 space-y-0.5">
                    {(item.property_titles || []).slice(0, 4).map((t, i) => (
                      <p key={i} className="text-[11px] text-latitud-gray/80 truncate">• {t}</p>
                    ))}
                    {(item.property_titles || []).length > 4 && <p className="text-[11px] text-latitud-gray/60">+ {(item.property_titles).length - 4} más</p>}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-latitud-gray mb-3">
                <span className="flex items-center gap-1"><Calendar size={10} /> {item.preferred_day || item.requested_date || '—'}</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {item.preferred_time || item.requested_time || '—'}</span>
                {item.advisor_name && <span className="flex items-center gap-1"><User size={10} /> {item.advisor_name}</span>}
              </div>
              {(item.comment || item.notes) && <p className="text-xs text-latitud-gray italic mb-3">"{item.comment || item.notes}"</p>}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => isTour ? openTourWhatsApp(item) : openVisitWhatsApp(item)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366]/10 text-[#1a8a4f] text-xs font-semibold"
                >
                  <MessageCircle size={14} /> WhatsApp
                </button>
                {isPending && (
                  <button onClick={() => (isTour ? updateTour(item.id, 'Confirmada') : updateVisit(item.id, 'Confirmada'))} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-latitud-orange/10 text-latitud-orange text-xs font-semibold">
                    <CheckCircle size={14} /> Confirmar
                  </button>
                )}
                {isPending && (
                  <button onClick={() => (isTour ? updateTour(item.id, 'Cancelada') : updateVisit(item.id, 'Cancelada'))} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-latitud-gray text-xs font-semibold">
                    <XCircle size={14} /> Cancelar
                  </button>
                )}
                {item.status === 'Confirmada' && (
                  <>
                    <button onClick={() => (isTour ? updateTour(item.id, 'Completada') : updateVisit(item.id, 'Completada'))} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-600 text-xs font-semibold">
                      <CheckSquare size={14} /> Completar
                    </button>
                    <button onClick={() => (isTour ? updateTour(item.id, 'reprogramada') : updateVisit(item.id, 'reprogramada'))} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-500 text-xs font-semibold">
                      <RotateCcw size={14} /> Reprogramar
                    </button>
                  </>
                )}
                <button onClick={() => createFollowUpTask(item, isTour)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-latitud-light text-latitud-gray text-xs font-semibold">
                  <ListTodo size={14} /> Tarea
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}