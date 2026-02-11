import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SEAL EVIDENCE — Immutable Transition to SEALED
 * Once sealed, record cannot be updated/deleted. Only supersede or quarantine.
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error_code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  const requestId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ ok: false, error_code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const tenantId = req.headers.get('x-tenant-id') || user.tenant_id || 'DEFAULT';
    const { evidence_id } = await req.json();

    if (!evidence_id) {
      return Response.json({ ok: false, error_code: 'MISSING_FIELD', message: 'evidence_id required' }, { status: 400 });
    }

    // Fetch evidence (tenant-scoped)
    const records = await base44.asServiceRole.entities.Evidence.filter({
      evidence_id,
      tenant_id: tenantId
    });

    if (!records || records.length === 0) {
      return Response.json({ ok: false, error_code: 'NOT_FOUND', message: '404' }, { status: 404 });
    }

    const evidence = records[0];

    // Only INGESTED can be sealed
    if (evidence.ledger_state !== 'INGESTED') {
      return Response.json({
        ok: false,
        error_code: 'INVALID_STATE',
        message: `Cannot seal evidence in state: ${evidence.ledger_state}`
      }, { status: 409 });
    }

    // Transition to SEALED (immutable now)
    await base44.asServiceRole.entities.Evidence.update(evidence.id, {
      ledger_state: 'SEALED',
      sealed_at_utc: now
    });

    // Audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: tenantId,
      evidence_id: evidence_id,
      actor_user_id: user.id,
      action: 'SEALED',
      details: 'Evidence sealed and made immutable',
      created_at_utc: now
    });

    return Response.json({
      ok: true,
      evidence_id,
      request_id: requestId,
      ledger_state: 'SEALED',
      sealed_at_utc: now
    }, { status: 200 });

  } catch (error) {
    console.error('[SEAL_IMMUTABLE]', error);
    return Response.json({ ok: false, error_code: 'INTERNAL_ERROR' }, { status: 500 });
  }
});