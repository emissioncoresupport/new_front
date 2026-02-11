import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * MIDDLEWARE: Block any evidence creation that lacks explicit provenance
 * Server-enforces: tenant_id, created_via, created_by_actor_id, request_id must be present
 * Rejects any "silent" creation attempts
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
    const { action } = body;

    // Only intercept evidence creation
    if (action !== 'CREATE_EVIDENCE') {
      return Response.json({ message: 'Passthrough - not evidence creation' }, { status: 200 });
    }

    // ENFORCE: All provenance fields must be present
    const requiredProvenance = ['tenant_id', 'created_via', 'created_by_actor_id', 'request_id'];
    const missing = requiredProvenance.filter(f => !body[f]);

    if (missing.length > 0) {
      // Log rejection
      await base44.asServiceRole.entities.AuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: user.tenant_id,
        evidence_id: 'REJECTED_CREATION',
        actor_user_id: user.id,
        action: 'CREATION_BLOCKED',
        reason_code: 'MISSING_PROVENANCE_FIELDS',
        request_id: requestId,
        context_json: {
          missing_fields: missing,
          attempted_at: new Date().toISOString()
        },
        created_at_utc: new Date().toISOString()
      });

      return Response.json({
        error: 'Creation rejected: Missing provenance fields',
        missing_fields: missing,
        required: requiredProvenance,
        request_id: requestId
      }, { status: 400 });
    }

    // ENFORCE: created_via must be explicit, not auto-generated
    const validCreatedVia = ['UI', 'API', 'TEST_RUNNER', 'MIGRATION', 'CONNECTOR'];
    if (!validCreatedVia.includes(body.created_via)) {
      return Response.json({
        error: 'Invalid created_via',
        valid_values: validCreatedVia,
        request_id: requestId
      }, { status: 400 });
    }

    // ENFORCE: If created_via is SEED, tenant must be DEMO_TENANT
    if (body.created_via === 'SEED' && body.tenant_id !== 'DEMO_TENANT') {
      return Response.json({
        error: 'SEED provenance only allowed in DEMO_TENANT',
        request_id: requestId
      }, { status: 403 });
    }

    // ENFORCE: If created_via is TEST_RUNNER, tenant must be TEST_TENANT
    if (body.created_via === 'TEST_RUNNER' && body.tenant_id !== 'TEST_TENANT') {
      return Response.json({
        error: 'TEST_RUNNER provenance only allowed in TEST_TENANT',
        request_id: requestId
      }, { status: 403 });
    }

    return Response.json({
      success: true,
      message: 'Provenance validation passed',
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[BLOCK_AUTO_SEEDING]', error);
    return Response.json({
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});