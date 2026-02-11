import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SEAL EVIDENCE — V3 with MANUAL_ENTRY Attestation Capture
 * Enforces: sealed immutability, attestation capture from auth, 409 on update attempts
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error_code: 'METHOD_NOT_ALLOWED', message: 'POST only' }, { status: 405 });
  }

  const requestId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ ok: false, error_code: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 });
    }

    const tenantId = req.headers.get('x-tenant-id') || user.tenant_id || 'DEFAULT';

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return Response.json({
        ok: false,
        error_code: 'INVALID_JSON',
        message: 'Request body must be valid JSON',
        request_id: requestId
      }, { status: 400 });
    }

    const { evidence_id } = body;

    if (!evidence_id) {
      return Response.json({
        ok: false,
        error_code: 'MISSING_EVIDENCE_ID',
        message: 'evidence_id required',
        request_id: requestId
      }, { status: 422 });
    }

    // Fetch evidence
    const evidenceRecords = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId,
      evidence_id
    });

    if (!evidenceRecords || evidenceRecords.length === 0) {
      return Response.json({
        ok: false,
        error_code: 'EVIDENCE_NOT_FOUND',
        message: `Evidence ${evidence_id} not found`,
        request_id: requestId
      }, { status: 404 });
    }

    const evidence = evidenceRecords[0];

    // IMMUTABILITY GUARD: already sealed
    if (evidence.ledger_state === 'SEALED') {
      return Response.json({
        ok: false,
        error_code: 'SEALED_IMMUTABLE',
        message: 'Evidence already sealed and cannot be modified',
        evidence_id,
        sealed_at_utc: evidence.sealed_at_utc,
        request_id: requestId
      }, { status: 409 });
    }

    // Only allow sealing INGESTED records
    if (evidence.ledger_state !== 'INGESTED') {
      return Response.json({
        ok: false,
        error_code: 'INVALID_STATE_TRANSITION',
        message: `Cannot seal evidence in state: ${evidence.ledger_state}`,
        current_state: evidence.ledger_state,
        request_id: requestId
      }, { status: 422 });
    }

    // Update to SEALED state
    const updateData = {
      ledger_state: 'SEALED',
      sealed_at_utc: now
    };

    // For MANUAL_ENTRY: capture attestation if not already set
    if (evidence.ingestion_method === 'MANUAL_ENTRY') {
      if (!evidence.attestor_user_id) {
        updateData.attestor_user_id = user.id;
        updateData.attested_by_email = user.email;
        updateData.attestation_method = 'MANUAL_ENTRY';
        updateData.attested_at_utc = now;
      }
    }

    await base44.asServiceRole.entities.Evidence.update(evidence.id, updateData);

    // Create SEALED audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: tenantId,
      evidence_id,
      actor_user_id: user.id,
      actor_email: user.email,
      action: 'SEALED',
      previous_state: 'INGESTED',
      new_state: 'SEALED',
      details: `Evidence sealed: ${evidence.ingestion_method} from ${evidence.source_system}`,
      created_at_utc: now,
      request_id: body.request_id || requestId
    });

    return Response.json({
      ok: true,
      evidence_id,
      ledger_state: 'SEALED',
      sealed_at_utc: now,
      request_id: requestId,
      attestation_captured: evidence.ingestion_method === 'MANUAL_ENTRY'
    }, { status: 200 });

  } catch (error) {
    console.error('[SEAL_EVIDENCE_V3]', error);
    return Response.json({
      ok: false,
      error_code: 'INTERNAL_ERROR',
      message: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});