import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BUILD_ID = Deno.env.get('DENO_DEPLOYMENT_ID') || `local-${Date.now()}`;
const CONTRACT_VERSION = 'contract_ingest_v1';
import { v4 as uuidv4 } from 'npm:uuid';

Deno.serve(async (req) => {
  const correlationId = `GET_SNAPSHOT_${Date.now()}_${uuidv4().substring(0, 8)}`;
  
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

    // Fetch draft
    const drafts = await base44.asServiceRole.entities.evidence_drafts.filter({
      draft_id: draft_id,
      tenant_id: user.tenant_id || 'default'
    });

    if (!drafts || drafts.length === 0) {
      return Response.json({
        error_code: 'DRAFT_NOT_FOUND',
        message: `Draft ${draft_id} not found`,
        correlation_id: correlationId
      }, { status: 404 });
    }

    const draft = drafts[0];

    // Fetch attachments
    const attachments = await base44.asServiceRole.entities.draft_attachments.filter({
      draft_id: draft_id,
      tenant_id: user.tenant_id || 'default'
    });

    // Validation checks
    const missingFields = [];
    const fieldErrors = [];

    if (!draft.why_this_evidence || draft.why_this_evidence.length < 20) {
      missingFields.push('why_this_evidence');
      fieldErrors.push({ field: 'why_this_evidence', error: 'Must be at least 20 characters' });
    }

    if (!draft.purpose_tags || draft.purpose_tags.length === 0) {
      missingFields.push('purpose_tags');
      fieldErrors.push({ field: 'purpose_tags', error: 'At least one purpose tag required' });
    }

    if (['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'].includes(draft.declared_scope) && !draft.scope_target_id) {
      missingFields.push('scope_target_id');
      fieldErrors.push({ field: 'scope_target_id', error: 'Required for this scope' });
    }

    if (draft.declared_scope === 'UNKNOWN') {
      if (!draft.quarantine_reason) {
        missingFields.push('quarantine_reason');
        fieldErrors.push({ field: 'quarantine_reason', error: 'Required for UNKNOWN scope' });
      }
      if (!draft.resolution_due_date) {
        missingFields.push('resolution_due_date');
        fieldErrors.push({ field: 'resolution_due_date', error: 'Required for UNKNOWN scope' });
      }
    }

    if (draft.contains_personal_data && !draft.gdpr_legal_basis) {
      missingFields.push('gdpr_legal_basis');
      fieldErrors.push({ field: 'gdpr_legal_basis', error: 'Required when personal data present' });
    }

    // Method-specific attachment checks
    if (['FILE_UPLOAD', 'ERP_EXPORT'].includes(draft.ingestion_method)) {
      if (!attachments || attachments.length === 0) {
        missingFields.push('attachments');
        fieldErrors.push({ field: 'attachments', error: 'At least one file required' });
      } else {
        const missingHash = attachments.some(a => !a.sha256);
        if (missingHash) {
          fieldErrors.push({ field: 'attachments', error: 'All files must have SHA-256 hash' });
        }
      }
    }

    const canSeal = missingFields.length === 0 && fieldErrors.length === 0;

    return Response.json({
      draft: {
        draft_id: draft.draft_id,
        tenant_id: draft.tenant_id,
        status: draft.status,
        ingestion_method: draft.ingestion_method,
        source_system: draft.source_system,
        dataset_type: draft.dataset_type,
        declared_scope: draft.declared_scope,
        scope_target_id: draft.scope_target_id,
        scope_target_name: draft.scope_target_name,
        why_this_evidence: draft.why_this_evidence,
        purpose_tags: draft.purpose_tags,
        retention_policy: draft.retention_policy,
        retention_custom_days: draft.retention_custom_days,
        contains_personal_data: draft.contains_personal_data,
        gdpr_legal_basis: draft.gdpr_legal_basis,
        quarantine_reason: draft.quarantine_reason,
        resolution_due_date: draft.resolution_due_date,
        created_by_user_id: draft.created_by_user_id,
        created_at_utc: draft.created_at_utc,
        updated_at_utc: draft.updated_at_utc
      },
      attachments: attachments || [],
      can_seal: canSeal,
      missing_fields: missingFields,
      field_errors: fieldErrors,
      validation_errors: fieldErrors,
      correlation_id: correlationId,
      build_id: BUILD_ID,
      contract_version: CONTRACT_VERSION
    }, { status: 200 });

  } catch (error) {
    console.error('[kernelGetDraftSnapshot] Error:', error);
    return Response.json({
      error_code: 'INTERNAL_ERROR',
      message: error.message,
      correlation_id: correlationId
    }, { status: 500 });
  }
});