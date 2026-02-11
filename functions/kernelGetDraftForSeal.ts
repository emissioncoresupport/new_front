import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v4 as uuidv4 } from 'npm:uuid';

const BUILD_ID = Deno.env.get('DENO_DEPLOYMENT_ID') || `local-${Date.now()}`;
const CONTRACT_VERSION = 'contract_ingest_v1';

/**
 * KERNEL GET DRAFT FOR SEAL
 * Canonical endpoint for Step 3 pre-seal verification
 * Returns: draft metadata, files with SHA-256, validation status
 */

Deno.serve(async (req) => {
  const correlationId = `GET_DRAFT_SEAL_${Date.now()}_${uuidv4().substring(0, 8)}`;
  
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
        message: `Draft ${draft_id} not found in this tenant`,
        correlation_id: correlationId,
        build_id: BUILD_ID,
        contract_version: CONTRACT_VERSION
      }, { status: 404 });
    }

    const draft = drafts[0];

    // Fetch attachments (tenant-scoped)
    const files = await base44.asServiceRole.entities.draft_attachments.filter({
      draft_id: draft_id,
      tenant_id: user.tenant_id || 'default'
    });

    // Compute retention end date
    let retention_ends_utc = null;
    if (draft.retention_policy) {
      const now = new Date();
      let daysToAdd = 365; // default 1 year

      if (draft.retention_policy === 'STANDARD_1_YEAR') daysToAdd = 365;
      else if (draft.retention_policy === 'STANDARD_3_YEARS') daysToAdd = 3 * 365;
      else if (draft.retention_policy === 'STANDARD_7_YEARS') daysToAdd = 7 * 365;
      else if (draft.retention_policy === 'STANDARD_10_YEARS') daysToAdd = 10 * 365;
      else if (draft.retention_policy === 'CUSTOM' && draft.retention_custom_days) daysToAdd = draft.retention_custom_days;

      const endDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      retention_ends_utc = endDate.toISOString();
    }

    // Validation
    const validation = {
      ready_to_seal: true,
      missing_fields: []
    };

    if (!draft.why_this_evidence || draft.why_this_evidence.length < 20) {
      validation.ready_to_seal = false;
      validation.missing_fields.push({ 
        field: 'why_this_evidence', 
        error: 'Must be at least 20 characters',
        current_length: draft.why_this_evidence?.length || 0
      });
    }

    if (!draft.purpose_tags || draft.purpose_tags.length === 0) {
      validation.ready_to_seal = false;
      validation.missing_fields.push({ 
        field: 'purpose_tags', 
        error: 'At least one purpose tag required' 
      });
    }

    if (['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'].includes(draft.declared_scope) && !draft.scope_target_id) {
      validation.ready_to_seal = false;
      validation.missing_fields.push({ 
        field: 'scope_target_id', 
        error: `Required for ${draft.declared_scope}`,
        hint: 'Select a valid target entity'
      });
    }

    if (draft.declared_scope === 'UNKNOWN') {
      if (!draft.quarantine_reason) {
        validation.ready_to_seal = false;
        validation.missing_fields.push({ 
          field: 'quarantine_reason', 
          error: 'Required for UNKNOWN scope' 
        });
      }
      if (!draft.resolution_due_date) {
        validation.ready_to_seal = false;
        validation.missing_fields.push({ 
          field: 'resolution_due_date', 
          error: 'Required for UNKNOWN scope (max 90 days)' 
        });
      } else {
        // Validate 90-day limit
        const deadline = new Date(draft.resolution_due_date);
        const maxDeadline = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        if (deadline > maxDeadline) {
          validation.ready_to_seal = false;
          validation.missing_fields.push({ 
            field: 'resolution_due_date', 
            error: 'Must be within 90 days from now',
            current_value: draft.resolution_due_date
          });
        }
      }
    }

    if (draft.contains_personal_data && !draft.gdpr_legal_basis) {
      validation.ready_to_seal = false;
      validation.missing_fields.push({ 
        field: 'gdpr_legal_basis', 
        error: 'Required when contains_personal_data=true',
        hint: 'Select: CONSENT, CONTRACT, LEGAL_OBLIGATION, etc.'
      });
    }

    // Method-specific checks
    if (['FILE_UPLOAD', 'ERP_EXPORT'].includes(draft.ingestion_method)) {
      if (!files || files.length === 0) {
        validation.ready_to_seal = false;
        validation.missing_fields.push({ 
          field: 'attachments', 
          error: 'At least one file required for this method' 
        });
      } else {
        const missingHash = files.some(f => !f.sha256);
        if (missingHash) {
          validation.ready_to_seal = false;
          validation.missing_fields.push({ 
            field: 'attachments', 
            error: 'All files must have server-computed SHA-256' 
          });
        }
      }
    }

    return Response.json({
      draft_id: draft.draft_id,
      metadata: {
        ingestion_method: draft.ingestion_method,
        source_system: draft.source_system,
        dataset_type: draft.dataset_type,
        declared_scope: draft.declared_scope,
        scope_target_id: draft.scope_target_id,
        scope_target_name: draft.scope_target_name,
        why_this_evidence: draft.why_this_evidence,
        purpose_tags: draft.purpose_tags,
        retention_policy: draft.retention_policy,
        contains_personal_data: draft.contains_personal_data,
        gdpr_legal_basis: draft.gdpr_legal_basis,
        quarantine_reason: draft.quarantine_reason,
        resolution_due_date: draft.resolution_due_date
      },
      files: files.map(f => ({
        file_id: f.attachment_id,
        filename: f.filename,
        size_bytes: f.size_bytes,
        content_type: f.content_type,
        sha256: f.sha256,
        storage_ref: f.storage_ref,
        simulated: f.storage_ref?.startsWith('simulated://') || false,
        uploaded_at_utc: f.created_at_utc
      })),
      files_attached_count: files?.length || 0,
      retention_ends_utc,
      validation,
      correlation_id: correlationId,
      build_id: BUILD_ID,
      contract_version: CONTRACT_VERSION
    }, { status: 200 });

  } catch (error) {
    console.error('[kernelGetDraftForSeal] Error:', error);
    return Response.json({
      error_code: 'INTERNAL_ERROR',
      message: error.message,
      correlation_id: correlationId,
      build_id: BUILD_ID,
      contract_version: CONTRACT_VERSION
    }, { status: 500 });
  }
});