import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, Copy, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatPrice } from '@/lib/matchEngine';
import { getCoverPhoto } from '@/lib/propertyImages';
import { useToast } from '@/components/ui/use-toast';

export default function CuratedSelectionEditor({ client, allProps, onSaved }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(client.curated_property_ids || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedIds(client.curated_property_ids || []);
  }, [client.id]);

  const propMap = useMemo(() => Object.fromEntries(allProps.map(p => [p.id, p])), [allProps]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return allProps
      .filter(p => !selectedIds.includes(p.id))
      .filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.zone?.toLowerCase().includes(q) ||
        String(p.price || '').includes(q)
      )
      .slice(0, 15);
  }, [search, selectedIds, allProps]);

  const selectedProps = selectedIds.map(id => propMap[id]).filter(Boolean);

  const addProperty = (id) => {
    setSelectedIds(prev => [...prev, id]);
    setSearch('');
  };

  const removeProperty = (id) => {
    setSelectedIds(prev => prev.filter(pid => pid !== id));
  };

  const moveProperty = (index, dir) => {
    setSelectedIds(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      let advisorName = client.assigned_advisor || '';
      try {
        const me = await base44.auth.me();
        advisorName = me?.full_name || advisorName;
      } catch (e) { /* ignore */ }
      const updated = await base44.entities.Client.update(client.id, {
        curated_property_ids: selectedIds,
        curated_at: new Date().toISOString(),
        curated_by: advisorName
      });
      toast({ title: 'Selección del asesor guardada' });
      onSaved && onSaved(updated);
    } catch (err) {
      toast({ title: 'Error al guardar', description: err.message || 'Intenta de nuevo.' });
    }
    setSaving(false);
  };

  const copyWhatsAppMessage = async () => {
    const count = selectedIds.length;
    const msg = `Hola ${client.name || ''}, te preparé una selección de ${count} propiedad${count === 1 ? '' : 'es'} especialmente para ti. Ingresa a match.yong.mx/access para verlas.`;
    try {
      await navigator.clipboard.writeText(msg);
      toast({ title: 'Mensaje copiado', description: 'Ya puedes pegarlo en WhatsApp.' });
    } catch (err) {
      toast({ title: 'No se pudo copiar', description: 'Copia el mensaje manualmente.' });
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-latitud-black flex items-center gap-2">
          <Star size={14} className="text-[#C9A45C]" /> Selección del asesor
        </h3>
        <span className="text-[10px] text-latitud-gray">{selectedIds.length} propiedades</span>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-latitud-gray/40" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por título, zona o precio..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-latitud-light border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-72 overflow-y-auto">
            {searchResults.map(p => (
              <button
                key={p.id}
                onClick={() => addProperty(p.id)}
                className="w-full flex items-center gap-3 p-2.5 hover:bg-latitud-light text-left border-b border-gray-50 last:border-0"
              >
                <img src={getCoverPhoto(p)} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-latitud-black truncate">{p.title}</p>
                  <p className="text-[11px] text-latitud-gray truncate">{p.zone} · {formatPrice(p.price)}</p>
                </div>
                <Plus size={14} className="text-latitud-orange shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected list */}
      {selectedProps.length === 0 ? (
        <p className="text-xs text-latitud-gray py-3 text-center">Aún no has agregado propiedades a la selección.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {selectedProps.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 py-1.5">
              <img src={getCoverPhoto(p)} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-latitud-black truncate">{p.title}</p>
                <p className="text-xs text-latitud-gray truncate">{p.zone} · {formatPrice(p.price)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => moveProperty(i, -1)} disabled={i === 0} className="text-[10px] text-latitud-gray disabled:opacity-30 px-1">▲</button>
                <button onClick={() => moveProperty(i, 1)} disabled={i === selectedProps.length - 1} className="text-[10px] text-latitud-gray disabled:opacity-30 px-1">▼</button>
                <button onClick={() => removeProperty(p.id)} className="p-1.5 text-latitud-gray hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={copyWhatsAppMessage}
          disabled={selectedIds.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 text-sm font-medium text-latitud-black disabled:opacity-50"
        >
          <Copy size={14} /> Copiar mensaje de WhatsApp
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 bg-latitud-orange text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar selección'}
        </button>
      </div>
    </div>
  );
}