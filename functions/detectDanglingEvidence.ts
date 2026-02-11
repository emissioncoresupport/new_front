import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONTRACT 1 — DANGLING EVIDENCE DETECTION
 * 
 * Identifies unsealed evidence and reports it in Developer Console.
 * Called manually or via scheduled automation.
 * 
 * Returns: {
 *   total_evidence: number,
 *   sealed_count: number,
 *   unsealed_count: number,
 *   unsealed_records: [{evidence_id, state, created_at}],
 *   sealed_without_hashes: [{evidence_id, missing_hashes}]
 * }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        error: 'Admin access required',
        contract: 'CONTRACT_1_VIOLATION'
      }, { status: 403 });
    }

    const tenantId = user.tenant_id || user.id;

    // Fetch all evidence (non-FAILED)
    const allEvidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId
    });

    const validEvidence = allEvidence.filter(e => e.state !== 'FAILED');
    
    // Detect unsealed
    const unsealed = validEvidence.filter(e => e.state !== 'SEALED');
    
    // Detect sealed but missing hashes
    const sealedWithoutHashes = validEvidence.filter(e => 
      e.state === 'SEALED' && (!e.payload_hash_sha256 || !e.metadata_hash_sha256)
    );

    const report = {
      contract_1_status: 'DIAGNOSTIC',
      timestamp_utc: new Date().toISOString(),
      tenant_id: tenantId,
      total_evidence: validEvidence.length,
      sealed_count: validEvidence.filter(e => e.state === 'SEALED').length,
      unsealed_count: unsealed.length,
      seal_compliance_percent: validEvidence.length > 0 
        ? Math.round((validEvidence.filter(e => e.state === 'SEALED').length / validEvidence.length) * 100)
        : 0,
      
      unsealed_records: unsealed.map(e => ({
        evidence_id: e.evidence_id,
        state: e.state,
        ingestion_method: e.ingestion_method,
        created_at: e.ingested_at_utc || e.created_date,
        has_sealed_at: !!e.sealed_at_utc,
        has_payload_hash: !!e.payload_hash_sha256,
        has_metadata_hash: !!e.metadata_hash_sha256
      })),
      
      sealed_without_hashes: sealedWithoutHashes.map(e => ({
        evidence_id: e.evidence_id,
        missing: [
          !e.payload_hash_sha256 ? 'payload_hash_sha256' : null,
          !e.metadata_hash_sha256 ? 'metadata_hash_sha256' : null
        ].filter(Boolean)
      })),
      
      contract_1_violations: unsealed.length + sealedWithoutHashes.length
    };

    // Log to Developer Console as diagnostic finding
    if (report.contract_1_violations > 0) {
      await base44.asServiceRole.entities.EvidenceAuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: tenantId,
        evidence_id: 'SYSTEM_DIAGNOSTIC',
        actor_user_id: user.id,
        actor_role: user.role,
        timestamp_utc: new Date().toISOString(),
        reason_code: 'POLICY_BLOCK',
        reason_text: `CONTRACT_1 VIOLATION: ${report.contract_1_violations} unsealed or incomplete evidence records detected`,
        event_type: 'ACCESS_DENIED',
        metadata: {
          unsealed_count: report.unsealed_count,
          incomplete_sealed: report.sealed_without_hashes.length,
          compliance_percent: report.seal_compliance_percent
        }
      });
    }

    return Response.json(report, { status: 200 });

  } catch (error) {
    console.error('[CONTRACT_1_DIAGNOSTIC] Detection failed:', error);
    return Response.json({
      error: 'Diagnostic failed',
      message: error.message
    }, { status: 500 });
  }
});