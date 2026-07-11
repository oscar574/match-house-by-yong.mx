import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normalizePhone(input) {
  if (input == null) return '';
  let d = String(input).replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 13 && d.startsWith('521')) d = '52' + d.slice(3);
  if (d.length === 11 && d.startsWith('1')) d = '52' + d.slice(1);
  if (d.length === 12 && d.startsWith('52')) return d;
  if (d.length === 10) return '52' + d;
  return d;
}

// Most-complete record wins (keeps advisor data, favorites, verification).
function completeness(c) {
  let s = 0;
  if (c.name) s += 2;
  if (c.email) s += 1;
  if (c.operation_preference) s += 1;
  if (c.favorite_zones?.length) s += 2;
  if (c.budget_max_estimated > 0) s += 2;
  if (c.onboarding_completed) s += 1;
  if (c.phone_verified) s += 2;
  s += (c.liked_count || 0) + (c.visit_requests_count || 0);
  return s;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Paginate all clients.
    const seen = new Set();
    const all = [];
    let batch = await base44.asServiceRole.entities.Client.list('-created_date', 500);
    while (batch.length > 0) {
      for (const c of batch) seen.add(c.id);
      all.push(...batch);
      if (batch.length < 500) break;
      batch = await base44.asServiceRole.entities.Client.filter({ id: { $nin: Array.from(seen) } }, '-created_date', 500);
    }

    // 1) Normalize whatsapp to E.164.
    const normUpdates = [];
    for (const c of all) {
      const norm = normalizePhone(c.whatsapp);
      if (norm && norm !== c.whatsapp) normUpdates.push({ id: c.id, whatsapp: norm });
    }
    if (normUpdates.length) await base44.asServiceRole.entities.Client.bulkUpdate(normUpdates);
    for (const u of normUpdates) { const c = all.find(x => x.id === u.id); if (c) c.whatsapp = u.whatsapp; }

    // 2) Dedup by normalized phone: keep most complete, mark duplicate_of on the rest (no deletion).
    const byPhone = {};
    for (const c of all) {
      const norm = normalizePhone(c.whatsapp);
      if (!norm) continue;
      (byPhone[norm] ||= []).push(c);
    }
    const dupUpdates = [];
    for (const [phone, group] of Object.entries(byPhone)) {
      if (group.length < 2) continue;
      group.sort((a, b) => completeness(b) - completeness(a));
      const masterId = group[0].id;
      for (let i = 1; i < group.length; i++) {
        if (group[i].duplicate_of !== masterId) dupUpdates.push({ id: group[i].id, duplicate_of: masterId });
      }
    }
    if (dupUpdates.length) await base44.asServiceRole.entities.Client.bulkUpdate(dupUpdates);

    return Response.json({ ok: true, total: all.length, normalized: normUpdates.length, duplicatesMarked: dupUpdates.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});