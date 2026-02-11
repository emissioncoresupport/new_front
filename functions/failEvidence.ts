import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * FAIL EVIDENCE — Transition to FAILED state (system error)
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evidence_id, failure_code, error_message } = await req.json();

    if (!evidence_id || !failure_code) {
      return Response.json({ error: 'evidence_id and failure_code required' }, { status: 400 });
    }

    const tenantId = user.tenant_id || user.id;

    // Fetch evidence
    const evidenceList = await base44.asServiceRole.entities.Evidence.filter({
      evidence_id: evidence_id,
      tenant_id: tenantId
    });

    if (evidenceList.length === 0) {
      return Response.json({ error: 'Evidence not found' }, { status: 404 });
    }

    const evidence = evidenceList[0];

    if (evidence.evidence_status !== 'INGESTED') {
      return Response.json({
        error: `Cannot fail evidence in state: ${evidence.evidence_status}`,
        error_code: 'INVALID_STATE'
      }, { status: 409 });
    }

    const failedAt = new Date().toISOString();

    // Update to FAILED
    await base44.asServiceRole.entities.Evidence.update(evidence.id, {
      evidence_status: 'FAILED',
      failure_code: failure_code
    });

    // Create audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: tenantId,
      evidence_id: evidence_id,
      actor_user_id: user.id,
      actor_email: user.email,
      action: 'FAILED',
      reason_code: failure_code,
      before_status: 'INGESTED',
      after_status: 'FAILED',
      request_id: requestId,
      context_json: {
        failure_code: failure_code,
        error_message: error_message || null
      },
      created_at_utc: failedAt
    });

    return Response.json({
      success: true,
      evidence_id: evidence_id,
      evidence_status: 'FAILED',
      failure_code: failure_code,
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[FAIL_EVIDENCE]', error);
    return Response.json({
      success: false,
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});