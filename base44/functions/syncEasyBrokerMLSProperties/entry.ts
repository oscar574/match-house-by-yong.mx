import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function mapType(t) {
  const s = (t || '').toLowerCase();
  if (s === 'house') return 'Casa';
  if (s === 'apartment') return 'Departamento';
  if (s === 'penthouse') return 'Penthouse';
  if (s === 'villa') return 'Villa';
  if (s === 'land' || s === 'terrain' || s === 'lot') return 'Terreno';
  if (s === 'commercial' || s === 'office' || s === 'local') return 'Local Comercial';
  return 'Departamento';
}

function saleOp(operations) {
  return (operations || []).find(o => o.type === 'sale') || null;
}

function opType(operations) {
  if (saleOp(operations)) return 'Venta';
  if ((operations || []).find(o => o.type === 'rental')) return 'Renta';
  return 'Venta';
}

function currencyOf(sale, fallback) {
  const c = (sale && sale.currency) || fallback || 'MXN';
  return ['MXN', 'USD'].includes(c) ? c : 'MXN';
}

function splitLocation(name) {
  const parts = (name || '').split(',').map(x => x.trim()).filter(Boolean);
  const neighborhood = parts[0] || 'Sin zona';
  const city = parts.length > 1 ? parts[parts.length - 1] : (parts[0] || 'Sin ciudad');
  const state = parts.length > 2 ? parts[parts.length - 2] : '';
  return { neighborhood, city, state };
}

function evaluateVisibility(p) {
  if (p.property_type !== 'Casa') return { visible: false, reason: 'not_house' };
  if (p.operation_type !== 'Venta') return { visible: false, reason: 'not_sale' };
  if (p.status !== 'Disponible') return { visible: false, reason: 'inactive' };
  if (!p.price) return { visible: false, reason: 'missing_price' };
  if (!p.construction_m2) return { visible: false, reason: 'missing_construction_m2' };
  if (!p.cover_photo_url || !p.photo_urls || p.photo_urls.length === 0) return { visible: false, reason: 'missing_photos' };
  if (!p.collaboration_enabled || !p.shared_commission_enabled) return { visible: false, reason: 'no_shared_commission' };
  if (p.commission_status !== 'confirmed' && p.commission_status !== 'manually_confirmed') {
    return { visible: false, reason: p.commission_status === 'unknown' ? 'commission_unknown' : 'no_shared_commission' };
  }
  return { visible: true, reason: null };
}

function mapDetail(d, item) {
  const sale = saleOp(d.operations || item.operations || []);
  const loc = splitLocation((d.location && d.location.name) || item.location);
  const images = (d.images || []).map(i => i.url).filter(Boolean);
  const cover = (d.title_image_full) || item.title_image_full || images[0] || null;
  const now = new Date().toISOString();
  return {
    easybroker_public_id: d.public_id || item.public_id,
    easybroker_internal_id: d.internal_id || null,
    internal_code: d.internal_id || null,
    title: d.title || item.title || d.public_id || item.public_id,
    description: d.description || '',
    property_type: mapType(d.property_type || item.property_type),
    operation_type: opType(d.operations || item.operations),
    status: 'Disponible',
    price: sale ? sale.amount : 0,
    currency: currencyOf(sale, (item.operations || [])[0] && (item.operations || [])[0].currency),
    cover_photo_url: cover,
    photos: images,
    photo_urls: images,
    video_url: (d.videos || [])[0] || null,
    virtual_tour_url: d.virtual_tour || null,
    brochure_url: (d.property_files || [])[0] || null,
    bedrooms: d.bedrooms || 0,
    bathrooms: d.bathrooms || 0,
    half_bathrooms: d.half_bathrooms || 0,
    parking_spaces: d.parking_spaces || 0,
    construction_m2: d.construction_size || 0,
    land_m2: d.lot_size || 0,
    year_built: typeof d.age === 'number' ? d.age : null,
    private_address: (d.location && d.location.street) || '',
    location_text: (d.location && d.location.name) || item.location || '',
    neighborhood: loc.neighborhood,
    city: loc.city,
    state: loc.state,
    zone: loc.neighborhood,
    latitude: (d.location && d.location.latitude) || null,
    longitude: (d.location && d.location.longitude) || null,
    amenities: (d.features || []).map(f => f.name),
    broker_origin: (d.agent && (d.agent.full_name || d.agent.name)) || null,
    agency_origin: (d.agency && d.agency.name) || null,
    collaboration_enabled: true,
    shared_commission: true,
    shared_commission_enabled: true,
    commission_status: 'confirmed',
    commission_percentage: d.shared_commission_percentage || null,
    commission_currency: currencyOf(sale, null),
    commission_notes: d.collaboration_notes || '',
    commission_source: 'easybroker_mls',
    commission_verified_at: now,
    mls_collaborator_id: (d.agency && d.agency.id != null) ? String(d.agency.id) : null,
    mls_collaborator_name: (d.agency && d.agency.name) || null,
    easybroker_updated_at: d.updated_at || item.updated_at,
    last_synced_at: now,
    sync_source: 'easybroker_mls',
    sync_status: 'synced',
    raw_easybroker_payload: d,
    is_duplicate: false,
    manual_review_required: false
  };
}

function mapMinimal(item, reason) {
  const sale = saleOp(item.operations || []);
  const loc = splitLocation(item.location);
  const now = new Date().toISOString();
  return {
    easybroker_public_id: item.public_id,
    easybroker_internal_id: null,
    title: item.title || item.public_id,
    description: '',
    property_type: mapType(item.property_type),
    operation_type: opType(item.operations),
    status: 'Disponible',
    price: sale ? sale.amount : 0,
    currency: currencyOf(sale, null),
    cover_photo_url: item.title_image_full || null,
    photos: [],
    photo_urls: [],
    bedrooms: item.bedrooms || 0,
    bathrooms: item.bathrooms || 0,
    parking_spaces: item.parking_spaces || 0,
    construction_m2: 0,
    land_m2: 0,
    neighborhood: loc.neighborhood,
    city: loc.city,
    state: loc.state,
    zone: loc.neighborhood,
    location_text: item.location || '',
    collaboration_enabled: true,
    shared_commission: true,
    shared_commission_enabled: true,
    commission_status: 'confirmed',
    commission_source: 'easybroker_mls',
    commission_verified_at: now,
    easybroker_updated_at: item.updated_at,
    last_synced_at: now,
    sync_source: 'easybroker_mls',
    sync_status: 'synced',
    raw_easybroker_payload: item,
    is_duplicate: false,
    is_visible_to_buyer: false,
    is_visible_in_app: false,
    visible_to_clients: false,
    hidden_reason: reason,
    manual_review_required: false
  };
}

async function upsertProperty(base44, mapped) {
  const existing = await base44.asServiceRole.entities.Property.filter({ easybroker_public_id: mapped.easybroker_public_id });
  if (existing && existing.length > 0) {
    const id = existing[0].id;
    await base44.asServiceRole.entities.Property.update(id, mapped);
    return { id, created: false };
  }
  const created = await base44.asServiceRole.entities.Property.create(mapped);
  return { id: created.id, created: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let payload = {};
    try { payload = await req.json(); } catch (e) { /* no body ok */ }
    const preview = payload.preview === true;

    const apiKey = Deno.env.get('EASYBROKER_API_KEY');
    const startedAt = new Date().toISOString();
    const triggeredBy = user.email || user.full_name || 'admin';

    if (!apiKey) {
      return Response.json({ status: 'api_key_missing', message: 'EASYBROKER_API_KEY not set in backend.' });
    }

    const headers = { 'X-Authorization': apiKey, 'accept': 'application/json' };
    const base = 'https://api.easybroker.com/v1/mls_properties';

    let log = null;
    if (!preview) {
      log = await base44.asServiceRole.entities.SyncLog.create({
        started_at: startedAt,
        mode: 'mls',
        status: 'syncing',
        triggered_by: triggeredBy
      });
    }

    let page = 1;
    let next = null;
    let pagesProcessed = 0;
    let imported = 0, updated = 0, hidden = 0, visible = 0;
    let noCom = 0, photos = 0, constr = 0, dup = 0, errors = 0;
    const processed = [];
    const MAX_PAGES = 20;

    do {
      let res;
      try {
        res = await fetch(base + '?page=' + page + '&limit=50', { headers });
      } catch (e) {
        errors++;
        break;
      }
      if (res.status === 401) {
        if (log) await base44.asServiceRole.entities.SyncLog.update(log.id, { status: 'sync_error', error_message: 'api_key_invalid', finished_at: new Date().toISOString() });
        return Response.json({ status: 'api_key_invalid', message: 'API key invalid.' });
      }
      if (res.status === 403) {
        if (log) await base44.asServiceRole.entities.SyncLog.update(log.id, { status: 'sync_error', error_message: 'mls_unavailable', finished_at: new Date().toISOString() });
        return Response.json({ status: 'mls_unavailable', message: 'MLS API access is required to sync shared commission listings from collaborators.' });
      }
      if (!res.ok) {
        errors++;
        break;
      }
      let data;
      try { data = await res.json(); } catch (e) { errors++; break; }
      pagesProcessed++;
      const content = data.content || [];

      for (const item of content) {
        try {
          const isHouse = (item.property_type || '').toLowerCase() === 'house';
          const sale = saleOp(item.operations || []);

          if (!isHouse) {
            const m = mapMinimal(item, 'not_house');
            if (!preview) await upsertProperty(base44, m);
            hidden++;
            continue;
          }
          if (!sale) {
            const m = mapMinimal(item, 'not_sale');
            if (!preview) await upsertProperty(base44, m);
            hidden++;
            continue;
          }
          if (!sale.amount) {
            const m = mapMinimal(item, 'missing_price');
            if (!preview) await upsertProperty(base44, m);
            hidden++;
            continue;
          }

          let d = null;
          try {
            const dr = await fetch(base + '/' + item.public_id, { headers });
            if (dr.ok) d = await dr.json(); else errors++;
          } catch (e) { errors++; }
          if (!d) continue;

          const mapped = mapDetail(d, item);
          const vis = evaluateVisibility(mapped);
          mapped.is_visible_to_buyer = vis.visible;
          mapped.is_visible_in_app = vis.visible;
          mapped.visible_to_clients = vis.visible;
          mapped.hidden_reason = vis.reason || null;

          let result = { id: null, created: false };
          if (!preview) {
            result = await upsertProperty(base44, mapped);
            if (result.created) imported++; else updated++;
            processed.push({
              id: result.id,
              price: mapped.price,
              construction_m2: mapped.construction_m2,
              zone: mapped.zone,
              bedrooms: mapped.bedrooms,
              bathrooms: mapped.bathrooms
            });
          }

          if (vis.visible) visible++;
          else {
            hidden++;
            if (vis.reason === 'no_shared_commission' || vis.reason === 'commission_unknown') noCom++;
            else if (vis.reason === 'missing_photos') photos++;
            else if (vis.reason === 'missing_construction_m2') constr++;
          }
        } catch (e) { errors++; }
      }

      next = (data.pagination && data.pagination.next_page) || null;
      page++;
      if (pagesProcessed >= MAX_PAGES) break;
    } while (next);

    if (!preview && processed.length > 0) {
      const groups = {};
      for (const p of processed) {
        const key = [p.price, p.construction_m2, p.zone, p.bedrooms, p.bathrooms].join('|');
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      }
      const groupId = 'eb-' + Date.now();
      const dupUpdates = [];
      for (const key in groups) {
        const g = groups[key];
        if (g.length > 1) {
          for (let i = 1; i < g.length; i++) {
            dupUpdates.push({
              id: g[i].id,
              is_duplicate: true,
              duplicate_group_id: groupId,
              duplicate_master_property_id: g[0].id,
              is_visible_to_buyer: false,
              is_visible_in_app: false,
              visible_to_clients: false,
              hidden_reason: 'duplicate_hidden'
            });
            dup++;
          }
        }
      }
      if (dupUpdates.length > 0) {
        try { await base44.asServiceRole.entities.Property.bulkUpdate(dupUpdates); } catch (e) { errors++; }
      }
    }

    const finishedAt = new Date().toISOString();
    const duration = Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000);
    const finalStatus = errors > 0 && visible === 0 && imported === 0 && updated === 0 ? 'sync_error' : (errors > 0 ? 'partial' : 'synced');

    const summary = {
      status: finalStatus,
      pages_processed: pagesProcessed,
      imported_count: imported,
      updated_count: updated,
      hidden_count: hidden,
      visible_count: visible,
      no_commission_count: noCom,
      missing_photos_count: photos,
      missing_construction_count: constr,
      duplicate_count: dup,
      error_count: errors,
      duration_seconds: duration
    };

    if (log) {
      await base44.asServiceRole.entities.SyncLog.update(log.id, {
        finished_at: finishedAt,
        status: finalStatus,
        pages_processed: pagesProcessed,
        imported_count: imported,
        updated_count: updated,
        hidden_count: hidden,
        visible_count: visible,
        no_commission_count: noCom,
        missing_photos_count: photos,
        missing_construction_count: constr,
        duplicate_count: dup,
        error_count: errors,
        duration_seconds: duration
      });
    }

    return Response.json({ status: 'ok', preview: preview, summary: summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});