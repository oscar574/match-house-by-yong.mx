import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { brandConfig } from '@/lib/brandConfig';
import { useBrandRefresh } from '@/lib/BrandSettingsContext';
import { useToast } from '@/components/ui/use-toast';

const DEFAULTS = {
  brand_name: brandConfig.brand_name,
  brand_subtitle: brandConfig.brand_subtitle,
  logo_url: '',
  primary_color: brandConfig.colors.obsidian,
  secondary_color: brandConfig.colors.taupe,
  accent_color: brandConfig.colors.champagne_gold,
  whatsapp_number: brandConfig.whatsapp_number,
  contact_email: brandConfig.contact_email || '',
  tagline_principal: brandConfig.taglines_es.primary,
  tagline_secundaria: brandConfig.taglines_es.secondary
};

export default function AdminWhiteLabel() {
  const { toast } = useToast();
  const refresh = useBrandRefresh();
  const [cfg, setCfg] = useState(DEFAULTS);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const records = await base44.entities.BrandSettings.list('-created_date', 1);
        if (records[0]) {
          setRecordId(records[0].id);
          setCfg({ ...DEFAULTS, ...records[0] });
        }
      } catch (e) { /* ignore — use defaults */ }
      setLoading(false);
    })();
  }, []);

  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('logo_url', file_url);
      toast({ title: 'Logo cargado', description: 'Guarda para aplicarlo en toda la app.' });
    } catch (err) {
      toast({ title: 'Error al subir el logo', description: err.message || 'Intenta de nuevo.' });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const restoreDefaults = () => {
    setCfg(DEFAULTS);
    toast({ title: 'Valores de MatchHouse restaurados', description: 'Guarda para aplicar.' });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...cfg };
      if (recordId) {
        await base44.entities.BrandSettings.update(recordId, payload);
      } else {
        const created = await base44.entities.BrandSettings.create(payload);
        if (created?.id) setRecordId(created.id);
      }
      await refresh();
      toast({ title: 'White label guardado', description: 'Los cambios se aplicaron en toda la app.' });
    } catch (err) {
      toast({ title: 'Error al guardar', description: err.message || 'Intenta de nuevo.' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="font-heading text-2xl text-latitud-black mb-1">White Label</h1>
      <p className="text-sm text-latitud-gray mb-5">Personaliza marca, logo, colores y contacto. Los cambios se aplican en toda la app al guardar.</p>

      {/* Live preview — reflects editing values before saving */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: cfg.primary_color }}>
        <div className="flex items-center gap-2 mb-3">
          {cfg.logo_url ? (
            <img src={cfg.logo_url} alt="logo" className="h-10 w-auto object-contain rounded" />
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: cfg.accent_color }}>
              <span className="font-extrabold text-sm" style={{ color: cfg.primary_color }}>{cfg.brand_name?.[0] || 'M'}</span>
            </div>
          )}
          <div>
            <p className="text-white font-extrabold text-sm">{cfg.brand_name}</p>
            <p className="text-white/60 text-[10px] tracking-widest">{cfg.brand_subtitle}</p>
          </div>
        </div>
        <p className="text-white/70 text-sm mb-1">{cfg.tagline_principal}</p>
        <p className="text-white/40 text-xs mb-4">{cfg.tagline_secundaria}</p>
        <button className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: cfg.accent_color, color: cfg.primary_color }}>
          Iniciar mi match
        </button>
        <p className="text-white/30 text-[10px] mt-3">WhatsApp: {cfg.whatsapp_number || '—'}</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
        <Field label="Nombre de marca" value={cfg.brand_name} onChange={v => set('brand_name', v)} />
        <Field label="Subtítulo de marca" value={cfg.brand_subtitle} onChange={v => set('brand_subtitle', v)} />
        <Field label="Tagline principal" value={cfg.tagline_principal} onChange={v => set('tagline_principal', v)} />
        <Field label="Tagline secundaria" value={cfg.tagline_secundaria} onChange={v => set('tagline_secundaria', v)} />

        {/* Logo upload + URL */}
        <div>
          <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">Logo</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-latitud-light border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
              {cfg.logo_url ? (
                <img src={cfg.logo_url} alt="logo" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon size={20} className="text-latitud-gray/50" />
              )}
            </div>
            <div className="flex-1">
              <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" onChange={handleUpload} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 text-sm font-medium text-latitud-black disabled:opacity-50">
                <Upload size={14} /> {uploading ? 'Subiendo…' : 'Subir imagen'}
              </button>
              <p className="text-[10px] text-latitud-gray mt-1">PNG, JPG o SVG · fondo transparente recomendado</p>
            </div>
          </div>
          <input value={cfg.logo_url || ''} onChange={e => set('logo_url', e.target.value)} placeholder="o pega una URL de logo" className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none transition-colors" />
        </div>

        <ColorField label="Color primario (fondos oscuros)" value={cfg.primary_color} onChange={v => set('primary_color', v)} />
        <ColorField label="Color secundario (texto/apoyos)" value={cfg.secondary_color} onChange={v => set('secondary_color', v)} />
        <ColorField label="Color acento (botones/acento)" value={cfg.accent_color} onChange={v => set('accent_color', v)} />

        <Field label="WhatsApp de contacto (propiedades)" value={cfg.whatsapp_number} onChange={v => set('whatsapp_number', v)} />
        <Field label="Correo de contacto" value={cfg.contact_email} onChange={v => set('contact_email', v)} />

        <div className="flex gap-2 pt-2">
          <button onClick={restoreDefaults} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-100 text-sm font-medium text-latitud-gray">
            <RotateCcw size={14} /> Restaurar MatchHouse
          </button>
          <button onClick={save} disabled={saving} className="flex-1 bg-latitud-orange text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={16} /> Guardar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">{label}</label>
      <input value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none transition-colors" />
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-100 cursor-pointer p-0.5" />
        <input value={value || ''} onChange={e => onChange(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-gray-100 text-sm focus:border-latitud-orange focus:outline-none transition-colors" />
      </div>
    </div>
  );
}