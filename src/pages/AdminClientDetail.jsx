import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ThumbsDown, Calendar, MapPin, DollarSign, Home, Star, Phone, Mail, MessageCircle, Clock, Send, Eye, Trash2, AlertTriangle, X, Loader2, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatPrice, calculateMatch } from '@/lib/matchEngine';
import { getCoverPhoto } from '@/lib/propertyImages';
import { isBuyerVisible, evaluateBuyerVisibility, HIDDEN_REASON_LABELS } from '@/lib/commissionRules';
import { clientOrigin } from '@/lib/clientOrigin';
import { formatPhoneDisplay } from '@/lib/phoneNormalize';
import CuratedSelectionEditor from '@/components/CuratedSelectionEditor';
import { useToast } from '@/components/ui/use-toast';

const WA_MESSAGES = [
  { label: 'Enviar selección', template: 'Hola, [Nombre]. Vi que te gustaron algunas propiedades en [Zona]. Te preparé una selección más cercana a lo que buscas. ¿Te la envío por aquí?' },
  { label: 'Confirmar visita', template: 'Hola, [Nombre]. Vi que solicitaste visitar [Propiedad]. Tengo disponibilidad en [Fecha]. ¿Te funciona?' },
  { label: 'Nueva propiedad', template: 'Hola, [Nombre]. Con base en las propiedades que te gustaron, encontré una nueva opción que podría encajar muy bien contigo.' },
  { label: 'Ajustar búsqueda', template: 'Hola, [Nombre]. Vi que algunas opciones no encajaron por [Motivo]. Ajusté la búsqueda para mostrarte propiedades más compatibles.' },
];

export default function AdminClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [visits, setVisits] = useState([]);
  const [tours, setTours] = useState([]);
  const [allProps, setAllProps] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [likedProps, setLikedProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadClient();
  }, [id]);

  const loadClient = async () => {
    const [clientData, allReactions, allVisits, allTours, allProps] = await Promise.all([
      base44.entities.Client.get(id),
      base44.entities.Reaction.filter({ client_id: id }),
      base44.entities.VisitRequest.filter({ client_id: id }),
      base44.entities.TourRequest.filter({ client_id: id }),
      base44.entities.Property.list('-created_date', 200)
    ]);

    setClient(clientData);
    setReactions(allReactions);
    setVisits(allVisits);
    setTours(allTours);
    setAllProps(allProps);

    // Fetch liked properties by ID so we can diagnose which are no longer available.
    const likedIds = [...new Set(allReactions.filter(r => r.reaction_type === 'like').map(r => r.property_id))];
    const likedPropsFetched = likedIds.length > 0 ? await base44.entities.Property.filter({ id: { $in: likedIds } }) : [];
    setLikedProps(likedPropsFetched);

    // Recommended properties
    const reactedIds = allReactions.map(r => r.property_id);
    const unreacted = allProps.filter(p => !reactedIds.includes(p.id));
    const withMatch = unreacted.map(p => {
      const match = calculateMatch(p, clientData);
      return { ...p, _matchPercentage: match.percentage, _matchReason: match.reasonText };
    }).sort((a, b) => b._matchPercentage - a._matchPercentage).slice(0, 3);

    setRecommended(withMatch);
    setLoading(false);
  };

  const openWhatsApp = (template) => {
    if (!client) return;
    const zone = client.favorite_zones?.[0] || 'tu zona de interés';
    const dislikeReasons = reactions.filter(r => r.reaction_type === 'dislike' && r.dislike_reason).map(r => r.dislike_reason);
    const motivo = dislikeReasons[0] || 'algunos aspectos';

    let msg = template
      .replace('[Nombre]', client.name)
      .replace('[Zona]', zone)
      .replace('[Propiedad]', reactions.find(r => r.reaction_type === 'visit_request')?.property_title || 'la propiedad')
      .replace('[Fecha]', 'esta semana')
      .replace('[Motivo]', motivo.toLowerCase());

    const phone = client.whatsapp?.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const openDelete = async () => {
    try {
      const tasks = await base44.entities.Task.filter({ client_id: id });
      setTaskCount(tasks.length);
    } catch (e) { setTaskCount(0); }
    setDeleteText('');
    setShowDelete(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await base44.functions.invoke('deleteClient', { clientId: id });
      toast({ title: 'Cliente eliminado', description: `${client.name} y sus registros asociados fueron borrados.` });
      navigate('/admin/clients');
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.error || e.message });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) return <div className="p-6 text-latitud-gray">Cliente no encontrado</div>;

  const likes = reactions.filter(r => r.reaction_type === 'like');
  const dislikes = reactions.filter(r => r.reaction_type === 'dislike');
  const propMap = Object.fromEntries(allProps.map(p => [p.id, p]));
  const unavailableLiked = likedProps.filter(p => !isBuyerVisible(p));
  const origin = clientOrigin(client);

  return (
    <div className="px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/clients')} className="p-1"><ArrowLeft size={22} className="text-latitud-black" /></button>
        <div>
          <h1 className="font-heading text-xl text-latitud-black">{client.name}</h1>
          <p className="text-xs text-latitud-gray">{client.commercial_stage || 'Nuevo'}</p>
        </div>
        <span className={`ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full ${
          client.intent_score === 'Alta intención' ? 'bg-latitud-orange/10 text-latitud-orange' :
          client.intent_score === 'Intención media' ? 'bg-yellow-50 text-yellow-600' :
          'bg-gray-100 text-latitud-gray'
        }`}>
          {client.intent_score || 'Explorando'}
        </span>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${origin.className}`}>
          {origin.label}
        </span>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Phone size={14} className="text-latitud-gray" />
            <span className="text-sm text-latitud-black">{formatPhoneDisplay(client.whatsapp) || client.whatsapp}</span>
          </div>
          {client.email && (
            <div className="flex items-center gap-3">
              <Mail size={14} className="text-latitud-gray" />
              <span className="text-sm text-latitud-black">{client.email}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <MapPin size={14} className="text-latitud-gray" />
            <span className="text-sm text-latitud-black">{client.city || '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <DollarSign size={14} className="text-latitud-gray" />
            <span className="text-sm text-latitud-black">{client.budget_range || '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Home size={14} className="text-latitud-gray" />
            <span className="text-sm text-latitud-black">{client.looking_for || '—'} · {client.property_type_wanted || '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={14} className="text-latitud-gray" />
            <span className="text-sm text-latitud-black">{client.estimated_purchase_date || '—'} · {client.payment_method || '—'}</span>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-sm text-latitud-black mb-3">Preferencias</h3>
        {client.favorite_zones?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-latitud-gray mb-1">Zonas favoritas</p>
            <div className="flex flex-wrap gap-1.5">
              {client.favorite_zones.map(z => (
                <span key={z} className="text-xs bg-latitud-light px-2.5 py-1 rounded-full text-latitud-black">{z}</span>
              ))}
            </div>
          </div>
        )}
        {client.important_features?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-latitud-gray mb-1">Lo que más valora</p>
            <div className="flex flex-wrap gap-1.5">
              {client.important_features.map(f => (
                <span key={f} className="text-xs bg-latitud-orange/10 text-latitud-orange px-2.5 py-1 rounded-full">{f}</span>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-latitud-gray">
          <span>Recámaras: {client.bedrooms_wanted || '—'}</span>
          <span>·</span>
          <span>Asesor: {client.assigned_advisor || 'Sin asignar'}</span>
        </div>
      </div>

      {/* Activity stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <Heart size={16} className="text-red-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-latitud-black">{likes.length}</p>
          <p className="text-[10px] text-latitud-gray">Likes</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <ThumbsDown size={16} className="text-latitud-gray mx-auto mb-1" />
          <p className="text-lg font-bold text-latitud-black">{dislikes.length}</p>
          <p className="text-[10px] text-latitud-gray">Rechazos</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <Calendar size={16} className="text-latitud-orange mx-auto mb-1" />
          <p className="text-lg font-bold text-latitud-black">{visits.length}</p>
          <p className="text-[10px] text-latitud-gray">Visitas</p>
        </div>
      </div>

      {/* Actividad en la app */}
      {(() => {
        const sevenDaysAgo = Date.now() - 7 * 86400000;
        const recentOpens = (client.app_open_history || []).filter(ts => new Date(ts).getTime() >= sevenDaysAgo).length;
        const intensity = recentOpens >= 5 ? 'Alta' : recentOpens >= 2 ? 'Media' : 'Baja';
        const intensityClass = recentOpens >= 5 ? 'bg-latitud-orange/10 text-latitud-orange' : recentOpens >= 2 ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-latitud-gray';
        const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—';
        const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
        return (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
              <Activity size={14} className="text-latitud-orange" /> Actividad en la app
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
              <div><p className="text-xs text-latitud-gray">Total de entradas</p><p className="font-semibold text-latitud-black">{client.app_opens_count || 0}</p></div>
              <div><p className="text-xs text-latitud-gray">Días activos</p><p className="font-semibold text-latitud-black">{client.active_days_count || 0}</p></div>
              <div><p className="text-xs text-latitud-gray">Primera entrada</p><p className="font-semibold text-latitud-black">{fmtDate(client.first_seen_at)}</p></div>
              <div><p className="text-xs text-latitud-gray">Última entrada</p><p className="font-semibold text-latitud-black">{fmtDateTime(client.last_seen_at)}</p></div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-latitud-gray">Intensidad (últimos 7 días):</span>
              <span className={`font-semibold px-2 py-0.5 rounded-full ${intensityClass}`}>{intensity}</span>
            </div>
          </div>
        );
      })()}

      {/* Selección del comprador */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
          <Heart size={14} className="text-[#C9A45C]" /> Selección del comprador
        </h3>
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-latitud-light rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-latitud-black">{likes.length}</p>
            <p className="text-[10px] text-latitud-gray">Favoritas</p>
          </div>
          <div className="bg-latitud-light rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-latitud-black">{tours.length}</p>
            <p className="text-[10px] text-latitud-gray">Recorridos</p>
          </div>
          <div className="bg-latitud-light rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-latitud-black">{dislikes.length}</p>
            <p className="text-[10px] text-latitud-gray">Descartadas</p>
          </div>
          <div className="bg-latitud-light rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-latitud-black">{reactions.filter(r => r.reaction_type === 'view').length}</p>
            <p className="text-[10px] text-latitud-gray">Vistas</p>
          </div>
        </div>

        {likes.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-latitud-gray mb-2">Propiedades favoritas</p>
            {likes.map(r => {
              const p = propMap[r.property_id];
              return (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  {p && (
                    <img src={getCoverPhoto(p)} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-latitud-black truncate">{r.property_title}</p>
                    <p className="text-xs text-latitud-gray truncate">
                      {r.property_zone} · {formatPrice(r.property_price)}{p?.construction_area ? ` · ${p.construction_area}m²` : ''}
                    </p>
                  </div>
                  <button onClick={() => navigate(`/property/${r.property_id}`)} className="text-[10px] text-latitud-orange font-semibold flex items-center gap-1 shrink-0">
                    <Eye size={11} /> Ver
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {client.preferred_amenities?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-latitud-gray mb-1">Amenidades más buscadas</p>
            <div className="flex flex-wrap gap-1.5">
              {client.preferred_amenities.map(a => (
                <span key={a} className="text-[11px] bg-latitud-orange/10 text-latitud-orange px-2 py-0.5 rounded-full">{a}</span>
              ))}
            </div>
          </div>
        )}

        {dislikes.length > 0 && (
          <div>
            <p className="text-xs text-latitud-gray mb-1">Descartadas</p>
            <p className="text-[11px] text-latitud-gray/70">{dislikes.map(d => d.property_title).join(' · ')}</p>
          </div>
        )}
      </div>

      {/* Diagnóstico: propiedades guardadas que ya no están disponibles */}
      {unavailableLiked.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold text-sm text-latitud-black mb-1 flex items-center gap-2">
            <Eye size={14} className="text-latitud-gray" /> Propiedades guardadas no disponibles
          </h3>
          <p className="text-xs text-latitud-gray mb-3">{unavailableLiked.length} propiedades guardadas ya no están disponibles.</p>
          {unavailableLiked.map(p => {
            const reason = HIDDEN_REASON_LABELS[evaluateBuyerVisibility(p).reason] || evaluateBuyerVisibility(p).reason || p.hidden_reason || '—';
            return (
              <div key={p.id} className="py-2 border-b border-gray-50 last:border-0">
                <p className="text-sm text-latitud-black truncate">{p.title}</p>
                <p className="text-xs text-latitud-gray">{reason}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Selección del asesor */}
      <CuratedSelectionEditor
        client={client}
        allProps={allProps}
        onSaved={(updated) => setClient(prev => ({ ...prev, ...updated }))}
      />

      {/* Rejection reasons */}
      {dislikes.filter(d => d.dislike_reason).length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
            <ThumbsDown size={14} className="text-latitud-gray" /> Razones de rechazo
          </h3>
          {dislikes.filter(d => d.dislike_reason).map(r => (
            <div key={r.id} className="py-2 border-b border-gray-50 last:border-0">
              <p className="text-sm text-latitud-black">{r.property_title}</p>
              <p className="text-xs text-latitud-orange">{r.dislike_reason}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {recommended.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold text-sm text-latitud-black mb-1">Qué enviarle a este cliente</h3>
          <p className="text-xs text-latitud-gray mb-3">Propiedades con mejor afinidad</p>
          {recommended.map(p => (
            <div key={p.id} className="py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-latitud-black">{p.title}</p>
                  <p className="text-xs text-latitud-gray">{formatPrice(p.price)} · {p.zone}</p>
                </div>
                <span className="text-xs font-bold text-latitud-orange">{p._matchPercentage}%</span>
              </div>
              <p className="text-xs text-latitud-orange/70 mt-1">{p._matchReason}</p>
            </div>
          ))}
        </div>
      )}

      {/* WhatsApp actions */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-sm text-latitud-black mb-3 flex items-center gap-2">
          <MessageCircle size={14} className="text-green-500" /> Mensajes WhatsApp
        </h3>
        <div className="space-y-2">
          {WA_MESSAGES.map((m, i) => (
            <button
              key={i}
              onClick={() => openWhatsApp(m.template)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-latitud-light text-left hover:bg-gray-100 transition-colors"
            >
              <Send size={14} className="text-latitud-orange shrink-0" />
              <span className="text-sm text-latitud-black">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="mb-4">
        <button onClick={openDelete} className="text-xs text-red-500 font-semibold flex items-center gap-1.5">
          <Trash2 size={13} /> Eliminar cliente
        </button>
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => !deleting && setShowDelete(false)}>
          <div className="w-full bg-white rounded-t-3xl px-6 pt-6 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-lg text-latitud-black">Eliminar cliente</h3>
              <button onClick={() => setShowDelete(false)} className="p-1"><X size={18} className="text-latitud-gray" /></button>
            </div>
            <p className="text-sm text-latitud-gray mb-3">Se eliminará a <span className="font-semibold text-latitud-black">{client.name}</span> y sus registros asociados:</p>
            <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
              <div className="bg-latitud-light rounded-xl px-3 py-2 flex justify-between"><span className="text-latitud-gray">Reacciones</span><span className="font-semibold text-latitud-black">{reactions.length}</span></div>
              <div className="bg-latitud-light rounded-xl px-3 py-2 flex justify-between"><span className="text-latitud-gray">Recorridos</span><span className="font-semibold text-latitud-black">{tours.length}</span></div>
              <div className="bg-latitud-light rounded-xl px-3 py-2 flex justify-between"><span className="text-latitud-gray">Visitas</span><span className="font-semibold text-latitud-black">{visits.length}</span></div>
              <div className="bg-latitud-light rounded-xl px-3 py-2 flex justify-between"><span className="text-latitud-gray">Tareas</span><span className="font-semibold text-latitud-black">{taskCount}</span></div>
            </div>
            {client.phone_verified && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs font-semibold px-3 py-2 rounded-xl mb-3">
                <AlertTriangle size={14} /> Este es un cliente real verificado por WhatsApp
              </div>
            )}
            <p className="text-xs text-latitud-gray mb-2">Escribe <span className="font-bold text-red-500">ELIMINAR</span> para confirmar. Esta acción no se puede deshacer.</p>
            <input
              type="text"
              value={deleteText}
              onChange={e => setDeleteText(e.target.value)}
              placeholder="ELIMINAR"
              className="w-full px-4 py-3 rounded-xl bg-latitud-light border border-gray-100 text-sm mb-4 focus:border-red-400 focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-3 rounded-xl border border-gray-100 text-latitud-gray text-sm font-semibold">Cancelar</button>
              <button onClick={confirmDelete} disabled={deleteText !== 'ELIMINAR' || deleting} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={14} /> Eliminar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}