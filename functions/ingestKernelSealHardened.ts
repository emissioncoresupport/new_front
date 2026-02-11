import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v4 as uuidv4 } from 'npm:uuid';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

const BUILD_ID = Deno.env.get('DENO_DEPLOYMENT_ID') || `local-${Date.now()}`;
const CONTRACT_VERSION = 'contract_ingest_v1';

/**
 * KERNEL SEAL HARDENED
 * Server-authoritative sealing with deterministic hashing
 * Returns: evidence_id, ledger_state, hashes, retention_ends_utc
 */

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
  const correlationId = `SEAL_HARDENED_${Date.now()}_${uuidv4().substring(0, 8)}`;
  
  try {
    if (req.method !== 'POST') {
      return Response.json({
        error_code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST allowed',
        correlation_id: correlationId,
        build_id: BUILD_ID,
        contract_version: CONTRACT_VERSION
      }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({
        error_code: 'UNAUTHORIZED',
        message: 'Authentication required',
        correlation_id: correlationId,
        build_id: BUILD_ID,
        contract_version: CONTRACT_VERSION
      }, { status: 401 });
    }

    const body = await req.json();
    const { draft_id } = body;

    if (!draft_id) {
      return Response.json({
        error_code: 'DRAFT_ID_REQUIRED',
        message: 'draft_id required',
        field_errors: [{ field: 'draft_id', error: 'Required' }],
        correlation_id: correlationId,
        build_id: BUILD_ID,
        contract_version: CONTRACT_VERSION
      }, { status: 422 });
    }

    // Tenant-scoped draft fetch
    const drafts = await base44.asServiceRole.entities.evidence_drafts.filter({
      draft_id: draft_id,
      tenant_id: user.tenant_id || 'default'
    });

    if (!drafts || drafts.length === 0) {
      return Response.json({
        error_code: 'DRAFT_NOT_FOUND',
        message: `Draft ${draft_id} not found in tenant ${user.tenant_id || 'default'}`,
        correlation_id: correlationId,
        build_id: BUILD_ID,
        contract_version: CONTRACT_VERSION
      }, { status: 404 });
    }

    const draft = drafts[0];

    // Immutability check
    if (draft.status === 'SEALED' || draft.status === 'QUARANTINED') {
      return Response.json({
        error_code: 'DRAFT_ALREADY_SEALED',
        message: 'Draft already sealed - cannot seal again (immutability enforced)',
        correlation_id: correlationId,
        build_id: BUILD_ID,
        contract_version: CONTRACT_VERSION
      }, { status: 409 });
    }

    // Fetch attachments
    const attachments = await base44.asServiceRole.entities.draft_attachments.filter({
      draft_id: draft_id,
      tenant_id: user.tenant_id || 'default'
    });

    // Validation
    const validationErrors = [];

    if (!draft.why_this_evidence || draft.why_this_evidence.length < 20) {
      validationErrors.push({ 
        field: 'why_this_evidence', 
        error: `Must be at least 20 characters (current: ${draft.why_this_evidence?.length || 0})` 
      });
    }

    if (!draft.purpose_tags || draft.purpose_tags.length === 0) {
      validationErrors.push({ field: 'purpose_tags', error: 'At least one purpose tag required' });
    }

    if (['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'].includes(draft.declared_scope) && !draft.scope_target_id) {
      validationErrors.push({ 
        field: 'scope_target_id', 
        error: `Required for ${draft.declared_scope}`,
        hint: 'Select a valid target entity'
      });
    }

    if (draft.declared_scope === 'UNKNOWN') {
      if (!draft.quarantine_reason) {
        validationErrors.push({ field: 'quarantine_reason', error: 'Required for UNKNOWN scope' });
      }
      if (!draft.resolution_due_date) {
        validationErrors.push({ field: 'resolution_due_date', error: 'Required for UNKNOWN scope' });
      } else {
        const deadline = new Date(draft.resolution_due_date);
        const maxDeadline = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        if (deadline > maxDeadline) {
          validationErrors.push({ 
            field: 'resolution_due_date', 
            error: 'Must be within 90 days',
            current_value: draft.resolution_due_date,
            max_value: maxDeadline.toISOString()
          });
        }
      }
    }

    if (draft.contains_personal_data && !draft.gdpr_legal_basis) {
      validationErrors.push({ 
        field: 'gdpr_legal_basis', 
        error: 'Required when contains_personal_data=true',
        hint: 'Select: CONSENT, CONTRACT, LEGAL_OBLIGATION, VITAL_INTERESTS, PUBLIC_TASK, LEGITIMATE_INTERESTS'
      });
    }

    // Method-specific checks
    if (['FILE_UPLOAD', 'ERP_EXPORT'].includes(draft.ingestion_method)) {
      if (!attachments || attachments.length === 0) {
        validationErrors.push({ 
          field: 'attachments', 
          error: `At least one file required for ${draft.ingestion_method}` 
        });
      } else {
        const missingHash = attachments.some(a => !a.sha256);
        if (missingHash) {
          validationErrors.push({ 
            field: 'attachments', 
            error: 'All files must have server-computed SHA-256 hash' 
          });
        }
      }
    }

    if (validationErrors.length > 0) {
      return Response.json({
        error_code: 'VALIDATION_FAILED',
        message: 'Draft not ready to seal',
        field_errors: validationErrors,
        correlation_id: correlationId,
        build_id: BUILD_ID,
        contract_version: CONTRACT_VERSION
      }, { status: 422 });
    }

    // Compute payload hash (first attachment or null for MANUAL_ENTRY)
    const payloadHash = attachments && attachments.length > 0 ? attachments[0].sha256 : null;

    // Compute metadata hash (deterministic)
    const metadata = {
      ingestion_method: draft.ingestion_method,
      source_system: draft.source_system,
      dataset_type: draft.dataset_type,
      declared_scope: draft.declared_scope,
      scope_target_id: draft.scope_target_id || null,
      why_this_evidence: draft.why_this_evidence,
      purpose_tags: draft.purpose_tags,
      retention_policy: draft.retention_policy,
      contains_personal_data: draft.contains_personal_data
    };
    const metadataHash = await computeStringHash(canonicalJSON(metadata));

    // Compute retention end date (deterministic)
    const retentionDays = {
      'STANDARD_1_YEAR': 365,
      'STANDARD_3_YEARS': 1095,
      'STANDARD_7_YEARS': 2555,
      'STANDARD_10_YEARS': 3650,
      'CUSTOM': draft.retention_custom_days || 365
    }[draft.retention_policy] || 365;

    const now = new Date();
    const retentionEnd = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

    // Determine trust level
    const trustLevel = draft.ingestion_method === 'MANUAL_ENTRY' ? 'LOW' :
                       ['FILE_UPLOAD', 'ERP_EXPORT'].includes(draft.ingestion_method) ? 'MEDIUM' : 'HIGH';

    // Determine ledger state
    const ledgerState = draft.declared_scope === 'UNKNOWN' ? 'QUARANTINED' : 'SEALED';

    // Create sealed evidence record
    const evidenceId = uuidv4();
    const sealedAt = now.toISOString();

    const sealed = await base44.asServiceRole.entities.sealed_evidence.create({
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

    // Update draft status (SEALED or QUARANTINED)
    await base44.asServiceRole.entities.evidence_drafts.update(draft.id, {
      status: ledgerState,
      updated_at_utc: sealedAt
    });

    // Audit log
    await base44.asServiceRole.entities.audit_events.create({
      event_id: uuidv4(),
      tenant_id: draft.tenant_id,
      correlation_id: correlationId,
      event_type: 'DRAFT_SEALED',
      draft_id: draft_id,
      evidence_id: evidenceId,
      actor_user_id: user.id,
      server_ts_utc: sealedAt,
      details_json: { 
        ledger_state: ledgerState, 
        trust_level: trustLevel,
        payload_hash: payloadHash,
        metadata_hash: metadataHash,
        build_id: BUILD_ID,
        contract_version: CONTRACT_VERSION
      }
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
    console.error('[ingestKernelSealHardened] Error:', error);
    return Response.json({
      error_code: 'INTERNAL_ERROR',
      message: error.message,
      correlation_id: correlationId,
      build_id: BUILD_ID,
      contract_version: CONTRACT_VERSION
    }, { status: 500 });
  }
});