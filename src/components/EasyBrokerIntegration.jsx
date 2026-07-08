import React from 'react';
import { Plug, CheckCircle2, Clock } from 'lucide-react';

const CHECKLIST = [
  { label: 'API key configured', status: 'pending' },
  { label: 'MLS access enabled', status: 'pending' },
  { label: 'Backend sync ready', status: 'pending' },
  { label: 'Commission filter ready', status: 'ready' },
  { label: 'Duplicate detection ready', status: 'ready' },
  { label: 'Last sync', status: 'pending' }
];

export default function EasyBrokerIntegration() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 border border-[#C9A45C]/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#E6D3A3]/30 flex items-center justify-center">
            <Plug size={16} className="text-[#C9A45C]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-latitud-black">EasyBroker Integration</p>
            <p className="text-[11px] text-latitud-gray">Not connected</p>
          </div>
        </div>
        <button
          disabled
          title="Available when API key and MLS access are configured."
          className="bg-gray-100 text-latitud-gray text-xs font-semibold px-4 py-2 rounded-xl cursor-not-allowed"
        >
          Connect EasyBroker
        </button>
      </div>
      <p className="text-xs text-latitud-gray mb-3 leading-relaxed">
        Connect EasyBroker MLS API to sync active homes, shared commission listings and property updates into MatchHouse.
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {CHECKLIST.map(c => (
          <div key={c.label} className="flex items-center gap-2 text-xs">
            {c.status === 'ready'
              ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
              : <Clock size={14} className="text-latitud-gray/50 shrink-0" />}
            <span className={c.status === 'ready' ? 'text-latitud-black' : 'text-latitud-gray'}>{c.label}</span>
            <span className={`ml-auto text-[10px] font-semibold ${c.status === 'ready' ? 'text-green-500' : 'text-latitud-gray/60'}`}>
              {c.status === 'ready' ? 'Ready' : 'Pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}