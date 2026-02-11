import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * POST /supplylens/evidence/:id/update (BLOCKED)
 * 
 * IMMUTABILITY ENFORCEMENT - CONTRACT 1 GUARANTEE
 * 
 * This endpoint demonstrates logical immutability:
 * - Blocks ALL update attempts on SEALED evidence
 * - Blocks ALL delete attempts (always)
 * - Logs violation attempts to audit trail
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  
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
    const operation = url.searchParams.get('operation'); // 'update' or 'delete'

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
        error: 'Evidence not found or access denied'
      }, { status: 403 });
    }

    const evidence = evidenceList[0];

    // IMMUTABILITY BLOCK #1: Never allow deletes
    if (operation === 'delete') {
      await base44.asServiceRole.entities.EvidenceAuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: tenantId,
        event_type: 'ACCESS_DENIED',
        actor_user_id: user.id,
        actor_role: user.role,
        evidence_id: evidenceId,
        timestamp_utc: new Date().toISOString(),
        previous_state: evidence.state,
        new_state: evidence.state,
        reason_code: 'POLICY_BLOCK',
        reason_text: 'DELETE operation blocked - evidence is immutable',
        request_id: requestId,
        metadata: {
          operation: 'delete',
          blocked: true,
          state: evidence.state
        }
      });

      return Response.json({
        error: 'Delete operation not allowed',
        error_code: 'IMMUTABLE_EVIDENCE',
        contract: 'CONTRACT_1_IMMUTABILITY',
        rule: 'Evidence records cannot be deleted - they are immutable',
        evidence_id: evidenceId,
        state: evidence.state,
        message: 'Evidence is immutable. Use superseding instead.'
      }, { status: 409 });
    }

    // IMMUTABILITY BLOCK #2: Block updates on SEALED or later states
    if (['SEALED', 'CLASSIFIED', 'STRUCTURED', 'SUPERSEDED'].includes(evidence.state)) {
      await base44.asServiceRole.entities.EvidenceAuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: tenantId,
        event_type: 'ACCESS_DENIED',
        actor_user_id: user.id,
        actor_role: user.role,
        evidence_id: evidenceId,
        timestamp_utc: new Date().toISOString(),
        previous_state: evidence.state,
        new_state: evidence.state,
        reason_code: 'POLICY_BLOCK',
        reason_text: `UPDATE operation blocked - evidence in ${evidence.state} state is immutable`,
        request_id: requestId,
        metadata: {
          operation: 'update',
          blocked: true,
          state: evidence.state
        }
      });

      return Response.json({
        error: 'Update operation not allowed',
        error_code: 'IMMUTABLE_EVIDENCE',
        contract: 'CONTRACT_1_IMMUTABILITY',
        rule: 'Evidence in SEALED or later states cannot be modified',
        evidence_id: evidenceId,
        state: evidence.state,
        sealed_at: evidence.sealed_at_utc,
        message: 'Evidence has been cryptographically sealed and is immutable. Create new evidence with CORRECTION_SUPERSEDING intent instead.'
      }, { status: 409 });
    }

    // If we reach here, evidence is in INGESTED state (theoretically updatable)
    return Response.json({
      warning: 'Evidence in INGESTED state (theoretically mutable)',
      evidence_id: evidenceId,
      state: evidence.state,
      message: 'Evidence not yet sealed. Modifications theoretically possible but not recommended.'
    });

  } catch (error) {
    console.error('[Immutability Validation] Error:', error);
    return Response.json({
      error: 'Validation failed',
      message: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});