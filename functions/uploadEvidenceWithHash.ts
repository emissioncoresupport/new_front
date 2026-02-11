import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONTRACT 1 CONSOLIDATION
 * 
 * ⚠️ DEPRECATED — This function has been superseded by ingestEvidence()
 * 
 * Legacy uploadEvidenceWithHash created evidence in RAW state, which violates Contract 1.
 * All evidence MUST be sealed with cryptographic hashes (payload_hash_sha256 + metadata_hash_sha256)
 * at the moment of ingestion.
 * 
 * MIGRATION:
 * All callers should redirect to POST /api/functions/ingestEvidence with:
 * - metadata: { ingestion_method, dataset_type, source_system, declared_scope, declared_intent, intended_consumers, personal_data_present, retention_policy, retention_duration_days }
 * - file: multipart/form-data
 * - Idempotency-Key: header
 * 
 * This endpoint now ONLY logs the violation and rejects with guidance.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Log the consolidation attempt
    await base44.asServiceRole.entities.EvidenceAuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: user.tenant_id || user.id,
      evidence_id: 'SYSTEM_CONSOLIDATION',
      actor_user_id: user.id,
      actor_role: user.role,
      timestamp_utc: new Date().toISOString(),
      reason_code: 'POLICY_BLOCK',
      reason_text: 'CONTRACT_1_CONSOLIDATION: Legacy uploadEvidenceWithHash endpoint disabled. Use ingestEvidence instead.',
      event_type: 'ACCESS_DENIED',
      metadata: {
        deprecated_endpoint: 'uploadEvidenceWithHash',
        migration_path: 'POST /api/functions/ingestEvidence',
        contract_version: 'CONTRACT_1'
      }
    });

    return Response.json({
      error: 'CONTRACT_1_CONSOLIDATION',
      message: 'Legacy uploadEvidenceWithHash endpoint is deprecated and disabled',
      reason: 'All evidence MUST be sealed with cryptographic hashes at ingestion time (Contract 1)',
      migration: {
        use_instead: 'POST /api/functions/ingestEvidence',
        requires: [
          'metadata object with ingestion_method, dataset_type, source_system, declared_scope, declared_intent, intended_consumers, personal_data_present, retention_policy, retention_duration_days',
          'file: multipart form field',
          'Idempotency-Key: unique header for retry safety'
        ],
        docs: 'See Contract 1 Evidence Ingestion documentation'
      }
    }, { status: 410 }); // 410 Gone - endpoint permanently moved
  } catch (error) {
    return Response.json(
      { error: 'Consolidation logging failed: ' + error.message },
      { status: 500 }
    );
  }
});