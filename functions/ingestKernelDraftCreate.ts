import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

/**
 * POST /ingestKernelDraftCreate
 * Creates a new draft server-side with Step 1 declaration
 * Returns: { draft_id, correlation_id }
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error_code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  const correlation_id = uuidv4();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error_code: 'AUTH_REQUIRED', correlation_id }, { status: 401 });
    }

    const { declaration } = await req.json();

    if (!declaration) {
      return Response.json({ error_code: 'DECLARATION_REQUIRED', correlation_id }, { status: 422 });
    }

    const draft_id = uuidv4();
    const created_at_utc = new Date().toISOString();

    // Build draft record (Step 1 state)
    const draft = {
      draft_id,
      tenant_id: user.id, // Simplified for TEST mode
      correlation_id,
      created_by_user_id: user.id,
      created_by_email: user.email,
      created_at_utc,
      ingestion_method: declaration.ingestion_method,
      source_system: declaration.source_system,
      erp_instance_friendly_name: declaration.erp_instance_friendly_name || null,
      dataset_type: declaration.dataset_type,
      declared_scope: declaration.declared_scope,
      scope_target_id: declaration.scope_target_id || null,
      scope_target_name: declaration.scope_target_name || null,
      why_this_evidence: declaration.why_this_evidence,
      purpose_tags: declaration.purpose_tags || [],
      retention_policy: declaration.retention_policy,
      retention_custom_days: declaration.retention_custom_days || null,
      contains_personal_data: declaration.contains_personal_data || false,
      gdpr_legal_basis: declaration.gdpr_legal_basis || null,
      retention_justification: declaration.retention_justification || null,
      unlinked_reason: declaration.unlinked_reason || null,
      resolution_due_date: declaration.resolution_due_date || null,
      entry_notes: declaration.entry_notes || null,
      external_reference_id: declaration.external_reference_id || null,
      snapshot_at_utc: declaration.snapshot_at_utc || null,
      portal_request_id: declaration.portal_request_id || null,
      connector_reference: declaration.connector_reference || null,
      export_job_id: declaration.export_job_id || null,
      pii_confirmation: declaration.pii_confirmation || false
    };

    console.log(`[DRAFT_CREATE] draft_id=${draft_id}, tenant=${user.id}, method=${declaration.ingestion_method}, scope=${declaration.declared_scope}, target=${declaration.scope_target_id}`);

    // In TEST mode: store in memory or mock
    // In real system: persist to Draft entity
    // For now, return draft metadata for client to use

    return Response.json({
      draft_id,
      correlation_id,
      created_at_utc,
      tenant_id: user.id
    }, { status: 201 });

  } catch (error) {
    console.error('[DRAFT_CREATE] Error:', error.stack);
    return Response.json({
      error_code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      correlation_id
    }, { status: 500 });
  }
});