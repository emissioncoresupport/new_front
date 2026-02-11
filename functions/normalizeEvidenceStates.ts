import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * NORMALIZE EVIDENCE STATES — Convert forbidden states to INGESTED
 * Admin-only function to fix any records in RAW, CLASSIFIED, STRUCTURED, NULL
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const tenantId = user.tenant_id || user.id;
    const forbiddenStates = ['RAW', 'CLASSIFIED', 'STRUCTURED', null, undefined];

    // Get all evidence with forbidden states
    const allEvidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId
    });

    const forbiddenEvidence = allEvidence.filter(e => forbiddenStates.includes(e.evidence_status));
    let normalizedCount = 0;

    for (const evidence of forbiddenEvidence) {
      // Convert to INGESTED
      await base44.asServiceRole.entities.Evidence.update(evidence.id, {
        evidence_status: 'INGESTED'
      });

      // Log normalization audit event
      await base44.asServiceRole.entities.AuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: tenantId,
        evidence_id: evidence.evidence_id,
        actor_user_id: user.id,
        actor_email: user.email,
        action: 'NORMALIZED',
        reason_code: 'FORBIDDEN_STATE_CONVERSION',
        before_status: evidence.evidence_status,
        after_status: 'INGESTED',
        request_id: requestId,
        context_json: {
          previous_state: evidence.evidence_status,
          reason: 'Normalization job'
        },
        created_at_utc: new Date().toISOString()
      });

      normalizedCount++;
    }

    return Response.json({
      success: true,
      forbidden_states_found: forbiddenEvidence.length,
      normalized_count: normalizedCount,
      message: `Converted ${normalizedCount} records from forbidden states to INGESTED`,
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[NORMALIZE_EVIDENCE_STATES]', error);
    return Response.json({
      success: false,
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});