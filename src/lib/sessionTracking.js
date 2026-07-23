import { base44 } from '@/api/base44Client';

// A new session is counted only if more than 30 minutes passed since the last
// visit (or if the client never entered). Shorter gaps just refresh last_seen_at
// so navigating between screens doesn't inflate app_opens_count.
const SESSION_THRESHOLD_MS = 30 * 60 * 1000;

export async function trackAppOpen(clientId) {
  if (!clientId) return;
  let client;
  try {
    client = await base44.entities.Client.get(clientId);
  } catch (e) {
    return;
  }

  const now = new Date();
  const last = client.last_seen_at ? new Date(client.last_seen_at) : null;
  const updates = { last_seen_at: now.toISOString() };

  if (!client.first_seen_at) {
    updates.first_seen_at = now.toISOString();
  }

  const isNewSession = !last || (now.getTime() - last.getTime()) > SESSION_THRESHOLD_MS;

  if (isNewSession) {
    updates.app_opens_count = (client.app_opens_count || 0) + 1;

    const todayKey = now.toISOString().slice(0, 10);
    const lastKey = last ? client.last_seen_at.slice(0, 10) : null;
    if (lastKey !== todayKey) {
      updates.active_days_count = (client.active_days_count || 0) + 1;
    }

    // Keep a rolling history of session timestamps to compute the
    // "last 7 days" intensity indicator in the admin detail view.
    const history = Array.isArray(client.app_open_history) ? [...client.app_open_history] : [];
    history.push(now.toISOString());
    updates.app_open_history = history.slice(-100);
  }

  try {
    await base44.entities.Client.update(clientId, updates);
  } catch (e) {
    /* ignore transient errors */
  }
}