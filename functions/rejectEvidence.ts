import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * REJECT EVIDENCE — Transition INGESTED → REJECTED
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evidence_id, reason_code, details } = await req.json();

    if (!evidence_id || !reason_code) {
      return Response.json({ error: 'evidence_id and reason_code required' }, { status: 400 });
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
        error: `Cannot reject evidence in state: ${evidence.evidence_status}`,
        error_code: 'INVALID_STATE'
      }, { status: 409 });
    }

    const rejectedAt = new Date().toISOString();

    // Update to REJECTED
    await base44.asServiceRole.entities.Evidence.update(evidence.id, {
      evidence_status: 'REJECTED',
      rejection_reason: reason_code,
      rejection_details: details || {}
    });

    // Create audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: tenantId,
      evidence_id: evidence_id,
      actor_user_id: user.id,
      actor_email: user.email,
      action: 'REJECTED',
      reason_code: reason_code,
      before_status: 'INGESTED',
      after_status: 'REJECTED',
      request_id: requestId,
      context_json: {
        rejection_reason: reason_code,
        details: details || {}
      },
      created_at_utc: rejectedAt
    });

    return Response.json({
      success: true,
      evidence_id: evidence_id,
      evidence_status: 'REJECTED',
      reason_code: reason_code,
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[REJECT_EVIDENCE]', error);
    return Response.json({
      success: false,
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});