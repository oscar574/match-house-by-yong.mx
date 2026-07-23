import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { masterId, duplicateIds } = body;
    if (!masterId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      return Response.json({ error: 'masterId y duplicateIds son requeridos' }, { status: 400 });
    }
    if (duplicateIds.includes(masterId)) {
      return Response.json({ error: 'masterId no puede estar en duplicateIds' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    const has = (v) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0);

    // 1. Reassign child records from duplicates to the master.
    // updateMany caps at 500 per call and returns has_more; loop until all moved.
    // The $set changes client_id (not in the query), so each pass shrinks the
    // matching set and the loop terminates naturally.
    const reassignAll = async (entity) => {
      let hasMore = true;
      while (hasMore) {
        const res = await svc.entities[entity].updateMany(
          { client_id: { $in: duplicateIds } },
          { $set: { client_id: masterId } }
        );
        hasMore = res?.has_more === true;
      }
    };
    await Promise.all(['Reaction', 'TourRequest', 'VisitRequest', 'Task'].map(reassignAll));

    // 2. Load master + duplicates (after reassignment, so counts are clean).
    const master = await svc.entities.Client.get(masterId);
    const dups = await Promise.all(duplicateIds.map((id) => svc.entities.Client.get(id).catch(() => null)));
    const validDups = dups.filter(Boolean);

    // 3. Fill empty master fields from the most complete duplicate.
    const fillFields = ['name', 'email', 'city', 'budget_min_estimated', 'budget_max_estimated', 'budget_range', 'operation_preference', 'preferred_bedrooms', 'assigned_advisor'];
    const completeness = (c) => fillFields.filter((f) => has(c[f])).length + (c.favorite_zones?.length || 0);
    const richest = [...validDups].sort((a, b) => completeness(b) - completeness(a))[0] || {};
    const fill = {};
    for (const f of fillFields) {
      if (!has(master[f]) && has(richest[f])) fill[f] = richest[f];
    }

    // 4. Unify arrays without repeating values.
    const mergeArr = (field) => {
      const set = new Set();
      if (Array.isArray(master[field])) master[field].forEach((x) => set.add(x));
      validDups.forEach((d) => { if (Array.isArray(d[field])) d[field].forEach((x) => set.add(x)); });
      return Array.from(set);
    };
    const arrFields = ['favorite_zones', 'favorite_property_ids', 'rejected_property_ids', 'curated_property_ids', 'preferred_neighborhoods'];
    const arrUpdates = {};
    for (const f of arrFields) arrUpdates[f] = mergeArr(f);

    // 5. Keep highest scores, most recent activity, phone_verified if any.
    const leadScore = Math.max(master.lead_score || 0, ...validDups.map((d) => d.lead_score || 0));
    const buyerIntent = Math.max(master.buyer_intent_score || 0, ...validDups.map((d) => d.buyer_intent_score || 0));
    const dates = [master.last_activity_date, ...validDups.map((d) => d.last_activity_date)].filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const lastActivity = dates[0] || master.last_activity_date;
    const phoneVerified = master.phone_verified === true || validDups.some((d) => d.phone_verified === true);

    // 6. Mark duplicates (do NOT delete them).
    await Promise.all(validDups.map((d) => svc.entities.Client.update(d.id, { duplicate_of: masterId })));

    // 7. Recalculate the master's counters from the now-reassigned reactions.
    const allReactions = await svc.entities.Reaction.filter({ client_id: masterId });
    const unique = (type) => new Set(allReactions.filter((r) => r.reaction_type === type).map((r) => r.property_id)).size;
    const likedCount = unique('like');
    const dislikedCount = unique('dislike');
    const visitCount = unique('visit_request');

    await svc.entities.Client.update(masterId, {
      ...fill,
      ...arrUpdates,
      lead_score: leadScore,
      buyer_intent_score: buyerIntent,
      last_activity_date: lastActivity,
      phone_verified: phoneVerified,
      liked_count: likedCount,
      disliked_count: dislikedCount,
      visit_requests_count: visitCount
    });

    return Response.json({
      ok: true,
      masterId,
      merged: validDups.length,
      counts: { likedCount, dislikedCount, visitCount }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});