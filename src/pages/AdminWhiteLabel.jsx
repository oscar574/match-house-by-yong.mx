import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, RotateCcw, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { brandConfig } from '@/lib/brandConfig';
import { useBrandRefresh } from '@/lib/BrandSettingsContext';
import { optimizeImage } from '@/lib/imageOptimize';
import { useToast } from '@/components/ui/use-toast';
import { contrastRatio } from '@/lib/contrastColor';
import { Switch } from '@/components/ui/switch';

const DEFAULTS = {
  brand_name: brandConfig.brand_name,
  brand_subtitle: brandConfig.brand_subtitle,
  logo_url: '',
  hero_image_url: '',
  primary_color: brandConfig.colors.obsidian,
  secondary_color: brandConfig.colors.taupe,
  accent_color: brandConfig.colors.champagne_gold,
  whatsapp_number: brandConfig.whatsapp_number,
  contact_email: brandConfig.contact_email || '',
  tagline_principal: brandConfig.taglines_es.primary,
  tagline_secundaria: brandConfig.taglines_es.secondary,
  require_whatsapp_verification: false,
  demo_mode_skip_access: false,
  theme_mode: 'Oscuro',
  background_color: '#050505',
  surface_color: '#F8F5EF',
  text_primary_color: '#FFFDF8',
  text_secondary_color: '#8A7A63'
};

export default function AdminWhiteLabel() {
  const { toast } = useToast();
  const refresh = useBrandRefresh();
  const [cfg, setCfg] = useState(DEFAULTS);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const fileRef = useRef(null);
  const heroFileRef = useRef(null);

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

  const applyThemePreset = (mode) => {
    set('theme_mode', mode);
    if (mode === 'Oscuro') {
      set('background_color', '#050505');
      set('surface_color', '#1A1A1A');
      set('text_primary_color', '#FFFDF8');
      set('text_secondary_color', '#8A7A63');
    } else {
      set('background_color', '#FFFDF8');
      set('surface_color', '#F8F5EF');
      set('text_primary_color', '#1A1A1A');
      set('text_secondary_color', '#6B6155');
    }
  };

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

  const handleHeroUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast({ title: 'Formato no soportado', description: 'Usa JPG, PNG o WebP.' });
      if (heroFileRef.current) heroFileRef.current.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Archivo muy pesado', description: 'El máximo es 10MB.' });
      if (heroFileRef.current) heroFileRef.current.value = '';
      return;
    }
    setUploadingHero(true);
    try {
      const optimized = await optimizeImage(file, { maxWidth: 1920, maxBytes: 400 * 1024 });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: optimized });
      set('hero_image_url', file_url);
      toast({ title: 'Imagen de portada cargada', description: 'Guarda para aplicarla en el landing.' });
    } catch (err) {
      toast({ title: 'Error al subir la imagen', description: err.message || 'Intenta de nuevo.' });
    }
    setUploadingHero(false);
    if (heroFileRef.current) heroFileRef.current.value = '';
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
      <div className="relative rounded-2xl p-5 mb-5 overflow-hidden" style={{ background: cfg.primary_color }}>
        {cfg.hero_image_url && (
          <img src={cfg.hero_image_url} alt="portada" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/55 to-black/25" />
        <div className="relative">
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
          <p className="text-white/90 text-sm mb-1">{cfg.tagline_principal}</p>
          <p className="text-white/50 text-xs mb-4">{cfg.tagline_secundaria}</p>
          <button className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: cfg.accent_color, color: cfg.primary_color }}>
            Encontrar mi match
          </button>
          <p className="text-white/40 text-[10px] mt-3">WhatsApp: {cfg.whatsapp_number || '—'}</p>
        </div>
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

        {/* Hero cover image */}
        <div>
          <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">Imagen de portada (hero)</label>
          <div className="flex items-center gap-3">
            <div className="w-24 h-14 rounded-xl bg-latitud-light border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
              {cfg.hero_image_url ? (
                <img src={cfg.hero_image_url} alt="portada" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={20} className="text-latitud-gray/50" />
              )}
            </div>
            <div className="flex-1">
              <input ref={heroFileRef} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={handleHeroUpload} className="hidden" />
              <button onClick={() => heroFileRef.current?.click()} disabled={uploadingHero} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 text-sm font-medium text-latitud-black disabled:opacity-50">
                <Upload size={14} /> {uploadingHero ? 'Optimizando…' : 'Subir imagen'}
              </button>
              <p className="text-[10px] text-latitud-gray mt-1">JPG, PNG o WebP · se recomienda horizontal, mínimo 1920px de ancho</p>
            </div>
          </div>
          {cfg.hero_image_url && (
            <button onClick={() => set('hero_image_url', '')} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-latitud-gray">
              <RotateCcw size={12} /> Restaurar imagen por defecto
            </button>
          )}
        </div>

        {/* Tema */}
        <div>
          <label className="text-xs font-medium text-latitud-gray uppercase tracking-wider mb-1.5 block">Tema</label>
          <div className="flex gap-2">
            <button onClick={() => applyThemePreset('Oscuro')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${cfg.theme_mode === 'Oscuro' ? 'bg-latitud-orange text-white' : 'border border-gray-100 text-latitud-gray'}`}>Oscuro</button>
            <button onClick={() => applyThemePreset('Claro')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${cfg.theme_mode === 'Claro' ? 'bg-latitud-orange text-white' : 'border border-gray-100 text-latitud-gray'}`}>Claro</button>
          </div>
        </div>
        <ColorField label="Color de fondo" value={cfg.background_color} onChange={v => set('background_color', v)} />
        <ColorField label="Color de superficie" value={cfg.surface_color} onChange={v => set('surface_color', v)} />
        <ColorField label="Texto principal" value={cfg.text_primary_color} onChange={v => set('text_primary_color', v)} />
        <ColorField label="Texto secundario" value={cfg.text_secondary_color} onChange={v => set('text_secondary_color', v)} />

        {/* Vista previa del tema en vivo */}
        <div className="rounded-2xl p-4" style={{ background: cfg.background_color }}>
          <div className="rounded-xl p-3 mb-3" style={{ background: cfg.surface_color }}>
            <p className="text-sm font-heading mb-1" style={{ color: cfg.text_primary_color }}>Título de ejemplo</p>
            <p className="text-xs" style={{ color: cfg.text_secondary_color }}>Texto secundario de ejemplo</p>
          </div>
          <button className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: cfg.accent_color, color: cfg.background_color }}>
            Botón de acento
          </button>
        </div>

        {/* Avisos de contraste */}
        {(() => {
          const ratioText = contrastRatio(cfg.background_color, cfg.text_primary_color);
          const ratioAccent = contrastRatio(cfg.background_color, cfg.accent_color);
          const lowText = ratioText < 4.5;
          const lowAccent = ratioAccent < 4.5;
          if (!lowText && !lowAccent) return null;
          return (
            <div className="space-y-1.5">
              {lowText && (
                <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-medium px-3 py-2 rounded-xl">
                  <AlertTriangle size={13} /> Contraste bajo: el texto puede ser difícil de leer ({ratioText.toFixed(1)}:1)
                </div>
              )}
              {lowAccent && (
                <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-medium px-3 py-2 rounded-xl">
                  <AlertTriangle size={13} /> Contraste bajo: el acento contra el fondo puede ser difícil de leer ({ratioAccent.toFixed(1)}:1)
                </div>
              )}
            </div>
          );
        })()}

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

      {/* Seguridad de acceso */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mt-4">
        <h2 className="font-heading text-base text-latitud-black mb-3">Seguridad de acceso</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-latitud-black">Requerir verificación por WhatsApp (OTP)</p>
            <p className="text-xs text-latitud-gray mt-0.5">Si está apagado, los usuarios entran solo con su teléfono, sin código de verificación. Guarda para aplicar.</p>
          </div>
          <Switch checked={!!cfg.require_whatsapp_verification} onCheckedChange={v => set('require_whatsapp_verification', v)} />
        </div>
        <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-sm font-medium text-latitud-black">Modo demo: entrar sin pedir teléfono</p>
            <p className="text-xs text-latitud-gray mt-0.5">Actívalo solo para demostraciones. Los usuarios entran directo sin capturar su número y no se registran como prospectos reales.</p>
          </div>
          <Switch checked={!!cfg.demo_mode_skip_access} onCheckedChange={v => set('demo_mode_skip_access', v)} />
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