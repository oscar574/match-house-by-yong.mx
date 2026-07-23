import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { clientId } = body;
    if (!clientId) return Response.json({ error: 'clientId es requerido' }, { status: 400 });

    const svc = base44.asServiceRole;
    const counts = {};
    // Count then delete each associated entity type.
    for (const e of ['Reaction', 'TourRequest', 'VisitRequest', 'Task']) {
      const recs = await svc.entities[e].filter({ client_id: clientId }, '-created_date', 1000);
      if (recs.length > 0) await svc.entities[e].deleteMany({ client_id: clientId });
      counts[e] = recs.length;
    }

    await svc.entities.Client.delete(clientId);

    return Response.json({ ok: true, clientId, counts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});