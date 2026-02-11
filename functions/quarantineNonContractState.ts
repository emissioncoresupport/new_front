import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * QUARANTINE ACTION — Fix evidence in forbidden processing_state values
 * 
 * ADMIN-ONLY FUNCTION
 * Purpose: Migrate evidence incorrectly created with RAW/CLASSIFIED/STRUCTURED processing_state
 * 
 * Action:
 * - DO NOT DELETE
 * - Set contract_state = SUPERSEDED (or REJECTED) with reason "NON_CONTRACT_STATE_MIGRATION"
 * - Write audit event QUARANTINED
 * - Preserve processing_state for forensic trace
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ADMIN-ONLY enforcement
    if (user.role !== 'admin') {
      return Response.json({
        error: 'Forbidden: Admin access required',
        error_code: 'ADMIN_ONLY'
      }, { status: 403 });
    }

    const tenantId = user.tenant_id || user.id;

    // Find all evidence in forbidden processing_state (note: NOT contract_state)
    // We're looking for evidence that was incorrectly created with processing_state as contract_state
    const allEvidence = await base44.asServiceRole.entities.Evidence.list();
    const toQuarantine = allEvidence.filter(e => 
      e.tenant_id === tenantId && 
      (e.processing_state === 'RAW' || e.processing_state === 'CLASSIFIED' || e.processing_state === 'STRUCTURED') &&
      e.contract_state !== 'SUPERSEDED' &&
      e.contract_state !== 'REJECTED'
    );

    let quarantined = 0;
    const results = [];

    for (const evidence of toQuarantine) {
      try {
        // Update to SUPERSEDED with quarantine reason
        await base44.asServiceRole.entities.Evidence.update(evidence.id, {
          contract_state: 'SUPERSEDED',
          rejection_reason: 'NON_CONTRACT_STATE_MIGRATION'
        });

        // Write audit event
        await base44.asServiceRole.entities.EvidenceAuditEvent.create({
          audit_event_id: crypto.randomUUID(),
          tenant_id: tenantId,
          evidence_id: evidence.evidence_id,
          actor_user_id: user.id,
          actor_email: user.email,
          actor_role: user.role,
          previous_state: evidence.contract_state,
          new_state: 'SUPERSEDED',
          timestamp_utc: new Date().toISOString(),
          action: 'QUARANTINED',
          request_id: requestId,
          context_json: {
            reason: 'Non-contract compliant processing_state',
            original_processing_state: evidence.processing_state,
            original_contract_state: evidence.contract_state,
            forensic_preservation: 'processing_state preserved'
          }
        });

        quarantined++;
        results.push({
          evidence_id: evidence.evidence_id,
          status: 'quarantined',
          original_processing_state: evidence.processing_state,
          new_contract_state: 'SUPERSEDED'
        });
      } catch (error) {
        console.error(`[QUARANTINE] Failed for evidence ${evidence.evidence_id}:`, error.message);
        results.push({
          evidence_id: evidence.evidence_id,
          status: 'error',
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      operation: 'quarantine_non_contract_state',
      tenant_id: tenantId,
      quarantined: quarantined,
      results: results,
      request_id: requestId,
      note: 'processing_state preserved for forensics, contract_state migrated to SUPERSEDED'
    }, { status: 200 });

  } catch (error) {
    console.error('[QUARANTINE] Operation failed:', error);
    return Response.json({
      success: false,
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});