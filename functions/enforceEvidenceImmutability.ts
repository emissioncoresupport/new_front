import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * IMMUTABILITY ENFORCEMENT — Block mutations on SEALED evidence
 * Called as middleware/guard for PUT/PATCH/DELETE operations
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evidence_id, operation } = await req.json();
    
    if (!evidence_id || !operation) {
      return Response.json({ error: 'evidence_id and operation required' }, { status: 400 });
    }

    if (!['UPDATE', 'DELETE'].includes(operation)) {
      return Response.json({ error: 'operation must be UPDATE or DELETE' }, { status: 400 });
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

    // Block if SEALED
    if (evidence.evidence_status === 'SEALED') {
      // Log audit event for attempted mutation
      await base44.asServiceRole.entities.AuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: tenantId,
        evidence_id: evidence_id,
        actor_user_id: user.id,
        actor_email: user.email,
        action: 'MUTATION_ATTEMPTED',
        reason_code: `${operation}_ON_SEALED`,
        before_status: 'SEALED',
        after_status: null,
        request_id: requestId,
        context_json: {
          operation: operation,
          blocked: true
        },
        created_at_utc: new Date().toISOString()
      });

      return Response.json({
        error: 'Conflict: SEALED evidence is immutable',
        error_code: 'IMMUTABILITY_VIOLATION',
        evidence_status: 'SEALED',
        request_id: requestId
      }, { status: 409 });
    }

    // Not sealed, allow operation
    return Response.json({
      success: true,
      allowed: true,
      evidence_status: evidence.evidence_status,
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[ENFORCE_IMMUTABILITY]', error);
    return Response.json({
      success: false,
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});