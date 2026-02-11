import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Contract 1 State Lock - Hard enforcement
 * 
 * Prevents any transition to CLASSIFIED/STRUCTURED states
 * Only allows: INGESTED, SEALED, REJECTED, FAILED, SUPERSEDED
 * 
 * Called BEFORE any Evidence update is committed
 */

const ALLOWED_CONTRACT1_STATES = ['INGESTED', 'SEALED', 'REJECTED', 'FAILED', 'SUPERSEDED'];
const CONTRACT_VERSION = 1;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { evidence_id, proposed_state, evidence_record } = body;

    if (!evidence_id || !proposed_state) {
      return Response.json({
        error: 'Missing required fields: evidence_id, proposed_state',
        valid: false
      }, { status: 400 });
    }

    // HARD BLOCK: Non-contract states are forbidden
    if (!ALLOWED_CONTRACT1_STATES.includes(proposed_state)) {
      return Response.json({
        error: `CONTRACT_LOCK_VIOLATION: State "${proposed_state}" is not allowed under Contract ${CONTRACT_VERSION}`,
        valid: false,
        allowed_states: ALLOWED_CONTRACT1_STATES,
        contract_version: CONTRACT_VERSION
      }, { status: 409 });
    }

    // HARD BLOCK: Cannot transition TO CLASSIFIED or STRUCTURED
    if (['CLASSIFIED', 'STRUCTURED'].includes(proposed_state)) {
      return Response.json({
        error: `CONTRACT_LOCK_CONTRACT1: Transition to "${proposed_state}" rejected under Contract ${CONTRACT_VERSION}`,
        valid: false,
        allowed_states: ALLOWED_CONTRACT1_STATES,
        contract_version: CONTRACT_VERSION
      }, { status: 409 });
    }

    // Log the validation for audit trail
    const tenantId = user.tenant_id || user.id;
    await base44.asServiceRole.entities.EvidenceAuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: tenantId,
      evidence_id: evidence_id,
      actor_user_id: user.id,
      actor_role: user.role,
      event_type: 'STATE_VALIDATION_PASSED',
      previous_state: evidence_record?.state,
      new_state: proposed_state,
      timestamp_utc: new Date().toISOString(),
      reason_code: 'CONTRACT_COMPLIANCE_CHECK',
      reason_text: `State transition validated: ${evidence_record?.state} → ${proposed_state}`,
      request_id: crypto.randomUUID()
    });

    return Response.json({
      valid: true,
      message: 'State transition allowed',
      contract_version: CONTRACT_VERSION,
      allowed_states: ALLOWED_CONTRACT1_STATES
    }, { status: 200 });

  } catch (error) {
    console.error('[State Lock] Error:', error);
    return Response.json({
      error: 'State validation failed',
      message: error.message
    }, { status: 500 });
  }
});