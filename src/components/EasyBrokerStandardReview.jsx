import React, { useState } from 'react';
import { BadgeCheck, EyeOff, Copy, Split, Send, FileJson, ImageOff, Image } from 'lucide-react';
import { HIDDEN_REASON_LABELS } from '@/lib/commissionRules';
import { getCoverPhoto } from '@/lib/propertyImages';
import { formatPrice } from '@/lib/matchEngine';

const TABS = [
  { id: 'all', label: 'Imported from Standard' },
  { id: 'visible', label: 'Visible to buyer' },
  { id: 'hidden', label: 'Hidden by filters' },
  { id: 'missing_photos', label: 'Missing photos' },
  { id: 'missing_construction_m2', label: 'Missing construction m²' },
  { id: 'missing_price', label: 'Missing price' },
  { id: 'not_house', label: 'Not house' },
  { id: 'not_sale', label: 'Not sale' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'duplicates', label: 'Possible duplicates' },
  { id: 'manual_review', label: 'Manual review' }
];

export default function EasyBrokerStandardReview({ properties, onUpdate, onSetMaster, onSeparate }) {
  const [tab, setTab] = useState('all');
  const [rawFor, setRawFor] = useState(null);
  const [coverFor, setCoverFor] = useState(null);

  const standardProps = properties.filter(p => p.sync_source === 'easybroker_standard' || p.own_inventory === true);

  const filterFor = (t) => {
    switch (t) {
      case 'visible': return standardProps.filter(p => p.is_visible_to_buyer !== false);
      case 'hidden': return standardProps.filter(p => p.is_visible_to_buyer === false && p.hidden_reason && p.hidden_reason !== 'manual_hidden');
      case 'missing_photos': return standardProps.filter(p => p.hidden_reason === 'missing_photos');
      case 'missing_construction_m2': return standardProps.filter(p => p.hidden_reason === 'missing_construction_m2');
      case 'missing_price': return standardProps.filter(p => p.hidden_reason === 'missing_price');
      case 'not_house': return standardProps.filter(p => p.hidden_reason === 'not_house');
      case 'not_sale': return standardProps.filter(p => p.hidden_reason === 'not_sale');
      case 'inactive': return standardProps.filter(p => p.hidden_reason === 'inactive');
      case 'duplicates': return standardProps.filter(p => p.is_duplicate === true || p.duplicate_group_id);
      case 'manual_review': return standardProps.filter(p => p.manual_review_required === true);
      default: return standardProps;
    }
  };

  const list = filterFor(tab);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
      <h2 className="font-heading text-lg text-latitud-black mb-1">EasyBroker Standard Review</h2>
      <p className="text-xs text-latitud-gray mb-3">
        Inventario propio de la cuenta conectada (Own inventory). Comercialmente válido para Latitud — sin requerir comisión compartida. Datos internos solo para admin.
      </p>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
              tab === t.id ? 'bg-latitud-black text-white' : 'bg-latitud-light text-latitud-gray'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.length === 0 && (
          <p className="text-center text-sm text-latitud-gray py-8">No properties in this category. Run “Sync EasyBroker Standard Now” to import.</p>
        )}
        {list.map(p => {
          const visible = p.is_visible_to_buyer !== false;
          return (
            <div key={p.id} className="flex gap-3 border border-gray-100 rounded-xl p-3">
              <img src={getCoverPhoto(p)} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-latitud-black truncate">{p.title}</p>
                <p className="text-xs text-latitud-gray">{p.zone}, {p.city} · {formatPrice(p.price, p.currency)}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-latitud-gray">{p.property_type} · {p.operation_type}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">Own inventory</span>
                  {visible
                    ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600">Visible to buyer</span>
                    : <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500">Hidden: {HIDDEN_REASON_LABELS[p.hidden_reason] || p.hidden_reason}</span>}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Act onClick={() => onUpdate(p.id, { is_visible_to_buyer: true, is_visible_in_app: true, visible_to_clients: true, hidden_reason: null })} icon={BadgeCheck} tone="green">Approve visible</Act>
                  <Act onClick={() => onUpdate(p.id, { is_visible_to_buyer: false, is_visible_in_app: false, visible_to_clients: false, hidden_reason: 'manual_hidden' })} icon={EyeOff} tone="gray">Hide</Act>
                  <Act onClick={() => onUpdate(p.id, { is_duplicate: true, manual_review_required: false, is_visible_to_buyer: false, is_visible_in_app: false, visible_to_clients: false, hidden_reason: 'duplicate_hidden' })} icon={Copy} tone="yellow">Mark duplicate</Act>
                  {p.is_duplicate && onSetMaster && <Act onClick={() => onSetMaster(p)} icon={BadgeCheck} tone="green">Master</Act>}
                  {p.is_duplicate && onSeparate && <Act onClick={() => onSeparate(p)} icon={Split} tone="gray">Separate</Act>}
                  <Act onClick={() => setCoverFor(coverFor === p.id ? null : p.id)} icon={Image} tone="gray">Change cover</Act>
                  <Act onClick={() => onUpdate(p.id, { manual_review_required: true })} icon={Send} tone="gray">Send to review</Act>
                  <Act onClick={() => setRawFor(rawFor === p.id ? null : p.id)} icon={FileJson} tone="gray">Raw data (admin)</Act>
                </div>

                {coverFor === p.id && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(p.photo_urls && p.photo_urls.length > 0 ? p.photo_urls : (p.photos || [])).map((url, i) => (
                      <button key={i} onClick={() => { onUpdate(p.id, { cover_photo_url: url }); setCoverFor(null); }} className="relative">
                        <img src={url} alt="" className={`w-14 h-14 rounded-lg object-cover border-2 ${p.cover_photo_url === url ? 'border-latitud-orange' : 'border-transparent'}`} />
                      </button>
                    ))}
                    {(!p.photo_urls || p.photo_urls.length === 0) && (!p.photos || p.photos.length === 0) && (
                      <span className="text-[11px] text-latitud-gray">No photos available.</span>
                    )}
                  </div>
                )}

                {rawFor === p.id && (
                  <pre className="mt-2 text-[10px] bg-latitud-black text-green-300 rounded-lg p-2 overflow-auto max-h-40">
                    {JSON.stringify(p.raw_easybroker_payload || { note: 'No raw sync payload stored (admin only).' }, null, 1)}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Act({ icon: Icon, children, onClick, tone }) {
  const tones = {
    green: 'bg-green-50 text-green-600',
    gray: 'bg-gray-100 text-latitud-gray',
    yellow: 'bg-yellow-50 text-yellow-600'
  };
  return (
    <button onClick={onClick} className={`text-[10px] px-2 py-1 rounded-lg font-medium flex items-center gap-1 ${tones[tone]}`}>
      <Icon size={10} /> {children}
    </button>
  );
}