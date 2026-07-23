import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { brandConfig, setActiveBrand } from '@/lib/brandConfig';

// Default brand identity = current MatchHouse values. BrandSettings records
// (saved from Admin > White Label) override these per field.
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
  theme_mode: 'Oscuro',
  background_color: '#050505',
  surface_color: '#F8F5EF',
  text_primary_color: '#FFFDF8',
  text_secondary_color: '#8A7A63'
};

const BrandContext = createContext({ brand: DEFAULTS, refresh: () => {} });

export function BrandProvider({ children }) {
  const [brand, setBrand] = useState(DEFAULTS);

  const apply = useCallback((settings) => {
    const merged = { ...DEFAULTS, ...(settings || {}) };
    setBrand(merged);
    setActiveBrand(merged);
    // Inject theme colors as CSS variables so Tailwind's latitud tokens
    // (mapped to var(--brand-*)) reflect the saved white-label config.
    const root = document.documentElement.style;
    root.setProperty('--brand-bg', merged.background_color || '#050505');
    root.setProperty('--brand-text', merged.text_primary_color || '#FFFDF8');
    root.setProperty('--brand-surface', merged.surface_color || '#F8F5EF');
    root.setProperty('--brand-muted', merged.text_secondary_color || '#8A7A63');
    root.setProperty('--brand-accent', merged.accent_color || '#C9A45C');
    // Apply logo to favicon so the browser/tab reflects the white-label logo.
    if (merged.logo_url) {
      let link = document.querySelector("link[rel='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = merged.logo_url;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const records = await base44.entities.BrandSettings.list('-created_date', 1);
      apply(records[0] || {});
    } catch (e) {
      /* keep current brand on transient failures */
    }
  }, [apply]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <BrandContext.Provider value={{ brand, refresh }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext).brand;
}

export function useBrandRefresh() {
  return useContext(BrandContext).refresh;
}