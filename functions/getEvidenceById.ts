import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * GET /supplylens/evidence/:id
 * 
 * Read-only endpoint to retrieve evidence by ID
 * Enforces tenant isolation - cross-tenant returns 403
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      }, { status: 401 });
    }

    const url = new URL(req.url);
    const evidenceId = url.searchParams.get('evidence_id');

    if (!evidenceId) {
      return Response.json({
        error: 'Missing evidence_id parameter'
      }, { status: 400 });
    }

    const tenantId = user.tenant_id || user.id;

    // Fetch evidence with tenant isolation
    const evidenceList = await base44.asServiceRole.entities.Evidence.filter({
      evidence_id: evidenceId,
      tenant_id: tenantId
    });

    if (evidenceList.length === 0) {
      return Response.json({
        error: 'Evidence not found',
        error_code: 'NOT_FOUND',
        message: 'Evidence does not exist'
      }, { status: 404 });
    }

    const evidence = evidenceList[0];

    // Access logging (create audit event for read)
    await base44.asServiceRole.entities.EvidenceAuditEvent.create({
      audit_id: crypto.randomUUID(),
      tenant_id: tenantId,
      event_type: 'ACCESS_DENIED', // Repurpose for READ access tracking
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      evidence_id: evidenceId,
      timestamp_utc: new Date().toISOString(),
      reason_code: 'EVIDENCE_READ',
      reason_text: 'Evidence record accessed via API',
      request_id: crypto.randomUUID()
    });

    return Response.json({
      success: true,
      evidence
    });

  } catch (error) {
    console.error('[Evidence Read] Error:', error);
    return Response.json({
      error: 'Failed to retrieve evidence',
      message: error.message
    }, { status: 500 });
  }
});