import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * DATA MODE CONTROL — Block synthetic/test data in LIVE tenants
 * 
 * Rules:
 * - LIVE: reject provenance=TEST_FIXTURE, created_via=SEED, created_via=TEST_RUNNER
 * - DEMO: allow all
 * - TEST: allow all (but must be TEST_TENANT)
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Get tenant data mode
    const tenantSettings = await base44.asServiceRole.entities.Company.filter({
      tenant_id: user.tenant_id
    });

    const dataMode = tenantSettings?.[0]?.data_mode || 'LIVE';

    // GATE: If LIVE, block test/demo data
    if (dataMode === 'LIVE') {
      const blockedProvenance = ['TEST_FIXTURE'];
      const blockedCreatedVia = ['SEED', 'TEST_RUNNER'];

      if (blockedProvenance.includes(body.provenance)) {
        return Response.json({
          error: 'Data mode violation',
          message: `Provenance '${body.provenance}' not allowed in LIVE`,
          data_mode: dataMode,
          request_id: requestId
        }, { status: 403 });
      }

      if (blockedCreatedVia.includes(body.created_via)) {
        return Response.json({
          error: 'Data mode violation',
          message: `Created_via '${body.created_via}' not allowed in LIVE`,
          data_mode: dataMode,
          request_id: requestId
        }, { status: 403 });
      }
    }

    return Response.json({
      success: true,
      data_mode: dataMode,
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[DATA_MODE_CONTROL]', error);
    return Response.json({
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});