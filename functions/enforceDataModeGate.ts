import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * DATA MODE GATE — Block synthetic data in LIVE
 * 
 * LIVE: reject provenance=TEST_FIXTURE
 * DEMO/TEST: allow all
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { provenance } = body;

    // Get tenant data mode
    const tenantSettings = await base44.asServiceRole.entities.Company.filter({
      tenant_id: user.tenant_id
    });
    const dataMode = tenantSettings?.[0]?.data_mode || 'LIVE';

    // LIVE mode: block TEST_FIXTURE
    if (dataMode === 'LIVE' && provenance === 'TEST_FIXTURE') {
      return Response.json({
        error: 'Data mode violation',
        message: 'TEST_FIXTURE provenance not allowed in LIVE',
        data_mode: dataMode,
        request_id: requestId
      }, { status: 403 });
    }

    return Response.json({
      success: true,
      data_mode: dataMode,
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[DATA_MODE_GATE]', error);
    return Response.json({
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});