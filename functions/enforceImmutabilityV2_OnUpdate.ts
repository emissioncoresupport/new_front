import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * IMMUTABILITY GATE (called by automation on update attempt)
 * 
 * If SEALED state, reject update with 409 Conflict
 * Log violation to audit trail
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  const requestId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { evidence_id, attempted_update } = body;

    if (!evidence_id) {
      return Response.json({
        error: 'evidence_id is required',
        request_id: requestId
      }, { status: 400 });
    }

    // FETCH EVIDENCE
    const tenantId = req.headers.get('x-tenant-id') || 'DEFAULT';
    const evidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId,
      evidence_id
    });

    if (evidence.length === 0) {
      return Response.json({
        error: 'Evidence not found',
        request_id: requestId
      }, { status: 404 });
    }

    const rec = evidence[0];

    // IMMUTABILITY CHECK
    if (rec.ledger_state === 'SEALED') {
      const auditEventId = crypto.randomUUID();
      await base44.asServiceRole.entities.AuditEvent.create({
        audit_event_id: auditEventId,
        tenant_id: tenantId,
        evidence_id,
        actor_user_id: user.id,
        actor_email: user.email,
        actor_role: user.role,
        action: 'MUTATION_ATTEMPTED',
        request_id: requestId,
        created_at_utc: now,
        http_status: 409,
        context_json: {
          blocked_reason: 'Evidence is SEALED (immutable)',
          attempted_update: attempted_update || {}
        }
      });

      return Response.json({
        ok: false,
        error_code: 'SEALED_IMMUTABLE',
        message: 'Evidence is SEALED (immutable). Cannot be modified.',
        evidence_id,
        ledger_state: rec.ledger_state,
        request_id: requestId
      }, { status: 409 });
    }

    // NOT SEALED: allow update
    return Response.json({
      allowed: true,
      evidence_id,
      ledger_state: rec.ledger_state,
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[IMMUTABILITY_GATE]', error);
    return Response.json({
      error: 'Gate check failed',
      message: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});