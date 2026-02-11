import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateStateTransition, SUPPLYLENS_CONTRACT_VERSION } from './utils/contractGuards.js';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

/**
 * CONTRACT 1 — STATE MACHINE ENFORCER
 * 
 * Enforces allowed state transitions:
 * INGESTED → SEALED
 * SEALED → CLASSIFIED
 * CLASSIFIED → STRUCTURED
 * ANY → REJECTED
 * STRUCTURED → SUPERSEDED
 * 
 * NO BACKWARD TRANSITIONS ALLOWED
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ 
        error: 'Unauthorized',
        contract: 'CONTRACT_1_VIOLATION'
      }, { status: 401 });
    }

    const { evidence_id, new_state, reason, metadata } = await req.json();

    if (!evidence_id || !new_state) {
      return Response.json({
        error: 'evidence_id and new_state required',
        contract: 'CONTRACT_1_VIOLATION'
      }, { status: 400 });
    }

    // Fetch current evidence
    const evidence = await base44.asServiceRole.entities.Evidence.filter({ 
      evidence_id: evidence_id 
    });

    if (!evidence || evidence.length === 0) {
      return Response.json({
        error: 'Evidence not found',
        contract: 'CONTRACT_1_VIOLATION'
      }, { status: 404 });
    }

    const currentEvidence = evidence[0];
    const currentState = currentEvidence.state;

    // Tenant isolation check
    const tenantId = user.tenant_id || user.id;
    if (currentEvidence.tenant_id !== tenantId) {
      return Response.json({
        error: 'Cross-tenant access forbidden',
        contract: 'CONTRACT_1_VIOLATION',
        rule: 'Evidence cannot be accessed across tenants'
      }, { status: 403 });
    }

    // CONTRACT 1 STATE LOCK - Block CLASSIFIED/STRUCTURED
    const stateValidation = validateStateTransition(new_state);
    if (!stateValidation.allowed) {
      return Response.json({
        error: 'State transition blocked by contract lock',
        ...stateValidation.error
      }, { status: 409 });
    }

    // State transition validation (Contract 1 only)
    const allowedTransitions = {
      'INGESTED': ['SEALED', 'FAILED', 'REJECTED'],
      'SEALED': ['REJECTED'], // CLASSIFIED removed - Contract 2 only
      'FAILED': ['REJECTED'],
      'REJECTED': [], // Terminal state
      'SUPERSEDED': [] // Terminal state
    };

    if (!allowedTransitions[currentState]) {
      return Response.json({
        error: 'Invalid current state',
        contract: 'CONTRACT_1_VIOLATION',
        current_state: currentState
      }, { status: 400 });
    }

    if (!allowedTransitions[currentState].includes(new_state)) {
      return Response.json({
        error: 'Forbidden state transition',
        contract: 'CONTRACT_1_VIOLATION',
        rule: `Cannot transition from ${currentState} to ${new_state}`,
        allowed_transitions: allowedTransitions[currentState],
        current_state: currentState,
        requested_state: new_state
      }, { status: 400 });
    }

    // Special validation for REJECTED state
    if (new_state === 'REJECTED' && !reason) {
      return Response.json({
        error: 'Rejection reason required',
        contract: 'CONTRACT_1_VIOLATION',
        rule: 'REJECTED state requires explicit reason'
      }, { status: 400 });
    }

    // Update evidence state
    const updateData = {
      state: new_state
    };

    if (new_state === 'REJECTED') {
      updateData.rejection_reason = reason;
    }

    if (new_state === 'SUPERSEDED' && metadata?.superseded_by_evidence_id) {
      updateData.superseded_by_evidence_id = metadata.superseded_by_evidence_id;
    }

    await base44.asServiceRole.entities.Evidence.update(
      currentEvidence.id,
      updateData
    );

    // Create state transition audit event
    await base44.asServiceRole.entities.EvidenceAuditEvent.create({
      audit_id: crypto.randomUUID(),
      tenant_id: tenantId,
      event_type: 'STATE_TRANSITION',
      actor_id: user.id,
      actor_email: user.email,
      evidence_id: evidence_id,
      timestamp_utc: new Date().toISOString(),
      request_id: requestId,
      old_state: currentState,
      new_state: new_state,
      hash_sha256: currentEvidence.hash_sha256,
      metadata: {
        reason: reason || null,
        ...metadata
      }
    });

    return Response.json({
      success: true,
      contract: 'CONTRACT_1_ENFORCED',
      evidence_id: evidence_id,
      transition: `${currentState} → ${new_state}`,
      timestamp: new Date().toISOString(),
      request_id: requestId
    });

  } catch (error) {
    console.error('State transition failed:', error);
    
    return Response.json({
      error: 'State transition failed',
      contract: 'CONTRACT_1_FAILURE',
      message: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});