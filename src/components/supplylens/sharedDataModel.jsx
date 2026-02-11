/**
 * Shared Data Model for Contract 2 Reconciliation
 * Single source of truth for evidence-based workflows
 */

export const createEvidenceRecord = (evidenceData) => ({
  record_id: evidenceData.evidence_id,
  evidence_type: evidenceData.dataset_type,
  ingestion_method: evidenceData.ingestion_method,
  binding: {
    target_type: evidenceData.binding_context?.target_entity_type || null,
    target_id: evidenceData.binding_context?.target_entity_id || null,
    identity_snapshot: evidenceData.binding_context?.identity_snapshot || null
  },
  statuses: {
    ledger_state: evidenceData.ledger_state,
    review_status: evidenceData.review_status || 'NOT_REVIEWED',
    verification_status: evidenceData.verification_status || 'PENDING',
    reconciliation_status: determineReconciliationStatus(evidenceData)
  },
  links: {
    extraction_job_ids: evidenceData.extraction_job_ids || [],
    mapping_session_ids: evidenceData.mapping_session_ids || [],
    decision_ids: evidenceData.decision_ids || []
  },
  metadata: {
    sealed_at: evidenceData.ingestion_timestamp_utc,
    scope: evidenceData.scope,
    provenance: evidenceData.provenance,
    canonical_payload: evidenceData.canonical_payload
  }
});

const determineReconciliationStatus = (evidence) => {
  const hasExtractions = evidence.extraction_job_ids?.length > 0;
  const hasMappings = evidence.mapping_session_ids?.length > 0;
  const hasDecisions = evidence.decision_ids?.length > 0;

  if (!hasExtractions) return 'NOT_READY';
  if (!hasMappings) return 'READY_WITH_GAPS';
  if (!hasDecisions) return 'PENDING_MATCH';
  return 'READY';
};

export const getRecordLinks = (recordId) => ({
  extractionJobs: `/Contract2ExtractionJobs?record_id=${recordId}`,
  mappingSessions: `/Contract2MappingSessions?record_id=${recordId}`,
  readiness: `/Contract2Readiness?record_id=${recordId}`,
  detail: `/EvidenceRecordDetail?id=${recordId}`
});