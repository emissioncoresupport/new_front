import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateStateTransition, SUPPLYLENS_CONTRACT_VERSION } from './utils/contractGuards.js';

/**
 * POST /supplylens/evidence/:id/classify
 * 
 * CLASSIFICATION GUARDRAIL - CONTRACT 1 ENFORCEMENT
 * 
 * This endpoint demonstrates the classification guardrail:
 * - MUST reject unless evidence.state = SEALED
 * - Enforces that classification cannot happen on unsealed evidence
 * - Part of Contract 1 guarantees
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

    // CLASSIFICATION GUARDRAIL - HARD BLOCK
    if (evidence.state !== 'SEALED') {
      // Log failed classification attempt
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
        reason_text: `Classification attempted on evidence in ${evidence.state} state. Must be SEALED.`,
        request_id: requestId,
        metadata: {
          classification_blocked: true,
          current_state: evidence.state,
          required_state: 'SEALED'
        }
      });

      return Response.json({
        error: 'Classification not allowed',
        contract: 'CONTRACT_1_VIOLATION',
        rule: 'Evidence must be in SEALED state before classification',
        current_state: evidence.state,
        required_state: 'SEALED',
        message: 'Evidence has not been cryptographically sealed yet. Classification is blocked.'
      }, { status: 403 });
    }

    // CONTRACT 1 STATE LOCK - Block CLASSIFIED transition
    const stateValidation = validateStateTransition('CLASSIFIED');
    if (!stateValidation.allowed) {
      await base44.asServiceRole.entities.EvidenceAuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: tenantId,
        event_type: 'ACCESS_DENIED',
        actor_user_id: user.id,
        actor_role: user.role,
        evidence_id: evidenceId,
        timestamp_utc: new Date().toISOString(),
        previous_state: 'SEALED',
        new_state: 'SEALED',
        reason_code: 'POLICY_BLOCK',
        reason_text: 'Classification blocked - Contract 1 does not support CLASSIFIED state',
        request_id: requestId,
        metadata: {
          contract_version: SUPPLYLENS_CONTRACT_VERSION,
          attempted_state: 'CLASSIFIED'
        }
      });

      return Response.json({
        error: 'Classification not available',
        ...stateValidation.error
      }, { status: 409 });
    }

    // PLACEHOLDER: Classification logic would go here (Contract 2)
    // For now, just demonstrate the guardrail is enforced

    // Log successful classification gate pass
    await base44.asServiceRole.entities.EvidenceAuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: tenantId,
      event_type: 'STATE_TRANSITION',
      actor_user_id: user.id,
      actor_role: user.role,
      evidence_id: evidenceId,
      timestamp_utc: new Date().toISOString(),
      previous_state: 'SEALED',
      new_state: 'CLASSIFIED',
      reason_code: 'CLASSIFICATION_ATTEMPT',
      reason_text: 'Classification guardrail passed - evidence is SEALED',
      request_id: requestId,
      metadata: {
        classification_allowed: true,
        state: 'SEALED'
      }
    });

    return Response.json({
      success: true,
      message: 'Classification guardrail passed - evidence is SEALED and ready for classification',
      evidence_id: evidenceId,
      state: evidence.state,
      contract: 'CONTRACT_1_GUARDRAIL_PASSED',
      note: 'Actual classification logic would be implemented in Contract 2'
    });

  } catch (error) {
    console.error('[Classification Guardrail] Error:', error);
    return Response.json({
      error: 'Classification failed',
      message: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});