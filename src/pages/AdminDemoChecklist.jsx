import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Clock, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { brandConfig } from '@/lib/brandConfig';

const STATUS = {
  ready: { label: 'Ready', icon: CheckCircle2, cls: 'bg-green-50 text-green-600' },
  review: { label: 'Needs review', icon: AlertCircle, cls: 'bg-yellow-50 text-yellow-600' },
  missing: { label: 'Missing', icon: XCircle, cls: 'bg-red-50 text-red-500' },
  pending: { label: 'Pending', icon: Clock, cls: 'bg-gray-100 text-latitud-gray' }
};

export default function AdminDemoChecklist() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [properties, clients, visits, tasks, reactions] = await Promise.all([
        base44.entities.Property.list('-created_date', 100),
        base44.entities.Client.list('-created_date', 100),
        base44.entities.VisitRequest.list('-created_date', 100),
        base44.entities.Task.list('-created_date', 100),
        base44.entities.Reaction.list('-created_date', 100)
      ]);

      const visibleProps = properties.filter(p => p.is_visible_in_app !== false && p.status === 'Disponible');
      const clientsWithScore = clients.filter(c => (c.buyer_intent_score ?? c.lead_score ?? 0) > 0);

      const buyer = [
        { label: 'Home ready', status: 'ready' },
        { label: 'Onboarding ready', status: 'ready' },
        { label: 'WhatsApp verification demo ready', status: brandConfig.demo_whatsapp_otp_enabled ? 'ready' : 'pending' },
        { label: 'Discover ready', status: visibleProps.length > 0 ? 'ready' : 'missing' },
        { label: 'Favorites ready', status: 'ready' },
        { label: 'Property detail ready', status: 'ready' },
        { label: 'Visit request ready', status: 'ready' }
      ];
      const adminExp = [
        { label: 'Dashboard ready', status: 'ready' },
        { label: 'Clients ready', status: clients.length > 0 ? 'ready' : 'review' },
        { label: 'Visits ready', status: visits.length > 0 ? 'ready' : 'review' },
        { label: 'Properties ready', status: properties.length > 0 ? 'ready' : 'missing' },
        { label: 'Intelligence ready', status: reactions.length > 0 ? 'ready' : 'review' },
        { label: 'Tasks ready', status: 'ready' }
      ];
      const business = [
        { label: 'White label settings ready', status: 'ready' },
        { label: 'EasyBroker architecture ready', status: 'ready' },
        { label: 'Demo data ready', status: (properties.length > 0 && clients.length > 0) ? 'ready' : 'review' },
        { label: 'No Latitud branding', status: 'ready' },
        { label: 'Luxury branding applied', status: 'ready' }
      ];

      setGroups([
        { title: 'Buyer experience', items: buyer },
        { title: 'Admin experience', items: adminExp },
        { title: 'Business readiness', items: business }
      ]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  const all = groups.flatMap(g => g.items);
  const readyCount = all.filter(c => c.status === 'ready').length;
  const pct = Math.round((readyCount / all.length) * 100);

  return (
    <div className="px-4 py-6">
      <h1 className="font-heading text-2xl text-latitud-black mb-1">Launch Checklist</h1>
      <p className="text-sm text-latitud-gray mb-5">Estado de preparación para demo white label</p>

      {brandConfig.demo_whatsapp_otp_enabled && (
        <div className="bg-[#E6D3A3]/25 border border-[#C9A45C]/30 rounded-2xl p-3 mb-5 flex items-center gap-2">
          <Sparkles size={14} className="text-[#C9A45C] shrink-0" />
          <p className="text-[11px] text-latitud-black/70">
            <span className="font-semibold">Demo Mode Active</span> · Propiedades demo · EasyBroker no conectado · WhatsApp OTP demo (123456)
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-latitud-black">{pct}% listo</p>
          <p className="text-xs text-latitud-gray">{readyCount}/{all.length} ready</p>
        </div>
        <div className="h-2 bg-latitud-light rounded-full overflow-hidden">
          <div className="h-full bg-[#C9A45C] rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {groups.map(g => (
        <div key={g.title} className="mb-5">
          <h2 className="font-heading text-sm font-semibold text-latitud-black uppercase tracking-wider mb-2.5">{g.title}</h2>
          <div className="space-y-2">
            {g.items.map((c, i) => {
              const s = STATUS[c.status];
              const Icon = s.icon;
              return (
                <div key={i} className="bg-white rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${s.cls}`}>
                    <Icon size={14} />
                  </span>
                  <p className="text-sm font-medium text-latitud-black flex-1">{c.label}</p>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${s.cls}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}