import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, MapPin, Eye, EyeOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatPrice } from '@/lib/matchEngine';
import { useToast } from '@/components/ui/use-toast';

export default function AdminProperties() {
  const { toast } = useToast();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('Disponible');

  useEffect(() => {
    base44.entities.Property.list('-created_date', 50).then(p => {
      setProperties(p);
      setLoading(false);
    });
  }, []);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast({
        title: 'Sincronización simulada completada',
        description: 'Se actualizaron propiedades, precios, fotografías y disponibilidad desde EasyBroker.',
      });
    }, 2000);
  };

  const filtered = filter === 'Todas' ? properties : properties.filter(p => p.status === filter);

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
        <h1 className="font-heading text-2xl text-latitud-black">Propiedades</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-latitud-orange text-white text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar EasyBroker'}
        </button>
      </div>
      <p className="text-sm text-latitud-gray mb-5">{properties.length} propiedades en inventario</p>

      {/* Filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {['Disponible', 'Apartada', 'Vendida', 'Rentada', 'Pausada', 'Todas'].map(f => (
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

      {/* Property list */}
      <div className="space-y-3">
        {filtered.map(p => (
          <Link key={p.id} to={`/property/${p.id}`} className="block bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="flex">
              <div className="w-28 h-28">
                <img src={p.photos?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400'} alt={p.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-latitud-black leading-tight">{p.title}</p>
                    <p className="text-latitud-orange font-bold text-sm">{formatPrice(p.price, p.currency)}</p>
                  </div>
                  {p.visible_to_clients ? (
                    <Eye size={14} className="text-green-500 shrink-0" />
                  ) : (
                    <EyeOff size={14} className="text-latitud-gray/40 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-latitud-gray mt-1">
                  <MapPin size={10} />
                  <span>{p.zone}, {p.city}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    p.status === 'Disponible' ? 'bg-green-50 text-green-600' :
                    p.status === 'Vendida' || p.status === 'Rentada' ? 'bg-red-50 text-red-500' :
                    'bg-yellow-50 text-yellow-600'
                  }`}>{p.status}</span>
                  <span className="text-[10px] text-latitud-gray">{p.operation_type}</span>
                  <span className="text-[10px] text-latitud-gray">{p.internal_code}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}