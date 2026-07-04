import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Heart, Calendar, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    base44.entities.Client.list('-created_date', 50).then(c => {
      setClients(c);
      setLoading(false);
    });
  }, []);

  const filteredClients = clients.filter(c => {
    const matchesSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || c.intent_score === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="font-heading text-2xl text-latitud-black mb-1">Clientes</h1>
      <p className="text-sm text-latitud-gray mb-5">{clients.length} clientes registrados</p>

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
        {['all', 'Alta intención', 'Intención media', 'Explorando'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f ? 'bg-latitud-orange text-white' : 'bg-white text-latitud-gray border border-gray-100'
            }`}
          >
            {f === 'all' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {/* Client list */}
      <div className="space-y-3">
        {filteredClients.map(client => (
          <Link key={client.id} to={`/admin/client/${client.id}`} className="block bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-latitud-light flex items-center justify-center">
                  <span className="text-sm font-bold text-latitud-orange">{client.name?.[0]}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-latitud-black">{client.name}</p>
                  <p className="text-xs text-latitud-gray">{client.whatsapp}</p>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                client.intent_score === 'Alta intención' ? 'bg-latitud-orange/10 text-latitud-orange' :
                client.intent_score === 'Intención media' ? 'bg-yellow-50 text-yellow-600' :
                'bg-gray-100 text-latitud-gray'
              }`}>
                {client.intent_score || 'Explorando'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-latitud-gray">
              <span className="flex items-center gap-1"><MapPin size={10} /> {client.city || '—'}</span>
              <span className="flex items-center gap-1"><Heart size={10} className="text-red-400" /> {client.liked_count || 0}</span>
              <span className="flex items-center gap-1"><Calendar size={10} /> {client.visit_requests_count || 0} visitas</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] bg-latitud-light px-2 py-0.5 rounded-full text-latitud-gray">{client.budget_range || 'Sin presupuesto'}</span>
              <span className="text-[10px] bg-latitud-light px-2 py-0.5 rounded-full text-latitud-gray">{client.commercial_stage || 'Nuevo'}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}