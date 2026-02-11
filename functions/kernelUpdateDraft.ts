import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BUILD_ID = Deno.env.get('DENO_DEPLOYMENT_ID') || `local-${Date.now()}`;
const CONTRACT_VERSION = 'contract_ingest_v1';
import { v4 as uuidv4 } from 'npm:uuid';

const METHOD_DATASET_COMPATIBILITY = {
  'MANUAL_ENTRY': ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM'],
  'FILE_UPLOAD': ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'EMISSIONS_DATA', 'TRANSACTION', 'OTHER'],
  'ERP_EXPORT': ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'TRANSACTION'],
  'ERP_API': ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'TRANSACTION'],
  'API_PUSH': ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'EMISSIONS_DATA', 'TRANSACTION', 'OTHER'],
  'SUPPLIER_PORTAL': ['EMISSIONS_DATA', 'OTHER']
};

const DATASET_SCOPE_COMPATIBILITY = {
  'SUPPLIER_MASTER': ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'SITE'],
  'PRODUCT_MASTER': ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'PRODUCT_FAMILY'],
  'BOM': ['PRODUCT_FAMILY'],
  'EMISSIONS_DATA': ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'],
  'TRANSACTION': ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY'],
  'OTHER': ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY', 'UNKNOWN']
};

Deno.serve(async (req) => {
  const correlationId = `UPDATE_DRAFT_${Date.now()}_${uuidv4().substring(0, 8)}`;
  
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
    const { draft_id, patch } = body;

    if (!draft_id) {
      return Response.json({
        error_code: 'DRAFT_ID_REQUIRED',
        message: 'draft_id required',
        correlation_id: correlationId
      }, { status: 422 });
    }

    if (!patch || Object.keys(patch).length === 0) {
      return Response.json({
        error_code: 'PATCH_REQUIRED',
        message: 'patch object with fields to update required',
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

    if (draft.status === 'SEALED') {
      return Response.json({
        error_code: 'DRAFT_SEALED',
        message: 'Cannot update sealed draft',
        correlation_id: correlationId
      }, { status: 422 });
    }

    // Merge patch with existing draft
    const updated = { ...draft, ...patch };

    // Validate compatibility if method/dataset/scope changed
    const fieldErrors = [];

    if (patch.dataset_type || patch.ingestion_method) {
      const allowedDatasets = METHOD_DATASET_COMPATIBILITY[updated.ingestion_method];
      if (!allowedDatasets || !allowedDatasets.includes(updated.dataset_type)) {
        fieldErrors.push({
          field: 'dataset_type',
          error: `${updated.dataset_type} incompatible with ${updated.ingestion_method}`,
          hint: `Allowed: ${allowedDatasets?.join(', ')}`
        });
      }
    }

    if (patch.declared_scope || patch.dataset_type) {
      const allowedScopes = DATASET_SCOPE_COMPATIBILITY[updated.dataset_type];
      if (!allowedScopes || !allowedScopes.includes(updated.declared_scope)) {
        fieldErrors.push({
          field: 'declared_scope',
          error: `${updated.declared_scope} incompatible with ${updated.dataset_type}`,
          hint: `Allowed: ${allowedScopes?.join(', ')}`
        });
      }
    }

    if (patch.declared_scope && ['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'].includes(patch.declared_scope)) {
      if (!updated.scope_target_id) {
        fieldErrors.push({
          field: 'scope_target_id',
          error: `scope_target_id required for ${patch.declared_scope}`
        });
      }
    }

    if (fieldErrors.length > 0) {
      return Response.json({
        error_code: 'VALIDATION_FAILED',
        message: 'Update validation failed',
        field_errors: fieldErrors,
        correlation_id: correlationId
      }, { status: 422 });
    }

    // Update draft
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.evidence_drafts.update(draft.id, {
      ...patch,
      updated_at_utc: now
    });

    // Log audit event
    await base44.asServiceRole.entities.audit_events.create({
      event_id: uuidv4(),
      tenant_id: user.tenant_id || 'default',
      correlation_id: correlationId,
      event_type: 'DRAFT_UPDATED',
      draft_id: draft_id,
      actor_user_id: user.id,
      server_ts_utc: now,
      details_json: { updated_fields: Object.keys(patch) }
    });

    return Response.json({
      draft_id: draft_id,
      updated_at_utc: now,
      correlation_id: correlationId
    });

  } catch (error) {
    console.error('[kernelUpdateDraft] Error:', error);
    return Response.json({
      error_code: 'INTERNAL_ERROR',
      message: error.message,
      correlation_id: correlationId
    }, { status: 500 });
  }
});