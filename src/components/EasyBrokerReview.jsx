import React, { useState } from 'react';
import { BadgeCheck, EyeOff, Copy, Split, CheckCircle, Send, FileJson, ImageOff } from 'lucide-react';
import { HIDDEN_REASON_LABELS, isCommissionConfirmed } from '@/lib/commissionRules';
import { getCoverPhoto } from '@/lib/propertyImages';
import { formatPrice } from '@/lib/matchEngine';

const TABS = [
  { id: 'all', label: 'All imported' },
  { id: 'visible', label: 'Visible to buyer' },
  { id: 'no_shared_commission', label: 'Hidden: no commission' },
  { id: 'commission_unknown', label: 'Hidden: commission unknown' },
  { id: 'missing_photos', label: 'Hidden: missing photos' },
  { id: 'missing_construction_m2', label: 'Hidden: missing m²' },
  { id: 'not_house', label: 'Hidden: not house' },
  { id: 'inactive', label: 'Hidden: inactive' },
  { id: 'duplicates', label: 'Possible duplicates' },
  { id: 'manual_review', label: 'Manual review' },
  { id: 'commission_review', label: 'Commission review' }
];

export default function EasyBrokerReview({ properties, onUpdate, onSetMaster, onSeparate }) {
  const [tab, setTab] = useState('all');
  const [rawFor, setRawFor] = useState(null);

  const filterFor = (tab) => {
    switch (tab) {
      case 'visible': return properties.filter(p => p.is_visible_to_buyer !== false);
      case 'no_shared_commission': return properties.filter(p => p.hidden_reason === 'no_shared_commission');
      case 'commission_unknown': return properties.filter(p => p.hidden_reason === 'commission_unknown');
      case 'missing_photos': return properties.filter(p => p.hidden_reason === 'missing_photos');
      case 'missing_construction_m2': return properties.filter(p => p.hidden_reason === 'missing_construction_m2');
      case 'not_house': return properties.filter(p => p.hidden_reason === 'not_house');
      case 'inactive': return properties.filter(p => p.hidden_reason === 'inactive');
      case 'duplicates': return properties.filter(p => p.is_duplicate === true || p.duplicate_group_id);
      case 'manual_review': return properties.filter(p => p.manual_review_required === true);
      case 'commission_review': return properties.filter(p => !isCommissionConfirmed(p) && p.commission_status !== 'not_shared');
      default: return properties;
    }
  };

  const list = filterFor(tab);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
      <h2 className="font-heading text-lg text-latitud-black mb-1">EasyBroker MLS Review</h2>
      <p className="text-xs text-latitud-gray mb-3">
        Only confirmed / manually confirmed commission properties are shown to buyers. Internal data below is admin-only.
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
          <p className="text-center text-sm text-latitud-gray py-8">No properties in this category.</p>
        )}
        {list.map(p => {
          const visible = p.is_visible_to_buyer !== false;
          const confirmed = isCommissionConfirmed(p);
          return (
            <div key={p.id} className="flex gap-3 border border-gray-100 rounded-xl p-3">
              <img src={getCoverPhoto(p)} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-latitud-black truncate">{p.title}</p>
                <p className="text-xs text-latitud-gray">{p.zone}, {p.city} · {formatPrice(p.price, p.currency)}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-latitud-gray">{p.property_type} · {p.operation_type}</span>
                  {visible
                    ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600">Visible to buyer</span>
                    : <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500">Hidden: {HIDDEN_REASON_LABELS[p.hidden_reason] || p.hidden_reason}</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${confirmed ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                    Commission: {p.commission_status || 'unknown'}
                  </span>
                  {p.mls_collaborator_name && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">Collab: {p.mls_collaborator_name}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Act onClick={() => onUpdate(p.id, { is_visible_to_buyer: true, hidden_reason: null, is_visible_in_app: true, visible_to_clients: true })} icon={BadgeCheck} tone="green">Approve visible</Act>
                  <Act onClick={() => onUpdate(p.id, { is_visible_to_buyer: false, hidden_reason: 'manual_hidden', is_visible_in_app: false, visible_to_clients: false })} icon={EyeOff} tone="gray">Hide</Act>
                  <Act onClick={() => onUpdate(p.id, { is_duplicate: true, manual_review_required: false })} icon={Copy} tone="yellow">Mark duplicate</Act>
                  {p.is_duplicate && onSetMaster && <Act onClick={() => onSetMaster(p)} icon={BadgeCheck} tone="green">Master</Act>}
                  {p.is_duplicate && onSeparate && <Act onClick={() => onSeparate(p)} icon={Split} tone="gray">Separate</Act>}
                  <Act onClick={() => onUpdate(p.id, { commission_status: 'manually_confirmed', commission_verified_at: new Date().toISOString(), is_visible_to_buyer: true, hidden_reason: null })} icon={CheckCircle} tone="green">Confirm commission</Act>
                  <Act onClick={() => onUpdate(p.id, { manual_review_required: true })} icon={Send} tone="gray">Send to review</Act>
                  <Act onClick={() => onUpdate(p.id, { manual_review_required: true, is_visible_in_app: false, visible_to_clients: false, is_visible_to_buyer: false })} icon={ImageOff} tone="gray">No photo</Act>
                  <Act onClick={() => setRawFor(rawFor === p.id ? null : p.id)} icon={FileJson} tone="gray">Raw data</Act>
                </div>

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