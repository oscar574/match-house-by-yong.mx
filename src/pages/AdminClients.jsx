import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, Calendar, MapPin, Zap, Mail, Clock, CheckCircle, UserPlus, RefreshCw, Loader2, AlertTriangle, GitMerge, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getLeadStatusLabel } from '@/lib/leadScoring';
import { clientOrigin, phoneKey } from '@/lib/clientOrigin';
import { formatPhoneDisplay } from '@/lib/phoneNormalize';
import RegisterClientModal from '@/components/RegisterClientModal';
import { useToast } from '@/components/ui/use-toast';

const LEAD_FILTERS = ['all', 'prioridad máxima', 'alta intención', 'lead calificado', 'interesado', 'explorando'];
const ORIGIN_FILTERS = [
  { key: 'real', label: 'Cliente real' },
  { key: 'demo_mode', label: 'Modo demo' },
  { key: 'demo_data', label: 'Datos de prueba' }
];

const timeAgo = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

export default function AdminClients() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showRegister, setShowRegister] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [showMerged, setShowMerged] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [selectedMasters, setSelectedMasters] = useState({});
  const [merging, setMerging] = useState(false);
  const [mergeConfirm, setMergeConfirm] = useState(null);

  const loadClients = async () => {
    setLoading(true);
    try {
      // Paginate through the whole base so duplicate detection is complete.
      let all = [];
      const fetchedIds = new Set();
      let exhausted = false;
      while (!exhausted) {
        const batch = await base44.entities.Client.filter(
          fetchedIds.size === 0 ? {} : { id: { $nin: Array.from(fetchedIds) } },
          '-created_date',
          200
        );
        if (batch.length === 0) break;
        batch.forEach(c => fetchedIds.add(c.id));
        all = all.concat(batch);
        if (batch.length < 200) exhausted = true;
      }
      setClients(all);
    } catch (e) {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => { loadClients(); }, []);

  // Duplicate groups by normalized WhatsApp (ignore already-merged records).
  const duplicateGroups = useMemo(() => {
    const map = {};
    clients.filter(c => !c.duplicate_of).forEach(c => {
      const k = phoneKey(c);
      if (!k) return;
      if (!map[k]) map[k] = [];
      map[k].push(c);
    });
    return Object.values(map).filter(g => g.length > 1);
  }, [clients]);

  // Suggested master per group: most points, then most recent activity.
  useEffect(() => {
    const next = { ...selectedMasters };
    duplicateGroups.forEach(g => {
      const k = phoneKey(g[0]);
      if (next[k]) return;
      const suggested = [...g].sort((a, b) =>
        ((b.buyer_intent_score ?? b.lead_score ?? 0) - (a.buyer_intent_score ?? a.lead_score ?? 0)) ||
        (new Date(b.last_activity_date || 0).getTime() - new Date(a.last_activity_date || 0).getTime())
      )[0];
      next[k] = suggested.id;
    });
    setSelectedMasters(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duplicateGroups]);

  const filteredClients = clients.filter(c => {
    const matchesSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    let matchesFilter = true;
    if (filter === 'all') matchesFilter = true;
    else if (['real', 'demo_mode', 'demo_data'].includes(filter)) matchesFilter = clientOrigin(c).key === filter;
    else matchesFilter = c.lead_status === filter;
    const matchesMerged = showMerged || !c.duplicate_of;
    return matchesSearch && matchesFilter && matchesMerged;
  });

  const normalizePhones = async () => {
    setNormalizing(true);
    try {
      const res = await base44.functions.invoke('normalizeClients', {});
      const d = res.data || {};
      toast({ title: 'Teléfonos normalizados', description: `${d.normalized || 0} normalizados · ${d.duplicatesMarked || 0} duplicados marcados.` });
      await loadClients();
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.error || e.message });
    }
    setNormalizing(false);
  };

  const requestMerge = async (groupKey, masterId, dupIds) => {
    setMergeConfirm({ masterId, dupIds, counts: null, loading: true });
    try {
      const [reactions, tours, visits, tasks] = await Promise.all([
        base44.entities.Reaction.filter({ client_id: { $in: dupIds } }),
        base44.entities.TourRequest.filter({ client_id: { $in: dupIds } }),
        base44.entities.VisitRequest.filter({ client_id: { $in: dupIds } }),
        base44.entities.Task.filter({ client_id: { $in: dupIds } })
      ]);
      setMergeConfirm({ masterId, dupIds, counts: { reactions: reactions.length, tours: tours.length, visits: visits.length, tasks: tasks.length }, loading: false });
    } catch (e) {
      setMergeConfirm({ masterId, dupIds, counts: null, loading: false, error: e.message });
    }
  };

  const confirmMerge = async () => {
    setMerging(true);
    try {
      const res = await base44.functions.invoke('mergeClients', { masterId: mergeConfirm.masterId, duplicateIds: mergeConfirm.dupIds });
      toast({ title: 'Clientes fusionados', description: `${res.data?.merged || 0} registros unidos al maestro.` });
      setMergeConfirm(null);
      await loadClients();
    } catch (e) {
      toast({ title: 'Error al fusionar', description: e.response?.data?.error || e.message });
    }
    setMerging(false);
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
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-heading text-2xl text-latitud-black">Clientes</h1>
        <button onClick={() => setShowRegister(true)} className="flex items-center gap-2 bg-latitud-orange text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
          <UserPlus size={16} /> Registrar cliente
        </button>
      </div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-latitud-gray">{filteredClients.length} clientes registrados</p>
        <button onClick={normalizePhones} disabled={normalizing} className="flex items-center gap-1.5 text-xs text-latitud-gray hover:text-latitud-orange">
          {normalizing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Normalizar teléfonos
        </button>
      </div>

      {/* Duplicates banner */}
      {duplicateGroups.length > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
          <div className="flex items-center gap-2 text-amber-700 text-sm">
            <AlertTriangle size={16} className="shrink-0" />
            <span>Se detectaron {duplicateGroups.length} grupos de clientes duplicados</span>
          </div>
          <button onClick={() => setShowDuplicates(s => !s)} className="text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg">
            {showDuplicates ? 'Ocultar' : 'Revisar duplicados'}
          </button>
        </div>
      )}

      {/* Duplicate review */}
      {showDuplicates && duplicateGroups.length > 0 && (
        <div className="space-y-3 mb-4">
          {duplicateGroups.map(g => {
            const gkey = phoneKey(g[0]);
            const masterId = selectedMasters[gkey] || g[0].id;
            const dupIds = g.filter(c => c.id !== masterId).map(c => c.id);
            return (
              <div key={gkey} className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <GitMerge size={14} className="text-amber-600" />
                  <p className="text-sm font-semibold text-amber-700">{formatPhoneDisplay(gkey)} · {g.length} registros</p>
                </div>
                <div className="space-y-2">
                  {g.map(c => {
                    const score = c.buyer_intent_score ?? c.lead_score ?? 0;
                    const isMaster = masterId === c.id;
                    return (
                      <label key={c.id} className="flex items-start gap-2 bg-white rounded-xl p-3 cursor-pointer">
                        <input type="radio" name={gkey} checked={isMaster} onChange={() => setSelectedMasters(prev => ({ ...prev, [gkey]: c.id }))} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-latitud-black truncate">{c.name || 'Sin nombre'} {isMaster && <span className="text-[10px] text-amber-600 font-semibold">(maestro)</span>}</p>
                          <p className="text-xs text-latitud-gray truncate">{c.email || '—'}</p>
                          <p className="text-[11px] text-latitud-gray">
                            {score} pts · {c.liked_count || 0} favoritas · {c.visit_requests_count || 0} citas · {timeAgo(c.created_date)}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <button onClick={() => requestMerge(gkey, masterId, dupIds)} className="mt-3 w-full bg-latitud-orange text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2">
                  <GitMerge size={14} /> Fusionar en este registro
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-latitud-gray/40" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
        {LEAD_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
              filter === f ? 'bg-latitud-orange text-white' : 'bg-white text-latitud-gray border border-gray-100'
            }`}
          >
            {f === 'all' ? 'Todos' : getLeadStatusLabel(f)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-5">
        <div className="h-4 w-px bg-gray-200" />
        {ORIGIN_FILTERS.map(o => (
          <button
            key={o.key}
            onClick={() => setFilter(filter === o.key ? 'all' : o.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === o.key ? 'bg-latitud-black text-white' : 'bg-white text-latitud-gray border border-gray-100'
            }`}
          >
            {o.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-latitud-gray cursor-pointer">
          <input type="checkbox" checked={showMerged} onChange={e => setShowMerged(e.target.checked)} />
          Mostrar fusionados
        </label>
      </div>

      {/* Client list */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-latitud-gray">No hay clientes en esta categoría</p>
          </div>
        ) : filteredClients.map(client => {
          const score = client.buyer_intent_score ?? client.lead_score ?? 0;
          const origin = clientOrigin(client);
          return (
          <Link key={client.id} to={`/admin/client/${client.id}`} className="block bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-latitud-light flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-latitud-orange">{client.name?.[0]}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-latitud-black truncate">{client.name}</p>
                  <p className="text-xs text-latitud-gray truncate">{client.whatsapp}</p>
                  {client.email && <p className="text-xs text-latitud-gray flex items-center gap-1 truncate"><Mail size={10} className="shrink-0" /> {client.email}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full capitalize ${
                  (client.lead_status || 'explorando') === 'prioridad máxima' ? 'bg-red-50 text-red-500' :
                  (client.lead_status || 'explorando') === 'alta intención' ? 'bg-latitud-orange/10 text-latitud-orange' :
                  (client.lead_status || 'explorando') === 'lead calificado' ? 'bg-green-50 text-green-600' :
                  (client.lead_status || 'explorando') === 'interesado' ? 'bg-yellow-50 text-yellow-600' :
                  'bg-gray-100 text-latitud-gray'
                }`}>
                  {getLeadStatusLabel(client.lead_status || 'explorando')}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${origin.className}`}>{origin.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-latitud-gray mb-2">
              <span className="flex items-center gap-1"><Zap size={10} className="text-latitud-orange" /> {score} pts</span>
              <span className="flex items-center gap-1"><Heart size={10} className="text-red-400" /> {client.liked_count || 0} favoritas</span>
              <span className="flex items-center gap-1"><Calendar size={10} /> {client.visit_requests_count || 0} citas</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(client.last_activity_date)}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {client.budget_range && <span className="text-[10px] bg-latitud-light px-2 py-0.5 rounded-full text-latitud-gray">{client.budget_range}</span>}
              {(client.favorite_zones || []).slice(0, 3).map(z => (
                <span key={z} className="text-[10px] bg-latitud-orange/10 text-latitud-orange px-2 py-0.5 rounded-full flex items-center gap-0.5"><MapPin size={8} /> {z}</span>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {client.duplicate_of && <span className="text-[10px] bg-gray-200 text-latitud-gray px-2 py-0.5 rounded-full font-semibold">Fusionado</span>}
              {(client.liked_count || 0) >= 3 && <span className="text-[10px] bg-[#C9A45C]/15 text-[#C9A45C] px-2 py-0.5 rounded-full font-semibold">Selección activa</span>}
              {(client.visit_requests_count || 0) > 0 && <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-semibold">Listo para visita</span>}
              {client.phone_verified && <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5"><CheckCircle size={8} /> WhatsApp verificado</span>}
            </div>
          </Link>
        );})}
      </div>

      <RegisterClientModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onExisting={(id) => { setShowRegister(false); navigate(`/admin/client/${id}`); }}
        onCreated={(id) => { setShowRegister(false); navigate(`/admin/client/${id}`); }}
      />

      {/* Merge confirmation */}
      {mergeConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => !mergeConfirm.loading && setMergeConfirm(null)}>
          <div className="w-full bg-white rounded-t-3xl px-6 pt-6 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-lg text-latitud-black">Confirmar fusión</h3>
              <button onClick={() => setMergeConfirm(null)} className="p-1"><X size={18} className="text-latitud-gray" /></button>
            </div>
            {mergeConfirm.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-latitud-orange" />
              </div>
            ) : (
              <>
                <p className="text-sm text-latitud-gray mb-3">Se reasignarán al maestro los siguientes registros vinculados a los duplicados:</p>
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="bg-latitud-light rounded-xl px-3 py-2 flex justify-between"><span className="text-latitud-gray">Reacciones</span><span className="font-semibold text-latitud-black">{mergeConfirm.counts?.reactions ?? 0}</span></div>
                  <div className="bg-latitud-light rounded-xl px-3 py-2 flex justify-between"><span className="text-latitud-gray">Recorridos</span><span className="font-semibold text-latitud-black">{mergeConfirm.counts?.tours ?? 0}</span></div>
                  <div className="bg-latitud-light rounded-xl px-3 py-2 flex justify-between"><span className="text-latitud-gray">Visitas</span><span className="font-semibold text-latitud-black">{mergeConfirm.counts?.visits ?? 0}</span></div>
                  <div className="bg-latitud-light rounded-xl px-3 py-2 flex justify-between"><span className="text-latitud-gray">Tareas</span><span className="font-semibold text-latitud-black">{mergeConfirm.counts?.tasks ?? 0}</span></div>
                </div>
                <p className="text-xs text-latitud-gray mb-4">Los duplicados se marcan como fusionados (no se borran). Esta acción no se puede deshacer.</p>
                <div className="flex gap-2">
                  <button onClick={() => setMergeConfirm(null)} className="flex-1 py-3 rounded-xl border border-gray-100 text-latitud-gray text-sm font-semibold">Cancelar</button>
                  <button onClick={confirmMerge} disabled={merging} className="flex-1 py-3 rounded-xl bg-latitud-orange text-white text-sm font-semibold flex items-center justify-center gap-2">
                    {merging ? <Loader2 size={16} className="animate-spin" /> : <><GitMerge size={14} /> Fusionar</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}