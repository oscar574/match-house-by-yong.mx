import { base44 } from '@/api/base44Client';

// Validates the persisted client session against the database.
// Returns:
//  - 'none'      : no session saved locally
//  - 'invalid'   : client record no longer exists (deleted by admin); local session cleared
//  - 'transient'  : network/server error; local session KEPT (do not force login)
//  - { status:'valid', client } : session is valid; route to the experience
export async function validateClientSession() {
  const clientId = localStorage.getItem('latitud_client_id');
  const token = localStorage.getItem('latitud_session_token');
  if (!clientId || !token) return 'none';
  try {
    const c = await base44.entities.Client.get(clientId);
    if (!c) { clearClientSession(); return 'invalid'; }
    return { status: 'valid', client: c };
  } catch (e) {
    if (e?.response?.status === 404) { clearClientSession(); return 'invalid'; }
    return 'transient';
  }
}

export function clearClientSession() {
  localStorage.removeItem('latitud_client_id');
  localStorage.removeItem('latitud_session_token');
  localStorage.removeItem('latitud_client_name');
  localStorage.removeItem('latitud_pending_phone');
}

export function needsOnboarding(c) {
  const has = (v) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
  return !has(c.name) || !has(c.operation_preference) || !has(c.favorite_zones) || !(c.budget_max_estimated > 0);
}