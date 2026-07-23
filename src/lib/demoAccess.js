import { base44 } from '@/api/base44Client';

// Reads the current BrandSettings record and returns whether demo mode
// (skip the /access phone-capture screen) is enabled. Falls back to false
// on any error so the normal access flow is never bypassed by accident.
export async function isDemoSkipAccess() {
  try {
    const records = await base44.entities.BrandSettings.list('-created_date', 1);
    return records[0]?.demo_mode_skip_access === true;
  } catch (e) {
    return false;
  }
}

// Direct demo entry — creates a transient "Invitado Demo" client tagged with
// lead_source "Demo Inmobiliaria" so it never gets confused with a real lead.
// Uses a unique internal whatsapp identifier (demo-<timestamp>) since the
// field is required. If a client_id already exists locally, reuses it.
export async function ensureDemoClient() {
  const existing = localStorage.getItem('latitud_client_id');
  if (existing) return existing;

  const demoClient = await base44.entities.Client.create({
    name: 'Invitado Demo',
    whatsapp: `demo-${Date.now()}`,
    lead_source: 'Demo Inmobiliaria',
    operation_preference: 'Explorar',
    city: 'Mérida'
  });

  localStorage.setItem('latitud_client_id', demoClient.id);
  localStorage.setItem('latitud_client_name', demoClient.name || 'Invitado Demo');
  return demoClient.id;
}