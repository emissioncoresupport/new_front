import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Quarantine Non-Contract1 Evidence
 * 
 * Moves evidence in CLASSIFIED/STRUCTURED states to REJECTED
 * Creates audit trail for policy violation cleanup
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ 
        error: 'Forbidden: Admin access required' 
      }, { status: 403 });
    }

    const tenantId = user.tenant_id || user.id;

    // Find evidence in disallowed states (RAW, CLASSIFIED, STRUCTURED)
    // Query each state separately to ensure proper filtering
    const rawEvidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId,
      state: 'RAW'
    });

    const classifiedEvidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId,
      state: 'CLASSIFIED'
    });

    const structuredEvidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId,
      state: 'STRUCTURED'
    });

    const nonCompliant = [...rawEvidence, ...classifiedEvidence, ...structuredEvidence];

    if (nonCompliant.length === 0) {
      return Response.json({
        success: true,
        message: 'No non-compliant evidence found',
        quarantined_count: 0
      });
    }

    // Quarantine each non-compliant record
    const quarantined = [];
    const errors = [];

    for (const evidence of nonCompliant) {
      try {
        // Determine reason code based on original state
        let reasonCode, reasonText;
        if (evidence.state === 'RAW') {
          reasonCode = 'LEGACY_RAW_NOT_SEALED';
          reasonText = 'Legacy RAW state (unsealed) does not comply with Contract 1 sealing requirement';
        } else if (evidence.state === 'CLASSIFIED') {
          reasonCode = 'CONTRACT_VIOLATION_LEGACY';
          reasonText = 'Contract 1 violation: Evidence in CLASSIFIED state not allowed in Contract 1 (future Contract 2 feature)';
        } else if (evidence.state === 'STRUCTURED') {
          reasonCode = 'CONTRACT_VIOLATION_LEGACY';
          reasonText = 'Contract 1 violation: Evidence in STRUCTURED state not allowed in Contract 1 (future Contract 2 feature)';
        }

        // Update state to REJECTED
        await base44.asServiceRole.entities.Evidence.update(evidence.id, {
          state: 'REJECTED',
          rejection_reason: reasonCode
        });

        // Create audit event
        await base44.asServiceRole.entities.EvidenceAuditEvent.create({
          audit_event_id: crypto.randomUUID(),
          tenant_id: tenantId,
          evidence_id: evidence.evidence_id,
          actor_user_id: user.id,
          actor_role: user.role,
          event_type: 'EVIDENCE_REJECTED',
          previous_state: evidence.state,
          new_state: 'REJECTED',
          timestamp_utc: new Date().toISOString(),
          reason_code: reasonCode,
          reason_text: reasonText,
          request_id: crypto.randomUUID()
        });

        quarantined.push({
          evidence_id: evidence.evidence_id,
          previous_state: evidence.state,
          dataset_type: evidence.dataset_type,
          reason_code: reasonCode
        });

      } catch (error) {
        errors.push({
          evidence_id: evidence.evidence_id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Quarantined ${quarantined.length} non-compliant evidence records`,
      quarantined_count: quarantined.length,
      quarantined_records: quarantined,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[Quarantine] Error:', error);
    return Response.json({
      error: 'Quarantine operation failed',
      message: error.message
    }, { status: 500 });
  }
});