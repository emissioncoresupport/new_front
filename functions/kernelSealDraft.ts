import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BUILD_ID = Deno.env.get('DENO_DEPLOYMENT_ID') || `local-${Date.now()}`;
const CONTRACT_VERSION = 'contract_ingest_v1';
import { v4 as uuidv4 } from 'npm:uuid';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

function canonicalJSON(obj) {
  const sortedKeys = Object.keys(obj).sort();
  const sorted = {};
  for (const key of sortedKeys) {
    sorted[key] = obj[key];
  }
  return JSON.stringify(sorted);
}

async function computeStringHash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const correlationId = `SEAL_${Date.now()}_${uuidv4().substring(0, 8)}`;
  
  try {
    if (req.method !== 'POST') {
      return Response.json({
        error_code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST allowed',
        correlation_id: correlationId
      }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({
        error_code: 'UNAUTHORIZED',
        message: 'Authentication required',
        correlation_id: correlationId
      }, { status: 401 });
    }

    const body = await req.json();
    const { draft_id } = body;

    if (!draft_id) {
      return Response.json({
        error_code: 'DRAFT_ID_REQUIRED',
        message: 'draft_id required',
        correlation_id: correlationId
      }, { status: 422 });
    }

    // Fetch draft snapshot
    const snapshotRes = await base44.functions.invoke('kernelGetDraftSnapshot', { draft_id });
    const snapshot = snapshotRes.data;

    if (snapshot.error_code) {
      return Response.json(snapshot, { status: 404 });
    }

    if (!snapshot.can_seal) {
      return Response.json({
        error_code: 'DRAFT_NOT_READY_TO_SEAL',
        message: 'Draft validation failed',
        field_errors: snapshot.field_errors,
        missing_fields: snapshot.missing_fields,
        correlation_id: correlationId
      }, { status: 422 });
    }

    const draft = snapshot.draft;
    const attachments = snapshot.attachments;

    // Compute payload hash (use first attachment hash for now)
    const payloadHash = attachments.length > 0 ? attachments[0].sha256 : null;

    // Compute metadata hash
    const metadata = {
      ingestion_method: draft.ingestion_method,
      source_system: draft.source_system,
      dataset_type: draft.dataset_type,
      declared_scope: draft.declared_scope,
      scope_target_id: draft.scope_target_id,
      why_this_evidence: draft.why_this_evidence,
      purpose_tags: draft.purpose_tags,
      retention_policy: draft.retention_policy,
      contains_personal_data: draft.contains_personal_data
    };
    const metadataHash = await computeStringHash(canonicalJSON(metadata));

    // Compute retention end date
    const retentionDays = {
      'STANDARD_1_YEAR': 365,
      'STANDARD_7_YEARS': 2555,
      'CONTRACTUAL': 2555, // 7 years
      'REGULATORY': 3650,  // 10 years
      'CUSTOM': draft.retention_custom_days || 365
    }[draft.retention_policy] || 365;

    const now = new Date();
    const retentionEnd = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

    // Determine trust level
    const trustLevel = draft.ingestion_method === 'MANUAL_ENTRY' ? 'LOW' :
                      ['FILE_UPLOAD', 'ERP_EXPORT'].includes(draft.ingestion_method) ? 'MEDIUM' : 'HIGH';

    // Determine ledger state
    const ledgerState = draft.declared_scope === 'UNKNOWN' ? 'QUARANTINED' : 'SEALED';

    // Create sealed evidence
    const evidenceId = uuidv4();
    const sealedAt = now.toISOString();

    await base44.asServiceRole.entities.sealed_evidence.create({
      evidence_id: evidenceId,
      draft_id: draft_id,
      tenant_id: draft.tenant_id,
      ledger_state: ledgerState,
      payload_hash_sha256: payloadHash,
      metadata_hash_sha256: metadataHash,
      sealed_at_utc: sealedAt,
      retention_ends_utc: retentionEnd.toISOString(),
      trust_level: trustLevel,
      review_status: 'PENDING_REVIEW',
      sealed_by_user_id: user.id
    });

    // Update draft status
    await base44.asServiceRole.entities.evidence_drafts.update(draft.id, {
      status: ledgerState,
      updated_at_utc: sealedAt
    });

    // Log audit event
    await base44.asServiceRole.entities.audit_events.create({
      event_id: uuidv4(),
      tenant_id: draft.tenant_id,
      correlation_id: correlationId,
      event_type: 'DRAFT_SEALED',
      draft_id: draft_id,
      evidence_id: evidenceId,
      actor_user_id: user.id,
      server_ts_utc: sealedAt,
      details_json: { ledger_state: ledgerState, trust_level: trustLevel }
    });

    return Response.json({
      evidence_id: evidenceId,
      ledger_state: ledgerState,
      payload_hash_sha256: payloadHash,
      metadata_hash_sha256: metadataHash,
      sealed_at_utc: sealedAt,
      retention_ends_utc: retentionEnd.toISOString(),
      trust_level: trustLevel,
      review_status: 'PENDING_REVIEW',
      quarantine_reason: ledgerState === 'QUARANTINED' ? draft.quarantine_reason : null,
      correlation_id: correlationId,
      build_id: BUILD_ID,
      contract_version: CONTRACT_VERSION
    }, { status: 201 });

  } catch (error) {
    console.error('[kernelSealDraft] Error:', error);
    
    // Classify error type for proper HTTP status (never 500 for user-correctable issues)
    const is422 = error.message?.includes('validation') || 
                  error.message?.includes('required') || 
                  error.message?.includes('missing') ||
                  error.message?.includes('invalid') ||
                  error.message?.includes('not found') ||
                  error.message?.toLowerCase().includes('cannot');
    const is409 = error.message?.includes('already sealed') || 
                  error.message?.includes('immutable') ||
                  error.message?.includes('conflict');
    const is403 = error.message?.includes('permission') || 
                  error.message?.includes('forbidden') ||
                  error.message?.includes('tenant') ||
                  error.message?.includes('unauthorized');
    
    const statusCode = is422 ? 422 : is409 ? 409 : is403 ? 403 : 500;
    const errorCode = is422 ? 'VALIDATION_ERROR' : 
                      is409 ? 'IMMUTABLE_CONFLICT' : 
                      is403 ? 'FORBIDDEN' : 
                      'SEALING_NOT_AVAILABLE';
    
    return Response.json({
      error_code: errorCode,
      message: statusCode === 500 
        ? 'Sealing not available in this environment. Contact support or use UI Validation Mode to preview.'
        : error.message,
      field_errors: is422 ? [{ field: 'draft', error: error.message }] : [],
      correlation_id: correlationId,
      build_id: BUILD_ID,
      contract_version: CONTRACT_VERSION
    }, { status: statusCode });
  }
});