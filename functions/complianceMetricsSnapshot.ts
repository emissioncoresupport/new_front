import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * COMPLIANCE METRICS SNAPSHOT
 * 
 * Admin function to verify tenant compliance with Contract 1 invariants:
 * - forbidden_state_count = 0
 * - audit_event_count >= sealed_count
 * - all sealed evidence has hashes + sealed_at_utc
 * 
 * Used by Developer Console to track health.
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin required' }, { status: 403 });
    }

    const tenantId = user.tenant_id || user.id;

    // Fetch all evidence
    const allEvidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId
    });

    // Count forbidden states
    const forbiddenStates = ['RAW', 'CLASSIFIED', 'STRUCTURED'];
    const forbiddenEvidence = allEvidence.filter(e => forbiddenStates.includes(e.state));

    // Count sealed evidence
    const sealedEvidence = allEvidence.filter(e => e.state === 'SEALED');

    // Fetch all audit events
    const allAuditEvents = await base44.asServiceRole.entities.EvidenceAuditEvent.filter({
      tenant_id: tenantId
    });

    // Check sealed evidence integrity
    const sealedIntegrity = {
      all_have_payload_hash: 0,
      all_have_metadata_hash: 0,
      all_have_sealed_at: 0,
      issues: []
    };

    for (const evidence of sealedEvidence) {
      if (evidence.payload_hash_sha256) sealedIntegrity.all_have_payload_hash++;
      if (evidence.metadata_hash_sha256) sealedIntegrity.all_have_metadata_hash++;
      if (evidence.sealed_at_utc) sealedIntegrity.all_have_sealed_at++;

      // Track issues
      if (!evidence.payload_hash_sha256) {
        sealedIntegrity.issues.push(`Evidence ${evidence.evidence_id}: Missing payload hash`);
      }
      if (!evidence.metadata_hash_sha256) {
        sealedIntegrity.issues.push(`Evidence ${evidence.evidence_id}: Missing metadata hash`);
      }
      if (!evidence.sealed_at_utc) {
        sealedIntegrity.issues.push(`Evidence ${evidence.evidence_id}: Missing sealed_at_utc`);
      }
    }

    // Compliance checks
    const complianceStatus = {
      forbidden_states_clean: forbiddenEvidence.length === 0,
      audit_trail_complete: allAuditEvents.length >= sealedEvidence.length,
      sealed_integrity_complete: sealedIntegrity.all_have_payload_hash === sealedEvidence.length &&
                                  sealedIntegrity.all_have_metadata_hash === sealedEvidence.length &&
                                  sealedIntegrity.all_have_sealed_at === sealedEvidence.length
    };

    const overallCompliance = Object.values(complianceStatus).every(v => v === true);

    return Response.json({
      success: true,
      request_id: requestId,
      tenant_id: tenantId,
      snapshot_timestamp_utc: new Date().toISOString(),

      // Metrics
      metrics: {
        total_evidence_count: allEvidence.length,
        sealed_count: sealedEvidence.length,
        forbidden_state_count: forbiddenEvidence.length,
        audit_event_count: allAuditEvents.length,
        other_state_count: allEvidence.length - sealedEvidence.length - forbiddenEvidence.length
      },

      // Forbidden state details
      forbidden_states: {
        count: forbiddenEvidence.length,
        states: forbiddenEvidence.map(e => ({
          evidence_id: e.evidence_id,
          state: e.state,
          dataset_type: e.dataset_type
        }))
      },

      // Audit completeness
      audit_completeness: {
        sealed_evidence_with_events: allAuditEvents.filter(ae => 
          sealedEvidence.some(se => se.evidence_id === ae.evidence_id)
        ).length,
        expected_minimum: sealedEvidence.length,
        complete: allAuditEvents.length >= sealedEvidence.length
      },

      // Sealed integrity
      sealed_integrity: {
        with_payload_hash: sealedIntegrity.all_have_payload_hash,
        with_metadata_hash: sealedIntegrity.all_have_metadata_hash,
        with_sealed_at: sealedIntegrity.all_have_sealed_at,
        total_sealed: sealedEvidence.length,
        complete: complianceStatus.sealed_integrity_complete,
        issues: sealedIntegrity.issues
      },

      // Compliance verdict
      compliance: {
        status: overallCompliance ? 'COMPLIANT' : 'NON_COMPLIANT',
        forbidden_states_clean: complianceStatus.forbidden_states_clean,
        audit_trail_complete: complianceStatus.audit_trail_complete,
        sealed_integrity_complete: complianceStatus.sealed_integrity_complete,
        action_required: !overallCompliance ? 'Run quarantine and backfill actions' : 'None'
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[COMPLIANCE_METRICS] Error:', error);
    return Response.json({
      success: false,
      error: 'Metrics snapshot failed',
      message: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});