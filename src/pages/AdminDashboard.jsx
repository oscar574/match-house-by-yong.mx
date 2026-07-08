import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Heart, Calendar, AlertTriangle, TrendingUp, Building2, ThumbsDown, MapPin, ListTodo, ChevronRight, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatPrice } from '@/lib/matchEngine';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const [clients, reactions, visits, properties, tasks] = await Promise.all([
      base44.entities.Client.list('-created_date', 50),
      base44.entities.Reaction.list('-created_date', 50),
      base44.entities.VisitRequest.list('-created_date', 50),
      base44.entities.Property.list('-created_date', 50),
      base44.entities.Task.list('-created_date', 100)
    ]);

    const likes = reactions.filter(r => r.reaction_type === 'like');
    const dislikes = reactions.filter(r => r.reaction_type === 'dislike');
    const newClients = clients.filter(c => c.commercial_stage === 'Nuevo' || c.commercial_stage === 'Onboarding completado');
    const onboarded = clients.filter(c => c.onboarding_completed);
    const withLikes = clients.filter(c => c.liked_count > 0);
    const visitRequests = visits.filter(v => v.status === 'Pendiente');
    const highIntent = clients.filter(c => c.intent_score === 'Alta intención');

    // Most liked properties
    const likesByProperty = {};
    likes.forEach(r => {
      likesByProperty[r.property_title] = (likesByProperty[r.property_title] || 0) + 1;
    });
    const topLiked = Object.entries(likesByProperty).sort((a, b) => b[1] - a[1]).slice(0, 3);

    // Most rejected
    const dislikeReasons = {};
    dislikes.forEach(r => {
      if (r.dislike_reason) {
        dislikeReasons[r.dislike_reason] = (dislikeReasons[r.dislike_reason] || 0) + 1;
      }
    });
    const topReasons = Object.entries(dislikeReasons).sort((a, b) => b[1] - a[1]).slice(0, 4);

    // Zones of interest
    const zoneInterest = {};
    clients.forEach(c => {
      (c.favorite_zones || []).forEach(z => {
        zoneInterest[z] = (zoneInterest[z] || 0) + 1;
      });
    });
    const topZones = Object.entries(zoneInterest).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Average budget
    const budgetValues = { 'Menos de $3M': 2, '$3M a $5M': 4, '$5M a $10M': 7.5, '$10M a $20M': 15, 'Más de $20M': 25 };
    const budgets = clients.filter(c => budgetValues[c.budget_range]).map(c => budgetValues[c.budget_range]);
    const avgBudget = budgets.length > 0 ? budgets.reduce((a, b) => a + b, 0) / budgets.length : 0;

    setData({
      totalClients: clients.length,
      pendingTasks: tasks.filter(t => t.status === 'Pendiente').length,
      viewsCount: reactions.filter(r => r.reaction_type === 'view').length,
      newClients: newClients.length,
      onboarded: onboarded.length,
      withLikes: withLikes.length,
      visitRequests: visitRequests.length,
      totalLikes: likes.length,
      totalDislikes: dislikes.length,
      highIntent: highIntent.length,
      totalProperties: properties.filter(p => p.status === 'Disponible').length,
      topLiked,
      topReasons,
      topZones,
      avgBudget,
      pendingVisits: visitRequests.length,
      recentClients: clients.slice(0, 5)
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { label: 'Clientes', value: data.totalClients, icon: Users, color: 'bg-latitud-orange/10 text-latitud-orange' },
    { label: 'Leads nuevos', value: data.newClients, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
    { label: 'Con likes', value: data.withLikes, icon: Heart, color: 'bg-red-50 text-red-500' },
    { label: 'Citas solicitadas', value: data.pendingVisits, icon: Calendar, color: 'bg-[#EAF2FF] text-latitud-orange' },
    { label: 'Propiedades vistas', value: data.viewsCount, icon: Building2, color: 'bg-gray-100 text-latitud-gray' },
    { label: 'Propiedades activas', value: data.totalProperties, icon: Building2, color: 'bg-gray-100 text-latitud-gray' },
    { label: 'Tareas pendientes', value: data.pendingTasks, icon: ListTodo, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Alta intención', value: data.highIntent, icon: AlertTriangle, color: 'bg-yellow-50 text-yellow-600' },
  ];

  return (
    <div className="px-4 py-6">
      <h1 className="font-heading text-2xl text-latitud-black mb-1">MatchHouse Admin</h1>
      <p className="text-sm text-latitud-gray mb-6">Centro de control</p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
                <Icon size={16} />
              </div>
              <p className="text-2xl font-bold text-latitud-black">{s.value}</p>
              <p className="text-xs text-latitud-gray">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick access */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <Link to="/admin/clients" className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-1">
          <Users size={16} className="text-latitud-orange" />
          <span className="text-xs font-medium text-latitud-black">Clientes</span>
          <ChevronRight size={12} className="text-latitud-gray/50" />
        </Link>
        <Link to="/admin/visits" className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-1">
          <Calendar size={16} className="text-latitud-orange" />
          <span className="text-xs font-medium text-latitud-black">Citas</span>
          <ChevronRight size={12} className="text-latitud-gray/50" />
        </Link>
        <Link to="/admin/properties" className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-1">
          <Building2 size={16} className="text-latitud-orange" />
          <span className="text-xs font-medium text-latitud-black">Propiedades</span>
          <ChevronRight size={12} className="text-latitud-gray/50" />
        </Link>
        <Link to="/admin/intelligence" className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-1">
          <TrendingUp size={16} className="text-latitud-orange" />
          <span className="text-xs font-medium text-latitud-black">Intelligence</span>
          <ChevronRight size={12} className="text-latitud-gray/50" />
        </Link>
        <Link to="/admin/tasks" className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-1">
          <ListTodo size={16} className="text-latitud-orange" />
          <span className="text-xs font-medium text-latitud-black">Tareas</span>
          <ChevronRight size={12} className="text-latitud-gray/50" />
        </Link>
        <Link to="/admin/demo-checklist" className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-1">
          <CheckCircle2 size={16} className="text-latitud-orange" />
          <span className="text-xs font-medium text-latitud-black">Demo Checklist</span>
          <ChevronRight size={12} className="text-latitud-gray/50" />
        </Link>
      </div>

      {/* Ticket promedio */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <p className="text-xs text-latitud-gray uppercase tracking-wider mb-1">Ticket Promedio Buscado</p>
        <p className="text-2xl font-bold text-latitud-orange">${data.avgBudget.toFixed(1)}M MXN</p>
      </div>

      {/* Top liked */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-latitud-black text-sm mb-3">Propiedades más gustadas</h3>
        {data.topLiked.map(([name, count], i) => (
          <div key={name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-latitud-orange w-5">{i + 1}</span>
              <span className="text-sm text-latitud-black">{name}</span>
            </div>
            <span className="text-xs text-latitud-gray flex items-center gap-1"><Heart size={10} className="text-red-400" /> {count}</span>
          </div>
        ))}
      </div>

      {/* Top rejection reasons */}
      {data.topReasons.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold text-latitud-black text-sm mb-3">Motivos de rechazo</h3>
          {data.topReasons.map(([reason, count]) => (
            <div key={reason} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-latitud-black flex items-center gap-2">
                <ThumbsDown size={12} className="text-latitud-gray" /> {reason}
              </span>
              <span className="text-xs text-latitud-gray">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top zones */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-latitud-black text-sm mb-3">Zonas con mayor interés</h3>
        {data.topZones.map(([zone, count]) => (
          <div key={zone} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-latitud-black flex items-center gap-2">
              <MapPin size={12} className="text-latitud-orange" /> {zone}
            </span>
            <span className="text-xs text-latitud-gray">{count} clientes</span>
          </div>
        ))}
      </div>

      {/* Recent clients */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-latitud-black text-sm">Clientes recientes</h3>
          <Link to="/admin/clients" className="text-xs text-latitud-orange font-medium">Ver todos</Link>
        </div>
        {data.recentClients.map(client => (
          <Link key={client.id} to={`/admin/client/${client.id}`} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-latitud-light flex items-center justify-center">
                <span className="text-sm font-bold text-latitud-orange">{client.name?.[0]}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-latitud-black">{client.name}</p>
                <p className="text-xs text-latitud-gray">{client.city} · {client.budget_range || 'Sin presupuesto'}</p>
              </div>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
              client.intent_score === 'Alta intención' ? 'bg-latitud-orange/10 text-latitud-orange' :
              client.intent_score === 'Intención media' ? 'bg-yellow-50 text-yellow-600' :
              'bg-gray-100 text-latitud-gray'
            }`}>
              {client.intent_score || 'Explorando'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}