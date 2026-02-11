import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * GET EVIDENCE AUDIT TRAIL — Retrieve immutable audit events for evidence
 * 
 * Returns append-only audit events with full context
 * Multi-tenant safe
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evidence_id } = await req.json();
    if (!evidence_id) {
      return Response.json({ error: 'evidence_id required' }, { status: 400 });
    }

    const tenantId = user.tenant_id || user.id;

    // Verify evidence exists in tenant
    const evidenceList = await base44.asServiceRole.entities.Evidence.filter({
      evidence_id: evidence_id,
      tenant_id: tenantId
    });

    if (evidenceList.length === 0) {
      return Response.json({ error: 'Evidence not found' }, { status: 404 });
    }

    // Fetch audit trail for evidence
    const auditTrail = await base44.asServiceRole.entities.EvidenceAuditEvent.filter({
      evidence_id: evidence_id,
      tenant_id: tenantId
    });

    return Response.json({
      success: true,
      evidence_id: evidence_id,
      audit_trail: auditTrail.map(e => ({
        audit_event_id: e.audit_event_id,
        action: e.action,
        timestamp_utc: e.timestamp_utc,
        actor_email: e.actor_email,
        actor_role: e.actor_role,
        previous_state: e.previous_state,
        new_state: e.new_state,
        context_json: e.context_json,
        is_backfilled: e.is_backfilled,
        request_id: e.request_id
      })),
      total_events: auditTrail.length,
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[CONTRACT_1] Audit trail fetch failed:', error);
    return Response.json({
      success: false,
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});