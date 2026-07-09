import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, MapPin, Eye, EyeOff, ImageOff, BadgeCheck, AlertTriangle, Star, Copy, Split } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatPrice } from '@/lib/matchEngine';
import { getCoverPhoto, getFallbackImage } from '@/lib/propertyImages';
import { useToast } from '@/components/ui/use-toast';
import { computeDuplicateFlags, countDuplicates, groupDuplicates } from '@/lib/duplicateDetection';
import { evaluateBuyerVisibility } from '@/lib/commissionRules';
import EasyBrokerIntegration from '@/components/EasyBrokerIntegration';
import EasyBrokerReview from '@/components/EasyBrokerReview';

export default function AdminProperties() {
  const { toast } = useToast();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('Todas');
  const [dupStats, setDupStats] = useState({ groups: 0, hidden: 0, total: 0 });
  const [viewMode, setViewMode] = useState('inventory');

  const syncSummary = React.useMemo(() => {
    let visible = 0, hidden = 0, noCom = 0, photos = 0, constr = 0, dups = 0, review = 0;
    properties.forEach(p => {
      const v = evaluateBuyerVisibility(p);
      if (v.visible) visible++;
      else {
        hidden++;
        if (v.reason === 'no_shared_commission' || v.reason === 'commission_unknown') noCom++;
        if (v.reason === 'missing_photos') photos++;
        if (v.reason === 'missing_construction_m2') constr++;
        if (v.reason === 'duplicate_hidden') dups++;
      }
      if (p.manual_review_required) review++;
    });
    return {
      totalImported: properties.length, visible, hidden,
      hiddenNoCommission: noCom, hiddenPhotos: photos, hiddenConstruction: constr,
      hiddenDuplicates: dups, pendingReview: review, lastSync: 'Never'
    };
  }, [properties]);

  const loadProperties = async () => {
    const p = await base44.entities.Property.list('-created_date', 50);
    setProperties(p);
    setDupStats(countDuplicates(p));
  };

  useEffect(() => {
    loadProperties().then(() => setLoading(false));
  }, []);

  const runDuplicateDetection = async () => {
    const { updates } = computeDuplicateFlags(properties);
    if (updates.length === 0) {
      toast({ title: 'Sin cambios', description: 'No se encontraron nuevos duplicados.' });
      return;
    }
    // Apply updates in batches
    for (const u of updates) {
      await base44.entities.Property.update(u.id, u.updates);
    }
    const updated = properties.map(p => {
      const u = updates.find(x => x.id === p.id);
      return u ? { ...p, ...u.updates } : p;
    });
    setProperties(updated);
    setDupStats(countDuplicates(updated));
    toast({ title: 'Detección completada', description: `${updates.length} propiedades actualizadas.` });
  };

  const setAsMaster = async (p) => {
    // Clear this property's duplicate flags, set others in group as pointing to it
    const groupId = p.duplicate_group_id;
    if (!groupId) return;
    const group = properties.filter(x => x.duplicate_group_id === groupId);
    // Clear this one
    await base44.entities.Property.update(p.id, {
      is_duplicate: false,
      duplicate_master_property_id: null,
      duplicate_confidence_score: 100,
      manual_review_required: false
    });
    // Set others to point to it
    for (const other of group) {
      if (other.id === p.id) continue;
      await base44.entities.Property.update(other.id, {
        is_duplicate: true,
        duplicate_master_property_id: p.id,
        duplicate_confidence_score: 90
      });
    }
    const updated = properties.map(x => {
      if (x.id === p.id) return { ...x, is_duplicate: false, duplicate_master_property_id: null, duplicate_confidence_score: 100 };
      if (x.duplicate_group_id === groupId) return { ...x, is_duplicate: true, duplicate_master_property_id: p.id };
      return x;
    });
    setProperties(updated);
    setDupStats(countDuplicates(updated));
    toast({ title: 'Propiedad principal actualizada' });
  };

  const separateFromGroup = async (p) => {
    await base44.entities.Property.update(p.id, {
      is_duplicate: false,
      duplicate_group_id: null,
      duplicate_master_property_id: null,
      duplicate_confidence_score: 0,
      manual_review_required: false
    });
    const updated = properties.map(x => x.id === p.id ? {
      ...x, is_duplicate: false, duplicate_group_id: null, duplicate_master_property_id: null, duplicate_confidence_score: 0
    } : x);
    setProperties(updated);
    setDupStats(countDuplicates(updated));
    toast({ title: 'Propiedad separada del grupo' });
  };

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

  const updateProperty = async (id, updates) => {
    await base44.entities.Property.update(id, updates);
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const toggleVisibility = (p) => {
    const newVisible = !(p.is_visible_in_app !== false);
    updateProperty(p.id, { is_visible_in_app: newVisible, visible_to_clients: newVisible });
    toast({ title: newVisible ? 'Propiedad visible' : 'Propiedad oculta' });
  };

  const confirmCommission = (p) => {
    updateProperty(p.id, {
      commission_status: 'Confirmada',
      collaboration_enabled: true,
      shared_commission: true,
      commission_verified_at: new Date().toISOString()
    });
    toast({ title: 'Comisión confirmada' });
  };

  const markNoPhoto = (p) => {
    updateProperty(p.id, { manual_review_required: true, is_visible_in_app: false, visible_to_clients: false });
    toast({ title: 'Marcada como sin foto válida' });
  };

  const raisePriority = (p) => {
    const newPriority = p.manual_priority === 'Alta' ? 'Media' : 'Alta';
    updateProperty(p.id, { manual_priority: newPriority });
    toast({ title: `Prioridad: ${newPriority}` });
  };

  // Build duplicate groups for grouped view
  const dupGroups = groupDuplicates(properties);

  // Filters
  const filtered = properties.filter(p => {
    switch (filter) {
      case 'Visibles': return p.is_visible_in_app !== false && p.visible_to_clients !== false;
      case 'Ocultas': return p.is_visible_in_app === false || p.visible_to_clients === false;
      case 'Comisión': return p.commission_status === 'Confirmada';
      case 'Sin comisión': return p.commission_status !== 'Confirmada';
      case 'Duplicadas': return p.is_duplicate === true;
      case 'Grupos dup': return !!p.duplicate_group_id;
      case 'Sin foto': return !p.cover_photo_url && (!p.photos || p.photos.length === 0);
      case 'Revisión': return p.manual_review_required === true;
      default: return true;
    }
  });

  const filters = ['Todas', 'Visibles', 'Ocultas', 'Comisión', 'Sin comisión', 'Duplicadas', 'Grupos dup', 'Sin foto', 'Revisión'];

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
        <h1 className="font-heading text-2xl text-latitud-black">MatchHouse Properties</h1>
        <div className="flex flex-col items-end gap-1">
          <button
            disabled
            title="EasyBroker sync will be enabled when API key is configured."
            className="flex items-center gap-2 bg-gray-100 text-latitud-gray text-xs font-semibold px-4 py-2 rounded-xl cursor-not-allowed"
          >
            <RefreshCw size={14} />
            Sync EasyBroker
          </button>
          <span className="text-[10px] text-latitud-gray">EasyBroker sync will be enabled when API key is configured.</span>
        </div>
      </div>
      <p className="text-sm text-latitud-gray mb-3">{properties.length} propiedades · {filtered.length} en filtro</p>

      <EasyBrokerIntegration syncSummary={syncSummary} onNavigateReview={() => setViewMode('review')} onSynced={loadProperties} />

      <div className="flex gap-2 mb-4">
        <button onClick={() => setViewMode('inventory')} className={`px-4 py-2 rounded-xl text-xs font-semibold ${viewMode === 'inventory' ? 'bg-latitud-black text-white' : 'bg-white text-latitud-gray border border-gray-100'}`}>Inventario</button>
        <button onClick={() => setViewMode('review')} className={`px-4 py-2 rounded-xl text-xs font-semibold ${viewMode === 'review' ? 'bg-latitud-black text-white' : 'bg-white text-latitud-gray border border-gray-100'}`}>EasyBroker MLS Review</button>
      </div>

      {viewMode === 'review' ? (
        <EasyBrokerReview
          properties={properties}
          onUpdate={updateProperty}
          onSetMaster={setAsMaster}
          onSeparate={separateFromGroup}
        />
      ) : (
      <>
      {/* Duplicate detection summary */}
      <div className="bg-latitud-light rounded-xl p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Copy size={16} className="text-latitud-orange" />
          <div>
            <p className="text-xs font-semibold text-latitud-black">{dupStats.groups} grupos de duplicados</p>
            <p className="text-[10px] text-latitud-gray">{dupStats.hidden} propiedades ocultas al comprador</p>
          </div>
        </div>
        <button
          onClick={runDuplicateDetection}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-latitud-orange text-white"
        >
          Detectar
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {filters.map(f => (
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
        {filtered.map(p => {
          const cover = getCoverPhoto(p);
          const visible = p.is_visible_in_app !== false && p.visible_to_clients !== false;
          const commissionOk = p.commission_status === 'Confirmada';
          const hasPhoto = !!(p.cover_photo_url || (p.photos && p.photos.length > 0));

          return (
            <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="flex">
                <div className="w-28 h-28 relative shrink-0">
                  <img
                    src={cover}
                    alt={p.title}
                    onError={(e) => { e.target.src = getFallbackImage(p); }}
                    className="w-full h-full object-cover"
                  />
                  {!hasPhoto && (
                    <div className="absolute inset-0 bg-latitud-light flex items-center justify-center">
                      <ImageOff size={20} className="text-latitud-gray" />
                    </div>
                  )}
                </div>
                <div className="flex-1 p-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/property/${p.id}`} className="min-w-0">
                      <p className="text-sm font-semibold text-latitud-black leading-tight truncate">{p.title}</p>
                      <p className="text-latitud-orange font-bold text-sm">{formatPrice(p.price, p.currency)}</p>
                    </Link>
                    <div className="flex items-center gap-1 shrink-0">
                      {commissionOk && <BadgeCheck size={14} className="text-green-500" />}
                      {p.is_duplicate && <AlertTriangle size={14} className="text-yellow-500" />}
                      {p.manual_review_required && <AlertTriangle size={14} className="text-red-400" />}
                      {visible ? (
                        <Eye size={14} className="text-green-500" />
                      ) : (
                        <EyeOff size={14} className="text-latitud-gray/40" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-latitud-gray mt-1">
                    <MapPin size={10} />
                    <span className="truncate">{p.zone}, {p.city}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      p.status === 'Disponible' ? 'bg-green-50 text-green-600' :
                      p.status === 'Vendida' || p.status === 'Rentada' ? 'bg-red-50 text-red-500' :
                      'bg-yellow-50 text-yellow-600'
                    }`}>{p.status}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      commissionOk ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-latitud-gray'
                    }`}>{p.commission_status || 'Sin comisión'}</span>
                    <span className="text-[10px] text-latitud-gray">{p.construction_area || 0}m²</span>
                    <span className="text-[10px] text-latitud-gray">{p.bedrooms || 0} rec</span>
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <button
                      onClick={() => toggleVisibility(p)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-latitud-light text-latitud-gray font-medium"
                    >
                      {visible ? 'Ocultar' : 'Mostrar'}
                    </button>
                    {!commissionOk && (
                      <button
                        onClick={() => confirmCommission(p)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-green-50 text-green-600 font-medium"
                      >
                        Confirmar comisión
                      </button>
                    )}
                    {hasPhoto && (
                      <button
                        onClick={() => markNoPhoto(p)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-gray-100 text-latitud-gray font-medium"
                      >
                        Sin foto
                      </button>
                    )}
                    <button
                      onClick={() => raisePriority(p)}
                      className={`text-[10px] px-2 py-1 rounded-lg font-medium flex items-center gap-1 ${
                        p.manual_priority === 'Alta' ? 'bg-latitud-orange/10 text-latitud-orange' : 'bg-gray-100 text-latitud-gray'
                      }`}
                    >
                      <Star size={10} /> {p.manual_priority || 'Media'}
                    </button>
                    {p.is_duplicate === true && (
                      <>
                        <button
                          onClick={() => setAsMaster(p)}
                          className="text-[10px] px-2 py-1 rounded-lg bg-latitud-orange/10 text-latitud-orange font-medium flex items-center gap-1"
                        >
                          <BadgeCheck size={10} /> Principal
                        </button>
                        <button
                          onClick={() => separateFromGroup(p)}
                          className="text-[10px] px-2 py-1 rounded-lg bg-gray-100 text-latitud-gray font-medium flex items-center gap-1"
                        >
                          <Split size={10} /> Separar
                        </button>
                      </>
                    )}
                    {p.is_duplicate === false && p.duplicate_group_id && (
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-green-50 text-green-600 font-medium flex items-center gap-1">
                        <BadgeCheck size={10} /> Principal del grupo
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
</>
      )}
    </div>
  );
}