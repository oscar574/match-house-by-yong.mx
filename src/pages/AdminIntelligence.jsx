import React, { useState, useEffect } from 'react';
import { MapPin, ThumbsDown, Heart, Calendar, Building2, Award, Eye, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getLeadStatusLabel } from '@/lib/leadScoring';

export default function AdminIntelligence() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [reactions, visits, properties, clients] = await Promise.all([
      base44.entities.Reaction.list('-created_date', 300),
      base44.entities.VisitRequest.list('-created_date', 200),
      base44.entities.Property.list('-created_date', 200),
      base44.entities.Client.list('-created_date', 200)
    ]);

    const likes = reactions.filter(r => r.reaction_type === 'like');
    const dislikes = reactions.filter(r => r.reaction_type === 'dislike');
    const views = reactions.filter(r => r.reaction_type === 'view');
    const visitReqs = reactions.filter(r => r.reaction_type === 'visit_request');

    // High intent clients
    const highIntentClients = clients
      .map(c => ({ ...c, _score: c.buyer_intent_score ?? c.lead_score ?? 0 }))
      .filter(c => c._score >= 35 || (c.visit_requests_count || 0) > 0)
      .sort((a, b) => b._score - a._score);

    // Most viewed properties
    const viewCounts = {};
    views.forEach(r => { if (r.property_title) viewCounts[r.property_title] = (viewCounts[r.property_title] || 0) + 1; });
    const topViewed = Object.entries(viewCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxViewed = topViewed[0]?.[1] || 1;

    // Most saved properties
    const saveCounts = {};
    likes.forEach(r => { if (r.property_title) saveCounts[r.property_title] = (saveCounts[r.property_title] || 0) + 1; });
    const topSaved = Object.entries(saveCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxSaved = topSaved[0]?.[1] || 1;

    // Most liked zones
    const zoneLikes = {};
    likes.forEach(r => { if (r.property_zone) zoneLikes[r.property_zone] = (zoneLikes[r.property_zone] || 0) + 1; });
    const topZones = Object.entries(zoneLikes).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxZone = topZones[0]?.[1] || 1;

    // Most searched zones (from client preferences)
    const zoneSearch = {};
    clients.forEach(c => (c.favorite_zones || []).forEach(z => { zoneSearch[z] = (zoneSearch[z] || 0) + 1; }));
    const topSearchedZones = Object.entries(zoneSearch).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Most rejected price ranges
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

    // Most searched price ranges (from clients)
    const budgetSearch = {};
    clients.forEach(c => { if (c.budget_range) budgetSearch[c.budget_range] = (budgetSearch[c.budget_range] || 0) + 1; });
    const topBudgets = Object.entries(budgetSearch).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Property types with most likes
    const typeLikes = {};
    likes.forEach(r => { if (r.property_type) typeLikes[r.property_type] = (typeLikes[r.property_type] || 0) + 1; });
    const topTypes = Object.entries(typeLikes).sort((a, b) => b[1] - a[1]);
    const maxType = topTypes[0]?.[1] || 1;

    // Properties generating most visit requests
    const propVisitReqs = {};
    visitReqs.forEach(r => { if (r.property_title) propVisitReqs[r.property_title] = (propVisitReqs[r.property_title] || 0) + 1; });
    visits.forEach(v => { if (v.property_title) propVisitReqs[v.property_title] = (propVisitReqs[v.property_title] || 0) + 1; });
    const topVisitProps = Object.entries(propVisitReqs).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Advisor conversion ranking
    const advisorStats = {};
    clients.forEach(c => {
      const advisor = c.assigned_advisor || 'Sin asignar';
      if (!advisorStats[advisor]) advisorStats[advisor] = { likes: 0, visits: 0, clients: 0 };
      advisorStats[advisor].likes += c.liked_count || 0;
      advisorStats[advisor].visits += c.visit_requests_count || 0;
      advisorStats[advisor].clients += 1;
    });
    const advisorRanking = Object.entries(advisorStats).map(([name, stats]) => ({
      name, ...stats, conversionRate: stats.likes > 0 ? Math.round((stats.visits / stats.likes) * 100) : 0
    })).sort((a, b) => b.conversionRate - a.conversionRate);

    // Properties with many views but no visits
    const visitCountsByTitle = propVisitReqs;
    const manyViewsFewVisits = topViewed.filter(([title, c]) => c >= 3 && !(visitCountsByTitle[title] > 0));

    // Properties without cover photo
    const noPhotoProps = properties.filter(p => !p.cover_photo_url && (!p.photos || p.photos.length === 0) && (!p.photo_urls || p.photo_urls.length === 0));

    // Incomplete properties
    const incompleteProps = properties.filter(p => !p.price || !p.construction_area || !p.zone);

    // Duplicates
    const dupProps = properties.filter(p => p.is_duplicate === true);
    const dupGroups = {};
    dupProps.forEach(p => { const g = p.duplicate_group_id || 'manual'; dupGroups[g] = (dupGroups[g] || 0) + 1; });

    // Recommendations
    const recommendations = [];
    highIntentClients.slice(0, 3).forEach(c => {
      if (c._score >= 50 || (c.visit_requests_count || 0) > 0) {
        recommendations.push({ icon: Zap, text: `Contactar a ${c.name} hoy`, tone: 'alta' });
      } else if (c._score >= 35) {
        recommendations.push({ icon: TrendingUp, text: `${c.name} ya mostró alta intención`, tone: 'media' });
      }
    });
    manyViewsFewVisits.slice(0, 2).forEach(([title]) => {
      recommendations.push({ icon: Eye, text: `"${title}" tiene muchas vistas pero pocas citas`, tone: 'media' });
    });
    noPhotoProps.slice(0, 2).forEach(p => {
      recommendations.push({ icon: AlertTriangle, text: `"${p.title}" debe ocultarse por falta de datos`, tone: 'baja' });
    });
    if (dupProps.length > 0) {
      recommendations.push({ icon: AlertTriangle, text: `${dupProps.length} propiedades parecen duplicadas`, tone: 'baja' });
    }

    setData({
      topZones, maxZone, topSearchedZones,
      topRejected, maxRejected, topBudgets,
      topTypes, maxType,
      topVisitProps,
      advisorRanking,
      topViewed, maxViewed,
      topSaved, maxSaved,
      highIntentClients,
      noPhotoProps,
      incompleteProps,
      dupProps,
      manyViewsFewVisits,
      recommendations,
      totalLikes: likes.length,
      totalDislikes: dislikes.length,
      totalVisits: visitReqs.length + visits.length,
      totalViews: views.length
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

  const toneColor = { alta: 'bg-latitud-orange/10 text-latitud-orange', media: 'bg-yellow-50 text-yellow-600', baja: 'bg-gray-100 text-latitud-gray' };

  return (
    <div className="px-4 py-6">
      <h1 className="font-heading text-2xl text-latitud-black mb-1">MatchHouse Intelligence</h1>
      <p className="text-sm text-latitud-gray mb-6">Análisis del comportamiento de clientes</p>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <Eye size={18} className="text-latitud-orange mx-auto mb-1" />
          <p className="text-xl font-bold text-latitud-black">{data.totalViews}</p>
          <p className="text-[10px] text-latitud-gray">Vistas</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <Heart size={18} className="text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-latitud-black">{data.totalLikes}</p>
          <p className="text-[10px] text-latitud-gray">Likes</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <ThumbsDown size={18} className="text-latitud-gray mx-auto mb-1" />
          <p className="text-xl font-bold text-latitud-black">{data.totalDislikes}</p>
          <p className="text-[10px] text-latitud-gray">Rechazos</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <Calendar size={18} className="text-latitud-orange mx-auto mb-1" />
          <p className="text-xl font-bold text-latitud-black">{data.totalVisits}</p>
          <p className="text-[10px] text-latitud-gray">Citas</p>
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
            <Zap size={14} className="text-latitud-orange" /> Recomendaciones automáticas
          </h3>
          <div className="space-y-2">
            {data.recommendations.map((r, i) => {
              const Icon = r.icon;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${toneColor[r.tone]}`}>
                    <Icon size={12} />
                  </span>
                  <p className="text-xs text-latitud-black">{r.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* High intent clients */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
          <Zap size={14} className="text-latitud-orange" /> Clientes con alta intención
        </h3>
        {data.highIntentClients.length === 0 ? (
          <p className="text-xs text-latitud-gray py-3">Aún no hay clientes calificados.</p>
        ) : (
          <div className="space-y-2">
            {data.highIntentClients.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-latitud-orange w-6">{c._score}</span>
                  <span className="text-sm text-latitud-black truncate">{c.name}</span>
                </div>
                <span className="text-[10px] text-latitud-gray shrink-0 ml-2">{getLeadStatusLabel(c.lead_status)} · {c.visit_requests_count || 0} citas</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Most viewed */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
          <Eye size={14} className="text-latitud-orange" /> Propiedades más vistas
        </h3>
        {data.topViewed.length === 0 ? (
          <p className="text-xs text-latitud-gray py-3">Aún no hay datos suficientes.</p>
        ) : (
          <div className="space-y-3">
            {data.topViewed.map(([title, count]) => (
              <div key={title}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-latitud-black truncate pr-2">{title}</span>
                  <span className="text-xs font-bold text-latitud-orange shrink-0">{count}</span>
                </div>
                <div className="h-2 bg-latitud-light rounded-full overflow-hidden">
                  <div className="h-full bg-latitud-orange rounded-full" style={{ width: `${(count / data.maxViewed) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Most saved */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
          <Heart size={14} className="text-latitud-orange" /> Propiedades más guardadas
        </h3>
        {data.topSaved.length === 0 ? (
          <p className="text-xs text-latitud-gray py-3">Aún no hay datos suficientes.</p>
        ) : (
          <div className="space-y-3">
            {data.topSaved.map(([title, count]) => (
              <div key={title}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-latitud-black truncate pr-2">{title}</span>
                  <span className="text-xs font-bold text-latitud-orange shrink-0">{count}</span>
                </div>
                <div className="h-2 bg-latitud-light rounded-full overflow-hidden">
                  <div className="h-full bg-latitud-orange rounded-full" style={{ width: `${(count / data.maxSaved) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Most searched zones */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
          <MapPin size={14} className="text-latitud-orange" /> Zonas más buscadas
        </h3>
        {data.topSearchedZones.length === 0 ? (
          <p className="text-xs text-latitud-gray py-3">Aún no hay datos suficientes.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.topSearchedZones.map(([zone, count]) => (
              <span key={zone} className="text-xs bg-latitud-orange/10 text-latitud-orange px-3 py-1.5 rounded-full flex items-center gap-1">
                <MapPin size={10} /> {zone} · {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Most searched price ranges */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
          <TrendingUp size={14} className="text-latitud-orange" /> Rangos de precio más buscados
        </h3>
        {data.topBudgets.length === 0 ? (
          <p className="text-xs text-latitud-gray py-3">Aún no hay datos suficientes.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.topBudgets.map(([range, count]) => (
              <span key={range} className="text-xs bg-latitud-light text-latitud-black px-3 py-1.5 rounded-full">{range} · {count}</span>
            ))}
          </div>
        )}
      </div>

      {/* Most liked zones */}
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
                  <div className="h-full bg-latitud-orange rounded-full" style={{ width: `${(count / data.maxZone) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Most rejected price ranges */}
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
                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${(count / data.maxRejected) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Property types with most likes */}
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
                  <div className="h-full bg-latitud-orange rounded-full" style={{ width: `${(count / data.maxType) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Properties that generate most visit requests */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
          <Calendar size={14} className="text-latitud-orange" /> Propiedades con mejor conversión (citas)
        </h3>
        {data.topVisitProps.length === 0 ? (
          <p className="text-xs text-latitud-gray py-3">Aún no hay datos suficientes.</p>
        ) : (
          <div className="space-y-2">
            {data.topVisitProps.map(([title, count], i) => (
              <div key={title} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-latitud-orange w-4">{i + 1}</span>
                  <span className="text-sm text-latitud-black leading-tight truncate">{title}</span>
                </div>
                <span className="text-xs text-latitud-gray flex items-center gap-1 shrink-0 ml-2">
                  <Calendar size={10} className="text-latitud-orange" /> {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data quality */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-latitud-orange" /> Calidad de datos
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1">
            <span className="text-latitud-gray">Propiedades sin foto</span>
            <span className="font-bold text-latitud-black">{data.noPhotoProps.length}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-latitud-gray">Propiedades con info incompleta</span>
            <span className="font-bold text-latitud-black">{data.incompleteProps.length}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-latitud-gray">Posibles duplicados</span>
            <span className="font-bold text-latitud-black">{data.dupProps.length}</span>
          </div>
        </div>
      </div>

      {/* Advisors conversion ranking */}
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