import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BUILD_ID = Deno.env.get('DENO_DEPLOYMENT_ID') || `local-${Date.now()}`;
const CONTRACT_VERSION = 'contract_ingest_v1';
import { v4 as uuidv4 } from 'npm:uuid';

// Validation matrices
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
  const correlationId = `CREATE_DRAFT_${Date.now()}_${uuidv4().substring(0, 8)}`;
  
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
    const { declaration } = body;

    if (!declaration) {
      return Response.json({
        error_code: 'DECLARATION_REQUIRED',
        message: 'declaration object required',
        correlation_id: correlationId
      }, { status: 422 });
    }

    // Validate required fields
    const required = ['ingestion_method', 'source_system', 'dataset_type', 'declared_scope', 'why_this_evidence', 'purpose_tags', 'retention_policy'];
    const fieldErrors = [];

    for (const field of required) {
      if (!declaration[field] || (Array.isArray(declaration[field]) && declaration[field].length === 0)) {
        fieldErrors.push({ field, error: `${field} is required` });
      }
    }
    
    // Validate why_this_evidence length and no placeholders
    if (declaration.why_this_evidence) {
      if (declaration.why_this_evidence.length < 20) {
        fieldErrors.push({ 
          field: 'why_this_evidence', 
          error: `Must be at least 20 characters (current: ${declaration.why_this_evidence.length})` 
        });
      }
      const placeholders = ['test', 'asdf', 'placeholder', 'todo', 'xxx'];
      const lower = declaration.why_this_evidence.toLowerCase();
      if (placeholders.some(p => lower === p || lower.startsWith(p + ' '))) {
        fieldErrors.push({ 
          field: 'why_this_evidence', 
          error: 'No placeholder text allowed - provide real reasoning' 
        });
      }
    }

    // Validate method-dataset compatibility
    const allowedDatasets = METHOD_DATASET_COMPATIBILITY[declaration.ingestion_method];
    if (!allowedDatasets || !allowedDatasets.includes(declaration.dataset_type)) {
      fieldErrors.push({
        field: 'dataset_type',
        error: `${declaration.dataset_type} incompatible with ${declaration.ingestion_method}`,
        hint: `Allowed: ${allowedDatasets?.join(', ')}`
      });
    }

    // Validate dataset-scope compatibility
    const allowedScopes = DATASET_SCOPE_COMPATIBILITY[declaration.dataset_type];
    if (!allowedScopes || !allowedScopes.includes(declaration.declared_scope)) {
      fieldErrors.push({
        field: 'declared_scope',
        error: `${declaration.declared_scope} incompatible with ${declaration.dataset_type}`,
        hint: `Allowed: ${allowedScopes?.join(', ')}`
      });
    }

    // Validate scope target requirements
    if (['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'].includes(declaration.declared_scope)) {
      if (!declaration.scope_target_id) {
        fieldErrors.push({
          field: 'scope_target_id',
          error: `scope_target_id required for ${declaration.declared_scope}`,
          hint: 'Select a valid target entity'
        });
      }
    }

    // Validate UNKNOWN scope requirements
    if (declaration.declared_scope === 'UNKNOWN') {
      if (!declaration.quarantine_reason) {
        fieldErrors.push({ field: 'quarantine_reason', error: 'Required for UNKNOWN scope' });
      }
      if (!declaration.resolution_due_date) {
        fieldErrors.push({ field: 'resolution_due_date', error: 'Required for UNKNOWN scope' });
      }
    }

    // Validate personal data
    if (declaration.contains_personal_data && !declaration.gdpr_legal_basis) {
      fieldErrors.push({ field: 'gdpr_legal_basis', error: 'Required when contains_personal_data=true' });
    }

    if (fieldErrors.length > 0) {
      return Response.json({
        error_code: 'VALIDATION_FAILED',
        message: 'Draft validation failed',
        field_errors: fieldErrors,
        correlation_id: correlationId
      }, { status: 422 });
    }

    // Create draft
    const draftId = uuidv4();
    const now = new Date().toISOString();

    const draft = await base44.asServiceRole.entities.evidence_drafts.create({
      draft_id: draftId,
      tenant_id: user.tenant_id || 'default',
      status: 'DRAFT',
      ingestion_method: declaration.ingestion_method,
      source_system: declaration.source_system,
      dataset_type: declaration.dataset_type,
      declared_scope: declaration.declared_scope,
      scope_target_id: declaration.scope_target_id || null,
      scope_target_name: declaration.scope_target_name || null,
      why_this_evidence: declaration.why_this_evidence,
      purpose_tags: declaration.purpose_tags,
      retention_policy: declaration.retention_policy,
      retention_custom_days: declaration.retention_custom_days || null,
      contains_personal_data: declaration.contains_personal_data || false,
      gdpr_legal_basis: declaration.gdpr_legal_basis || null,
      quarantine_reason: declaration.quarantine_reason || null,
      resolution_due_date: declaration.resolution_due_date || null,
      created_by_user_id: user.id,
      created_at_utc: now,
      updated_at_utc: now
    });

    // Log audit event
    await base44.asServiceRole.entities.audit_events.create({
      event_id: uuidv4(),
      tenant_id: user.tenant_id || 'default',
      correlation_id: correlationId,
      event_type: 'DRAFT_CREATED',
      draft_id: draftId,
      actor_user_id: user.id,
      server_ts_utc: now,
      details_json: { method: declaration.ingestion_method, dataset: declaration.dataset_type }
    });

    return Response.json({
      draft_id: draftId,
      status: 'DRAFT',
      correlation_id: correlationId,
      build_id: BUILD_ID,
      contract_version: CONTRACT_VERSION
    }, { status: 201 });

  } catch (error) {
    console.error('[kernelCreateDraft] Error:', error);
    return Response.json({
      error_code: 'INTERNAL_ERROR',
      message: error.message,
      correlation_id: correlationId
    }, { status: 500 });
  }
});