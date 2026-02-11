import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SEALED EVIDENCE INTEGRITY VALIDATOR
 * 
 * Run periodic checks to ensure Contract 1 invariants are maintained:
 * 1. Every SEALED evidence has both SHA-256 hashes
 * 2. Every SEALED evidence has at least 2 audit events (INGESTED, SEALED)
 * 3. Every SEALED evidence has sealed_at_utc set
 * 4. tenant_id is present and matches auth context
 * 5. No SEALED evidence has state = RAW, CLASSIFIED, or STRUCTURED (impossible, but check)
 * 
 * Returns detailed compliance report.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin only
  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin required' }, { status: 403 });
  }

  try {
    const tenantId = user.tenant_id || user.id;
    
    // Fetch all SEALED evidence
    const sealedEvidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId,
      state: 'SEALED'
    });

    const report = {
      tenant_id: tenantId,
      total_sealed_count: sealedEvidence.length,
      integrity_checks: {
        all_have_payload_hash: true,
        all_have_metadata_hash: true,
        all_have_sealed_at: true,
        all_have_audit_trail: true,
        no_forbidden_states: true
      },
      violations: [],
      compliant_records: 0,
      non_compliant_records: []
    };

    for (const evidence of sealedEvidence) {
      const checks = {
        evidence_id: evidence.evidence_id,
        has_payload_hash: !!evidence.payload_hash_sha256,
        has_metadata_hash: !!evidence.metadata_hash_sha256,
        has_sealed_at: !!evidence.sealed_at_utc,
        audit_events_count: 0,
        is_compliant: true
      };

      // Check hashes
      if (!evidence.payload_hash_sha256) {
        report.integrity_checks.all_have_payload_hash = false;
        checks.is_compliant = false;
        report.violations.push(`Evidence ${evidence.evidence_id}: Missing payload_hash_sha256`);
      }
      if (!evidence.metadata_hash_sha256) {
        report.integrity_checks.all_have_metadata_hash = false;
        checks.is_compliant = false;
        report.violations.push(`Evidence ${evidence.evidence_id}: Missing metadata_hash_sha256`);
      }
      if (!evidence.sealed_at_utc) {
        report.integrity_checks.all_have_sealed_at = false;
        checks.is_compliant = false;
        report.violations.push(`Evidence ${evidence.evidence_id}: Missing sealed_at_utc`);
      }

      // Forbidden states check
      if (['RAW', 'CLASSIFIED', 'STRUCTURED'].includes(evidence.state)) {
        report.integrity_checks.no_forbidden_states = false;
        checks.is_compliant = false;
        report.violations.push(`Evidence ${evidence.evidence_id}: Forbidden state detected: ${evidence.state}`);
      }

      // Audit trail check
      const auditEvents = await base44.asServiceRole.entities.EvidenceAuditEvent.filter({
        evidence_id: evidence.evidence_id,
        tenant_id: tenantId
      });
      checks.audit_events_count = auditEvents.length;
      if (auditEvents.length < 2) {
        report.integrity_checks.all_have_audit_trail = false;
        checks.is_compliant = false;
        report.violations.push(`Evidence ${evidence.evidence_id}: Expected ≥2 audit events, found ${auditEvents.length}`);
      }

      if (checks.is_compliant) {
        report.compliant_records++;
      } else {
        report.non_compliant_records.push(checks);
      }
    }

    // Overall compliance
    report.overall_compliance = {
      status: report.non_compliant_records.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
      compliance_percentage: sealedEvidence.length > 0 ? (report.compliant_records / sealedEvidence.length * 100).toFixed(2) : 'N/A'
    };

    return Response.json(report, { status: 200 });

  } catch (error) {
    console.error('[CONTRACT_1] Integrity validation error:', error);
    return Response.json({
      error: 'Validation failed',
      message: error.message
    }, { status: 500 });
  }
});