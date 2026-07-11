import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, Calendar, MapPin, Zap, Mail, Clock, CheckCircle, UserPlus, RefreshCw, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getLeadStatusLabel } from '@/lib/leadScoring';
import RegisterClientModal from '@/components/RegisterClientModal';
import { useToast } from '@/components/ui/use-toast';

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

  useEffect(() => {
    base44.entities.Client.list('-created_date', 100).then(c => {
      setClients(c);
      setLoading(false);
    });
  }, []);

  const filteredClients = clients.filter(c => {
    const matchesSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || c.lead_status === filter;
    return matchesSearch && matchesFilter;
  });

  const normalizePhones = async () => {
    setNormalizing(true);
    try {
      const res = await base44.functions.invoke('normalizeClients', {});
      const d = res.data || {};
      toast({ title: 'Teléfonos normalizados', description: `${d.normalized || 0} normalizados · ${d.duplicatesMarked || 0} duplicados marcados.` });
      const c = await base44.entities.Client.list('-created_date', 100);
      setClients(c);
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.error || e.message });
    }
    setNormalizing(false);
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
        <p className="text-sm text-latitud-gray">{clients.length} clientes registrados</p>
        <button onClick={normalizePhones} disabled={normalizing} className="flex items-center gap-1.5 text-xs text-latitud-gray hover:text-latitud-orange">
          {normalizing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Normalizar teléfonos
        </button>
      </div>

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
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {['all', 'prioridad máxima', 'alta intención', 'lead calificado', 'interesado', 'explorando'].map(f => (
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

      {/* Client list */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-latitud-gray">No hay clientes en esta categoría</p>
          </div>
        ) : filteredClients.map(client => {
          const score = client.buyer_intent_score ?? client.lead_score ?? 0;
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
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full capitalize shrink-0 ${
                (client.lead_status || 'explorando') === 'prioridad máxima' ? 'bg-red-50 text-red-500' :
                (client.lead_status || 'explorando') === 'alta intención' ? 'bg-latitud-orange/10 text-latitud-orange' :
                (client.lead_status || 'explorando') === 'lead calificado' ? 'bg-green-50 text-green-600' :
                (client.lead_status || 'explorando') === 'interesado' ? 'bg-yellow-50 text-yellow-600' :
                'bg-gray-100 text-latitud-gray'
              }`}>
                {getLeadStatusLabel(client.lead_status || 'explorando')}
              </span>
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
    </div>
  );
}