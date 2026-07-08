import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, ThumbsDown, Heart, Calendar, TrendingUp, Building2, Award } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AdminIntelligence() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [reactions, visits, properties, clients] = await Promise.all([
      base44.entities.Reaction.list('-created_date', 200),
      base44.entities.VisitRequest.list('-created_date', 200),
      base44.entities.Property.list('-created_date', 200),
      base44.entities.Client.list('-created_date', 200)
    ]);

    const likes = reactions.filter(r => r.reaction_type === 'like');
    const dislikes = reactions.filter(r => r.reaction_type === 'dislike');
    const visitReqs = reactions.filter(r => r.reaction_type === 'visit_request');

    // 1. Most liked zones
    const zoneLikes = {};
    likes.forEach(r => {
      if (r.property_zone) zoneLikes[r.property_zone] = (zoneLikes[r.property_zone] || 0) + 1;
    });
    const topZones = Object.entries(zoneLikes).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxZone = topZones[0]?.[1] || 1;

    // 2. Most rejected price ranges
    const priceReject = {};
    dislikes.forEach(r => {
      if (r.property_price) {
        let range = '';
        if (r.property_price < 3000000) range = 'Menos de $3M';
        else if (r.property_price < 5000000) range = '$3M a $5M';
        else if (r.property_price < 10000000) range = '$5M a $10M';
        else if (r.property_price < 20000000) range = '$10M a $20M';
        else range = 'Más de $20M';
        priceReject[range] = (priceReject[range] || 0) + 1;
      }
    });
    const topRejected = Object.entries(priceReject).sort((a, b) => b[1] - a[1]);
    const maxRejected = topRejected[0]?.[1] || 1;

    // 3. Property types with most likes
    const typeLikes = {};
    likes.forEach(r => {
      if (r.property_type) typeLikes[r.property_type] = (typeLikes[r.property_type] || 0) + 1;
    });
    const topTypes = Object.entries(typeLikes).sort((a, b) => b[1] - a[1]);
    const maxType = topTypes[0]?.[1] || 1;

    // 4. Properties that generate most visit requests
    const propVisitReqs = {};
    visitReqs.forEach(r => {
      if (r.property_title) propVisitReqs[r.property_title] = (propVisitReqs[r.property_title] || 0) + 1;
    });
    visits.forEach(v => {
      if (v.property_title) propVisitReqs[v.property_title] = (propVisitReqs[v.property_title] || 0) + 1;
    });
    const topVisitProps = Object.entries(propVisitReqs).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // 5. Advisors who convert most likes to visits
    const advisorStats = {};
    clients.forEach(c => {
      const advisor = c.assigned_advisor || 'Sin asignar';
      if (!advisorStats[advisor]) advisorStats[advisor] = { likes: 0, visits: 0, clients: 0 };
      advisorStats[advisor].likes += c.liked_count || 0;
      advisorStats[advisor].visits += c.visit_requests_count || 0;
      advisorStats[advisor].clients += 1;
    });
    const advisorRanking = Object.entries(advisorStats).map(([name, stats]) => ({
      name,
      ...stats,
      conversionRate: stats.likes > 0 ? Math.round((stats.visits / stats.likes) * 100) : 0
    })).sort((a, b) => b.conversionRate - a.conversionRate);

    setData({
      topZones, maxZone,
      topRejected, maxRejected,
      topTypes, maxType,
      topVisitProps,
      advisorRanking,
      totalLikes: likes.length,
      totalDislikes: dislikes.length,
      totalVisits: visitReqs.length + visits.length
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

  return (
    <div className="px-4 py-6">
      <h1 className="font-heading text-2xl text-latitud-black mb-1">Inteligencia de Preferencias</h1>
      <p className="text-sm text-latitud-gray mb-6">Análisis del comportamiento de clientes en Latitud Match</p>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <Heart size={18} className="text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-latitud-black">{data.totalLikes}</p>
          <p className="text-[10px] text-latitud-gray">Likes totales</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <ThumbsDown size={18} className="text-latitud-gray mx-auto mb-1" />
          <p className="text-xl font-bold text-latitud-black">{data.totalDislikes}</p>
          <p className="text-[10px] text-latitud-gray">Rechazos</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <Calendar size={18} className="text-latitud-orange mx-auto mb-1" />
          <p className="text-xl font-bold text-latitud-black">{data.totalVisits}</p>
          <p className="text-[10px] text-latitud-gray">Solicitudes visita</p>
        </div>
      </div>

      {/* 1. Most liked zones */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
          <MapPin size={14} className="text-latitud-orange" /> Zonas que gustan más
        </h3>
        {data.topZones.length === 0 ? (
          <p className="text-xs text-latitud-gray py-3">Aún no hay datos suficientes.</p>
        ) : (
          <div className="space-y-3">
            {data.topZones.map(([zone, count]) => (
              <div key={zone}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-latitud-black">{zone}</span>
                  <span className="text-xs font-bold text-latitud-orange">{count} likes</span>
                </div>
                <div className="h-2 bg-latitud-light rounded-full overflow-hidden">
                  <div className="h-full bg-latitud-orange rounded-full transition-all" style={{ width: `${(count / data.maxZone) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Most rejected price ranges */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
          <ThumbsDown size={14} className="text-latitud-gray" /> Rangos de precio más rechazados
        </h3>
        {data.topRejected.length === 0 ? (
          <p className="text-xs text-latitud-gray py-3">Aún no hay datos suficientes.</p>
        ) : (
          <div className="space-y-3">
            {data.topRejected.map(([range, count]) => (
              <div key={range}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-latitud-black">{range}</span>
                  <span className="text-xs font-bold text-red-400">{count} rechazos</span>
                </div>
                <div className="h-2 bg-latitud-light rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${(count / data.maxRejected) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Property types with most likes */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
          <Building2 size={14} className="text-latitud-orange" /> Tipos de propiedad con más likes
        </h3>
        {data.topTypes.length === 0 ? (
          <p className="text-xs text-latitud-gray py-3">Aún no hay datos suficientes.</p>
        ) : (
          <div className="space-y-3">
            {data.topTypes.map(([type, count]) => (
              <div key={type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-latitud-black">{type}</span>
                  <span className="text-xs font-bold text-latitud-orange">{count} likes</span>
                </div>
                <div className="h-2 bg-latitud-light rounded-full overflow-hidden">
                  <div className="h-full bg-latitud-orange rounded-full transition-all" style={{ width: `${(count / data.maxType) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Properties that generate most visit requests */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
          <Calendar size={14} className="text-latitud-orange" /> Propiedades que generan más visitas
        </h3>
        {data.topVisitProps.length === 0 ? (
          <p className="text-xs text-latitud-gray py-3">Aún no hay datos suficientes.</p>
        ) : (
          <div className="space-y-2">
            {data.topVisitProps.map(([title, count], i) => (
              <div key={title} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-latitud-orange w-4">{i + 1}</span>
                  <span className="text-sm text-latitud-black leading-tight">{title}</span>
                </div>
                <span className="text-xs text-latitud-gray flex items-center gap-1 shrink-0 ml-2">
                  <Calendar size={10} className="text-latitud-orange" /> {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Advisors conversion ranking */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
          <Award size={14} className="text-latitud-orange" /> Asesores: conversión de likes a visitas
        </h3>
        {data.advisorRanking.length === 0 ? (
          <p className="text-xs text-latitud-gray py-3">Aún no hay datos suficientes.</p>
        ) : (
          <div className="space-y-3">
            {data.advisorRanking.map((advisor, i) => (
              <div key={advisor.name} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  i === 0 ? 'bg-latitud-orange text-white' : 'bg-latitud-light text-latitud-gray'
                }`}>
                  <span className="text-xs font-bold">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-latitud-black truncate">{advisor.name}</p>
                  <p className="text-[10px] text-latitud-gray">{advisor.likes} likes · {advisor.visits} visitas · {advisor.clients} clientes</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-latitud-orange">{advisor.conversionRate}%</p>
                  <p className="text-[9px] text-latitud-gray uppercase tracking-wider">conversión</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}