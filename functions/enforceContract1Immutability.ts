import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * IMMUTABILITY GUARD — Contract 1
 * 
 * Blocks ANY update to SEALED evidence.
 * Returns 409 SEALED_IMMUTABLE.
 * 
 * Call this before any Evidence update operation.
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error_code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ ok: false, error_code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await req.json();
    const { evidence_id, tenant_id } = body;

    if (!evidence_id || !tenant_id) {
      return Response.json({
        ok: false,
        error_code: 'MISSING_FIELD',
        message: 'evidence_id and tenant_id required'
      }, { status: 400 });
    }

    // Check if evidence is SEALED
    const evidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id,
      evidence_id
    });

    if (evidence.length === 0) {
      return Response.json({
        ok: false,
        error_code: 'NOT_FOUND',
        message: 'Evidence not found'
      }, { status: 404 });
    }

    const rec = evidence[0];

    if (rec.ledger_state === 'SEALED') {
      // Log violation attempt
      await base44.asServiceRole.entities.AuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id,
        evidence_id: rec.evidence_id,
        actor_user_id: user.id,
        actor_email: user.email,
        actor_role: user.role,
        action: 'MUTATION_ATTEMPTED',
        request_id: requestId,
        created_at_utc: new Date().toISOString(),
        http_status: 409,
        context_json: {
          reason: 'SEALED evidence is immutable',
          sealed_at: rec.sealed_at_utc
        }
      });

      return Response.json({
        ok: false,
        error_code: 'SEALED_IMMUTABLE',
        message: 'Cannot modify SEALED evidence. Evidence is immutable after sealing.',
        evidence_id: rec.evidence_id,
        sealed_at_utc: rec.sealed_at_utc,
        request_id: requestId
      }, { status: 409 });
    }

    return Response.json({
      ok: true,
      allowed: true,
      current_state: rec.ledger_state
    }, { status: 200 });

  } catch (error) {
    console.error('[IMMUTABILITY_GUARD]', error);
    return Response.json({
      ok: false,
      error_code: 'INTERNAL_ERROR',
      message: error.message
    }, { status: 500 });
  }
});