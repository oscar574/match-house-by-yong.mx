import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { brandConfig } from '@/lib/brandConfig';
import { useToast } from '@/components/ui/use-toast';

export default function AdminWhiteLabel() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState({
    brand_name: brandConfig.brand_name,
    brand_subtitle: brandConfig.brand_subtitle,
    company_name: brandConfig.company_name,
    powered_by_text: brandConfig.powered_by_text,
    primary_color: brandConfig.colors.obsidian,
    secondary_color: brandConfig.colors.charcoal,
    accent_color: brandConfig.colors.champagne_gold,
    contact_whatsapp: brandConfig.contact_whatsapp || '',
    contact_email: brandConfig.contact_email || '',
    whatsapp_number: brandConfig.whatsapp_number || '',
    logo_url: brandConfig.logo_url || '',
    demo_mode: brandConfig.demo_whatsapp_otp_enabled,
    require_whatsapp_verification: brandConfig.require_whatsapp_verification
  });

  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));

  const save = () => {
    localStorage.setItem('matchhouse_brand_overrides', JSON.stringify(cfg));
    toast({ title: 'White label guardado (demo)', description: 'Los cambios se guardan localmente para previsualizar.' });
  };

  return (
    <div className="px-4 py-6">
      <h1 className="font-heading text-2xl text-latitud-black mb-1">White Label Settings</h1>
      <p className="text-sm text-latitud-gray mb-5">Personaliza la marca para clonar MatchHouse a cualquier inmobiliaria.</p>

      {/* Live preview */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: cfg.primary_color }}>
        <div className="flex items-center gap-2 mb-3">
          {cfg.logo_url ? (
            <img src={cfg.logo_url} alt="logo" className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: cfg.accent_color }}>
              <span className="font-extrabold text-sm" style={{ color: cfg.primary_color }}>{cfg.brand_name?.[0] || 'M'}</span>
            </div>
          )}
          <div>
            <p className="text-white font-extrabold text-sm">{cfg.brand_name}</p>
            <p className="text-white/60 text-[10px] tracking-widest">{cfg.brand_subtitle}</p>
          </div>
        </div>
        <button className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: cfg.accent_color, color: cfg.primary_color }}>
          Start my match
        </button>
        <p className="text-white/40 text-[10px] mt-3">{cfg.powered_by_text}</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
        <Field label="Brand name" value={cfg.brand_name} onChange={v => set('brand_name', v)} />
        <Field label="Brand subtitle" value={cfg.brand_subtitle} onChange={v => set('brand_subtitle', v)} />
        <Field label="Company name" value={cfg.company_name} onChange={v => set('company_name', v)} />
        <Field label="Powered by text" value={cfg.powered_by_text} onChange={v => set('powered_by_text', v)} />
        <ColorField label="Primary color" value={cfg.primary_color} onChange={v => set('primary_color', v)} />
        <ColorField label="Secondary color" value={cfg.secondary_color} onChange={v => set('secondary_color', v)} />
        <ColorField label="Accent color" value={cfg.accent_color} onChange={v => set('accent_color', v)} />
        <Field label="Contact WhatsApp" value={cfg.contact_whatsapp} onChange={v => set('contact_whatsapp', v)} />
        <Field label="WhatsApp de contacto (propiedades)" value={cfg.whatsapp_number} onChange={v => set('whatsapp_number', v)} />
        <Field label="Contact email" value={cfg.contact_email} onChange={v => set('contact_email', v)} />
        <Field label="Logo URL" value={cfg.logo_url} onChange={v => set('logo_url', v)} />
        <Toggle label="Demo mode" value={cfg.demo_mode} onChange={v => set('demo_mode', v)} />
        <Toggle label="Require WhatsApp verification" value={cfg.require_whatsapp_verification} onChange={v => set('require_whatsapp_verification', v)} />

        <button onClick={save} className="w-full bg-[#C9A45C] text-latitud-black font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
          <Save size={16} /> Guardar (demo)
        </button>
        <p className="text-[10px] text-latitud-gray text-center">Demo: los cambios se guardan localmente para previsualizar el white label.</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">{label}</label>
      <input value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-[#C9A45C] focus:outline-none transition-colors" />
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-100 cursor-pointer p-0.5" />
        <input value={value || ''} onChange={e => onChange(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-[#C9A45C] focus:outline-none transition-colors" />
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-latitud-black">{label}</span>
      <button onClick={() => onChange(!value)} className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-[#C9A45C]' : 'bg-gray-200'}`}>
        <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}