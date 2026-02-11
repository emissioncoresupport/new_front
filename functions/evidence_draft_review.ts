import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

/**
 * POST evidence_draft_review
 * Canonical endpoint for Step 3 draft state retrieval.
 * Returns server-authoritative draft with all binding + evidence metadata.
 * 
 * Input: { draft_id?, method, files?, declaration }
 * Returns: { draft_id, tenant_id, method, source_system, dataset_type, declared_scope, 
 *            scope_target, purpose_tags, retention_policy, files[], status, correlation_id }
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json(
      { error_code: 'METHOD_NOT_ALLOWED', message: 'POST required', correlation_id: uuidv4() },
      { status: 405 }
    );
  }

  const correlation_id = uuidv4();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json(
        {
          error_code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          correlation_id
        },
        { status: 401 }
      );
    }

    // Parse body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return Response.json(
        {
          error_code: 'INVALID_JSON',
          message: 'Request body must be valid JSON',
          correlation_id
        },
        { status: 422 }
      );
    }

    const { draft_id, method, files, declaration } = body;

    if (!method && !declaration?.ingestion_method) {
      return Response.json(
        {
          error_code: 'METHOD_REQUIRED',
          message: 'method or declaration.ingestion_method required',
          correlation_id
        },
        { status: 422 }
      );
    }

    if (!draft_id) {
      return Response.json(
        {
          error_code: 'DRAFT_ID_REQUIRED',
          message: 'draft_id required to fetch draft-scoped files',
          correlation_id
        },
        { status: 422 }
      );
    }

    const tenant_id = user.tenant_id || user.id; // CRITICAL: use tenant_id from auth

    // Query draft_files by draft_id (CRITICAL: draft-scoped query, not tenant-wide)
    let draftFiles = [];
    try {
      draftFiles = await base44.asServiceRole.entities.draft_files.filter({
        draft_id: draft_id,
        tenant_id: tenant_id
      });
      console.log(`[DRAFT_REVIEW] Found ${draftFiles.length} files for draft_id=${draft_id}, tenant_id=${tenant_id}`);
    } catch (err) {
      console.error('draft_files query FAILED:', err.message, err.stack);
      return Response.json({
        error_code: 'DRAFT_FILES_QUERY_FAILED',
        message: 'Failed to retrieve draft files from database',
        correlation_id
      }, { status: 500 });
    }

    // Build canonical draft state (server-authoritative)
    const draft = {
      draft_id: draft_id,
      tenant_id,
      method: method || declaration.ingestion_method,
      source_system: declaration?.source_system || 'OTHER',
      source_system_friendly_name: declaration?.erp_instance_friendly_name || null,
      dataset_type: declaration?.dataset_type || 'SUPPLIER_MASTER',
      declared_scope: declaration?.declared_scope || 'ENTIRE_ORGANIZATION',
      link_status: declaration?.declared_scope === 'UNKNOWN_UNLINKED' ? 'UNLINKED' : 'LINKED',
      
      // Scope target fields (flatten for seal compatibility)
      scope_target_id: declaration?.scope_target_id || null,
      scope_target_name: declaration?.scope_target_name || null,
      
      quarantine_reason: declaration?.unlinked_reason || null,
      resolution_due_date: declaration?.resolution_due_date || null,
      
      // Tags & policies
      purpose_tags: declaration?.purpose_tags || ['COMPLIANCE'],
      retention_policy: declaration?.retention_policy || 'STANDARD_1_YEAR',
      retention_custom_days: declaration?.retention_custom_days || null,
      contains_personal_data: declaration?.contains_personal_data || false,
      gdpr_legal_basis: declaration?.gdpr_legal_basis || null,
      why_this_evidence: declaration?.why_this_evidence || null,
      
      // CRITICAL: Files from draft_files table ONLY (draft-scoped)
      files: draftFiles.map(f => ({
        draft_file_id: f.draft_file_id,
        filename: f.filename,
        size_bytes: f.size_bytes,
        content_type: f.content_type,
        sha256_hash: f.sha256_hash,
        storage_ref: f.storage_ref,
        uploaded_at_utc: f.uploaded_at_utc
      })),
      
      // Method-specific fields
      validated_payload: declaration?.validated_payload || null,
      entry_notes: declaration?.entry_notes || null,
      external_reference_id: declaration?.external_reference_id || null,
      snapshot_datetime_utc: declaration?.snapshot_at_utc || null,
      connector_reference: declaration?.connector_reference || declaration?.api_endpoint_identifier || null,
      supplier_portal_request_id: declaration?.portal_request_id || null,
      export_job_id: declaration?.export_job_id || null,
      
      // Hashes (computed server-side in real system)
      binding_hash_sha256: declaration?.binding_hash_sha256 || 'binding_hash_placeholder',
      payload_hash_sha256: declaration?.payload_hash_sha256 || null,
      metadata_hash_sha256: declaration?.metadata_hash_sha256 || 'metadata_hash_placeholder',
      payload_bytes: declaration?.payload_bytes || null,
      
      status: 'READY_TO_SEAL',
      created_at_utc: new Date().toISOString(),
      correlation_id
    };

    return Response.json(draft, { status: 200 });
  } catch (error) {
    console.error('DRAFT_REVIEW ERROR:', error.stack);
    return Response.json(
      {
        error_code: 'INTERNAL_SERVER_ERROR',
        message: 'Draft review failed',
        correlation_id
      },
      { status: 500 }
    );
  }
});