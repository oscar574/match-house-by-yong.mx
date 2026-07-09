import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const apiKey = Deno.env.get('EASYBROKER_API_KEY');
    const testedAt = new Date().toISOString();

    if (!apiKey) {
      return Response.json({
        mls_available: false,
        status: 'api_key_missing',
        message: 'API key missing. Set EASYBROKER_API_KEY in backend environment variables.',
        tested_at: testedAt
      });
    }

    let res;
    try {
      res = await fetch('https://api.easybroker.com/v1/mls_properties?limit=1', {
        headers: { 'X-Authorization': apiKey, 'accept': 'application/json' }
      });
    } catch (e) {
      return Response.json({
        mls_available: false,
        status: 'network_error',
        message: 'Network error reaching EasyBroker MLS endpoint.',
        tested_at: testedAt
      });
    }

    if (res.status === 200) {
      return Response.json({
        mls_available: true,
        status: 'mls_available',
        message: 'MLS API access confirmed. Shared commission listings can be synced.',
        tested_at: testedAt
      });
    }
    if (res.status === 401) {
      return Response.json({
        mls_available: false,
        status: 'api_key_invalid',
        message: 'API key invalid or expired.',
        tested_at: testedAt
      });
    }
    if (res.status === 403) {
      return Response.json({
        mls_available: false,
        status: 'mls_unavailable',
        message: 'MLS API access is required to sync shared commission listings from collaborators.',
        tested_at: testedAt
      });
    }
    return Response.json({
      mls_available: false,
      status: 'unexpected_response',
      message: 'Unexpected response from EasyBroker MLS endpoint (HTTP ' + res.status + ').',
      tested_at: testedAt
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});